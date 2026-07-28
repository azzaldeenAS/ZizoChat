const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');

function formatTime(date) {
  const d = new Date(date);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'م' : 'ص';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2,'0')} ${ampm}`;
}

module.exports = function setupSocket(server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET','POST'] },
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // userId → Set of socketIds (multi-tab support)
  const userSockets = new Map();

  function getUserSocketId(userId) {
    const sids = userSockets.get(userId.toString());
    return sids ? [...sids][0] : null;
  }

  io.on('connection', async (socket) => {
    const userId = socket.user.id;

    // Track socket
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    await User.findByIdAndUpdate(userId, { isOnline: true });
    io.emit('user:status', { userId, isOnline: true });

    // Join all chat rooms
    const chats = await Chat.find({ members: userId });
    chats.forEach(c => socket.join(c._id.toString()));

    // ─── Messaging ───────────────────────────────────────────────────────────
    socket.on('message:send', async (data) => {
      try {
        const { chatId, type, text, replyToId, voice, image, poll } = data;
        const now = new Date();
        const msg = await Message.create({
          chatId, senderId: userId, type, text, replyToId, voice, image, poll,
          timestamp: now, status: 'sent', reactions: [],
        });

        const populated = await Message.findById(msg._id)
          .populate('senderId', 'name avatar').lean();

        const out = {
          id: populated._id.toString(),
          chatId: populated.chatId.toString(),
          senderId: populated.senderId._id.toString(),
          senderName: populated.senderId.name,
          senderAvatar: populated.senderId.avatar,
          type: populated.type,
          text: populated.text,
          replyToId: populated.replyToId?.toString(),
          voice: populated.voice,
          image: populated.image,
          poll: populated.poll ? {
            question: populated.poll.question,
            options: populated.poll.options.map(o => ({ id: o.id, text: o.text, votes: o.votes.map(v => v.toString()) })),
          } : undefined,
          reactions: [],
          status: 'sent',
          timestamp: populated.timestamp,
          time: formatTime(populated.timestamp),
        };

        io.to(chatId).emit('message:new', out);

        // Mark delivered after 1s
        setTimeout(async () => {
          await Message.findByIdAndUpdate(msg._id, { status: 'delivered' });
          io.to(chatId).emit('message:status', { messageId: out.id, status: 'delivered' });
        }, 1000);

      } catch (err) { socket.emit('error', { message: err.message }); }
    });

    socket.on('message:reaction', async ({ messageId, emoji }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) return;
        const idx = msg.reactions.findIndex(r => r.by.toString() === userId);
        if (idx >= 0 && msg.reactions[idx].emoji === emoji) {
          msg.reactions.splice(idx, 1);
        } else if (idx >= 0) {
          msg.reactions[idx].emoji = emoji;
        } else {
          msg.reactions.push({ emoji, by: userId });
        }
        await msg.save();
        io.to(msg.chatId.toString()).emit('message:updated', {
          messageId,
          reactions: msg.reactions.map(r => ({ emoji: r.emoji, by: r.by.toString() })),
        });
      } catch (err) { socket.emit('error', { message: err.message }); }
    });

    socket.on('message:delete', async ({ messageId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg || msg.senderId.toString() !== userId) return;
        const chatId = msg.chatId.toString();
        await msg.deleteOne();
        io.to(chatId).emit('message:deleted', { messageId });
      } catch (err) { socket.emit('error', { message: err.message }); }
    });

    socket.on('poll:vote', async ({ messageId, optionId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg?.poll) return;
        msg.poll.options = msg.poll.options.map(opt => ({
          ...opt,
          votes: opt.id === optionId
            ? (opt.votes.includes(userId) ? opt.votes.filter(v => v.toString() !== userId) : [...opt.votes, userId])
            : opt.votes.filter(v => v.toString() !== userId),
        }));
        await msg.save();
        io.to(msg.chatId.toString()).emit('poll:updated', {
          messageId,
          options: msg.poll.options.map(o => ({ id: o.id, text: o.text, votes: o.votes.map(v => v.toString()) })),
        });
      } catch (err) { socket.emit('error', { message: err.message }); }
    });

    // ─── Typing ──────────────────────────────────────────────────────────────
    socket.on('typing:start', ({ chatId }) => socket.to(chatId).emit('typing:update', { chatId, userId, isTyping: true }));
    socket.on('typing:stop',  ({ chatId }) => socket.to(chatId).emit('typing:update', { chatId, userId, isTyping: false }));

    // ─── New chat room join ──────────────────────────────────────────────────
    socket.on('chat:join', ({ chatId }) => socket.join(chatId));

    // ─── WebRTC Signaling ────────────────────────────────────────────────────
    socket.on('call:initiate', async ({ targetUserId, callType, offer }) => {
      const targetSid = getUserSocketId(targetUserId);
      const caller = await User.findById(userId).select('name avatar').lean();
      if (targetSid) {
        io.to(targetSid).emit('call:incoming', {
          callerId: userId,
          callerSocketId: socket.id,
          callerName: caller?.name,
          callerAvatar: caller?.avatar,
          callType,
          offer,
        });
      }
    });

    socket.on('call:answer', ({ callerSocketId, answer }) => {
      io.to(callerSocketId).emit('call:answered', { answer, answererSocketId: socket.id, answererId: userId });
    });

    socket.on('call:ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('call:ice-candidate', { candidate, fromSocketId: socket.id });
    });

    socket.on('call:end', ({ targetSocketId }) => {
      if (targetSocketId) io.to(targetSocketId).emit('call:ended', { by: userId });
    });

    socket.on('call:reject', ({ callerSocketId }) => {
      io.to(callerSocketId).emit('call:rejected', { by: userId });
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const sids = userSockets.get(userId);
      if (sids) {
        sids.delete(socket.id);
        if (sids.size === 0) userSockets.delete(userId);
      }
      if (!userSockets.has(userId)) {
        const now = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: now });
        io.emit('user:status', { userId, isOnline: false, lastSeen: now });
      }
    });
  });

  return io;
};
