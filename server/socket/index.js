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
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

module.exports = function setupSocket(server) {
  const io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL, methods: ['GET', 'POST'] },
    maxHttpBufferSize: 10 * 1024 * 1024, // 10 MB for large payloads
  });

  // ─── Auth middleware ────────────────────────────────────────────────────────
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

  // Group call rooms: chatId → Map<userId, { socketId, name, avatar }>
  const groupCallRooms = new Map();

  function getUserSocketId(userId) {
    const sids = userSockets.get(userId.toString());
    return sids ? [...sids][0] : null;
  }

  function getUserSocketIds(userId) {
    return [...(userSockets.get(userId.toString()) ?? [])];
  }

  // ─── Connection ─────────────────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const userId = socket.user.id;

    // Track socket
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);
    socket.join(userId.toString());

    await User.findByIdAndUpdate(userId, { isOnline: true });
    io.emit('user:status', { userId, isOnline: true });

    // Join all chat rooms the user belongs to (including public rooms)
    const chats = await Chat.find({ $or: [{ members: userId }, { isPublic: true }] });
    chats.forEach(c => socket.join(c._id.toString()));

    // ─── Messaging ─────────────────────────────────────────────────────────────
    socket.on('message:send', async (data) => {
      try {
        const { chatId, type, text, replyToId, voice, image, poll } = data;
        const now = new Date();
        const msg = await Message.create({
          chatId,
          senderId: userId,
          type,
          text,
          replyToId,
          voice,
          image,
          poll,
          timestamp: now,
          status: 'sent',
          reactions: [],
        });

        const populated = await Message.findById(msg._id)
          .populate('senderId', 'name avatar')
          .lean();

        const out = {
          id: populated._id.toString(),
          chatId: populated.chatId.toString(),
          senderId: populated.senderId._id.toString(),
          senderName: populated.senderId.name,
          senderAvatar: populated.senderId.avatar,
          type: populated.type,
          text: populated.text,
          replyToId: populated.replyToId?.toString(),
          voice: populated.voice
            ? {
                duration: populated.voice.duration,
                waveform: populated.voice.waveform,
                speed: populated.voice.speed ?? 1,
                url: populated.voice.url ?? '',
              }
            : undefined,
          image: populated.image,
          poll: populated.poll
            ? {
                question: populated.poll.question,
                options: populated.poll.options.map(o => ({
                  id: o.id,
                  text: o.text,
                  votes: o.votes.map(v => v.toString()),
                })),
              }
            : undefined,
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
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
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
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('message:delete', async ({ messageId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg || msg.senderId.toString() !== userId) return;
        const chatId = msg.chatId.toString();
        await msg.deleteOne();
        io.to(chatId).emit('message:deleted', { messageId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('poll:vote', async ({ messageId, optionId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg?.poll) return;
        msg.poll.options = msg.poll.options.map(opt => ({
          ...opt._doc,
          votes: opt.id === optionId
            ? (opt.votes.map(v => v.toString()).includes(userId)
                ? opt.votes.filter(v => v.toString() !== userId)
                : [...opt.votes, userId])
            : opt.votes.filter(v => v.toString() !== userId),
        }));
        await msg.save();
        const updated = await Message.findById(msg._id).lean();
        io.to(msg.chatId.toString()).emit('poll:updated', {
          messageId,
          options: updated.poll.options.map(o => ({
            id: o.id,
            text: o.text,
            votes: o.votes.map(v => v.toString()),
          })),
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ─── Typing ────────────────────────────────────────────────────────────────
    socket.on('typing:start', ({ chatId }) => {
      socket.to(chatId).emit('typing:update', { chatId, userId, isTyping: true });
    });
    socket.on('typing:stop', ({ chatId }) => {
      socket.to(chatId).emit('typing:update', { chatId, userId, isTyping: false });
    });

    // ─── Chat room join ────────────────────────────────────────────────────────
    socket.on('chat:join', ({ chatId }) => socket.join(chatId));

    // ─── 1-to-1 WebRTC Signaling ───────────────────────────────────────────────
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
      io.to(callerSocketId).emit('call:answered', {
        answer,
        answererSocketId: socket.id,
        answererId: userId,
      });
    });

    socket.on('call:ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('call:ice-candidate', {
        candidate,
        fromSocketId: socket.id,
      });
    });

    socket.on('call:end', ({ targetSocketId }) => {
      if (targetSocketId) io.to(targetSocketId).emit('call:ended', { by: userId });
    });

    socket.on('call:reject', ({ callerSocketId }) => {
      io.to(callerSocketId).emit('call:rejected', { by: userId });
    });

    // ─── Group call WebRTC Signaling (mesh topology) ───────────────────────────

    /**
     * Initiator starts a group call.
     * data: { chatId, callType, memberIds: string[] }
     * Server notifies each member and registers the caller in the group call room.
     */
    socket.on('group-call:initiate', async ({ chatId, callType, memberIds }) => {
      try {
        const caller = await User.findById(userId).select('name avatar').lean();

        // Create / reset the room for this chat
        if (!groupCallRooms.has(chatId)) groupCallRooms.set(chatId, new Map());
        const room = groupCallRooms.get(chatId);

        // Register the initiator in the room
        room.set(userId, {
          socketId: socket.id,
          name: caller?.name ?? '',
          avatar: caller?.avatar ?? '',
        });

        // Notify each target member
        for (const memberId of memberIds) {
          if (memberId === userId) continue;
          const targetSids = getUserSocketIds(memberId);
          for (const sid of targetSids) {
            io.to(sid).emit('group-call:incoming', {
              chatId,
              callType,
              callerId: userId,
              callerSocketId: socket.id,
              callerName: caller?.name,
              callerAvatar: caller?.avatar,
            });
          }
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * A participant accepts and joins the group call.
     * data: { chatId, callType }
     * Server adds them to the room and notifies all existing participants.
     * Each existing participant will then send a WebRTC offer to the new joiner.
     */
    socket.on('group-call:accept', async ({ chatId, callType }) => {
      try {
        const joiner = await User.findById(userId).select('name avatar').lean();

        if (!groupCallRooms.has(chatId)) groupCallRooms.set(chatId, new Map());
        const room = groupCallRooms.get(chatId);

        // Tell all EXISTING participants that a new peer joined (they will send offers)
        const existingPeers = [];
        for (const [peerId, peer] of room.entries()) {
          if (peerId === userId) continue;
          existingPeers.push({ peerId, ...peer });
          io.to(peer.socketId).emit('group-call:peer-joined', {
            chatId,
            callType,
            peerId: userId,
            peerSocketId: socket.id,
            peerName: joiner?.name ?? '',
            peerAvatar: joiner?.avatar ?? '',
          });
        }

        // Register the new joiner
        room.set(userId, {
          socketId: socket.id,
          name: joiner?.name ?? '',
          avatar: joiner?.avatar ?? '',
        });

        // Tell the new joiner who is already in the call so they know to expect offers
        socket.emit('group-call:existing-peers', {
          chatId,
          peers: existingPeers,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * Send a WebRTC offer to a specific participant in the group call.
     * data: { targetSocketId, offer, chatId }
     */
    socket.on('group-call:peer-offer', ({ targetSocketId, offer, chatId }) => {
      const caller = groupCallRooms.get(chatId)?.get(userId);
      io.to(targetSocketId).emit('group-call:peer-offer', {
        fromSocketId: socket.id,
        fromId: userId,
        fromName: caller?.name ?? '',
        fromAvatar: caller?.avatar ?? '',
        offer,
        chatId,
      });
    });

    /**
     * Send a WebRTC answer to a specific participant in the group call.
     * data: { targetSocketId, answer, chatId }
     */
    socket.on('group-call:peer-answer', ({ targetSocketId, answer, chatId }) => {
      io.to(targetSocketId).emit('group-call:peer-answer', {
        fromSocketId: socket.id,
        fromId: userId,
        answer,
        chatId,
      });
    });

    /**
     * Forward an ICE candidate to a specific participant.
     * data: { targetSocketId, candidate, chatId }
     */
    socket.on('group-call:peer-ice', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('group-call:peer-ice', {
        fromSocketId: socket.id,
        candidate,
      });
    });

    /**
     * A participant leaves the group call.
     * data: { chatId }
     */
    socket.on('group-call:leave', ({ chatId }) => {
      const room = groupCallRooms.get(chatId);
      if (!room) return;
      room.delete(userId);
      if (room.size === 0) groupCallRooms.delete(chatId);

      // Notify remaining participants
      for (const [, peer] of room.entries()) {
        io.to(peer.socketId).emit('group-call:peer-left', {
          chatId,
          peerId: userId,
        });
      }
    });

    // ─── Disconnect ────────────────────────────────────────────────────────────
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

        // Remove from any active group call rooms
        for (const [chatId, room] of groupCallRooms.entries()) {
          if (room.has(userId)) {
            room.delete(userId);
            if (room.size === 0) {
              groupCallRooms.delete(chatId);
            } else {
              for (const [, peer] of room.entries()) {
                io.to(peer.socketId).emit('group-call:peer-left', { chatId, peerId: userId });
              }
            }
          }
        }
      }
    });
  });

  return io;
};
