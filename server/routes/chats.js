const router = require('express').Router();
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

// GET /api/chats — get all chats for current user
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await Chat.find({ members: userId })
      .populate('members', 'name avatar isOnline lastSeen about phone')
      .sort({ updatedAt: -1 });

    const result = await Promise.all(chats.map(async (chat) => {
      const lastMsg = await Message.findOne({ chatId: chat._id }).sort({ timestamp: -1 }).lean();
      return {
        id: chat._id.toString(),
        isGroup: chat.isGroup,
        name: chat.isGroup ? chat.name : null,
        avatar: chat.isGroup ? chat.avatar : null,
        members: chat.members.map(m => ({
          id: m._id.toString(), name: m.name, avatar: m.avatar,
          isOnline: m.isOnline, lastSeen: m.lastSeen, about: m.about, phone: m.phone,
          isAdmin: chat.admins.map(a => a.toString()).includes(m._id.toString()),
        })),
        pinned: chat.pinned.map(p => p.toString()).includes(userId),
        muted: chat.muted.map(p => p.toString()).includes(userId),
        archived: chat.archived.map(p => p.toString()).includes(userId),
        lastMessage: lastMsg ? {
          id: lastMsg._id.toString(),
          type: lastMsg.type,
          text: lastMsg.text,
          senderId: lastMsg.senderId.toString(),
          timestamp: lastMsg.timestamp,
          status: lastMsg.status,
        } : null,
      };
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats/direct — start or get a 1:1 chat
router.post('/direct', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    let chat = await Chat.findOne({
      isGroup: false,
      members: { $all: [userId, targetUserId], $size: 2 },
    }).populate('members', 'name avatar isOnline lastSeen about phone');

    if (!chat) {
      chat = await Chat.create({ members: [userId, targetUserId], isGroup: false });
      await chat.populate('members', 'name avatar isOnline lastSeen about phone');
    }

    res.json({
      id: chat._id.toString(),
      isGroup: false,
      members: chat.members.map(m => ({
        id: m._id.toString(), name: m.name, avatar: m.avatar,
        isOnline: m.isOnline, lastSeen: m.lastSeen, about: m.about, phone: m.phone,
        isAdmin: false,
      })),
      pinned: false, muted: false, archived: false, lastMessage: null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats/group — create a group chat
router.post('/group', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, memberIds } = req.body;
    const members = [...new Set([userId, ...memberIds])];

    const chat = await Chat.create({
      isGroup: true, name, members,
      createdBy: userId, admins: [userId],
    });
    await chat.populate('members', 'name avatar isOnline lastSeen about phone');

    res.json({
      id: chat._id.toString(),
      isGroup: true,
      name: chat.name,
      avatar: chat.avatar || '',
      members: chat.members.map(m => ({
        id: m._id.toString(), name: m.name, avatar: m.avatar,
        isOnline: m.isOnline, isAdmin: chat.admins.map(a => a.toString()).includes(m._id.toString()),
      })),
      pinned: false, muted: false, archived: false, lastMessage: null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/chats/:id/pin
router.patch('/:id/pin', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const idx = chat.pinned.indexOf(userId);
    if (idx >= 0) chat.pinned.splice(idx, 1); else chat.pinned.push(userId);
    await chat.save();
    res.json({ pinned: chat.pinned.includes(userId) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/chats/:id/mute
router.patch('/:id/mute', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const idx = chat.muted.indexOf(userId);
    if (idx >= 0) chat.muted.splice(idx, 1); else chat.muted.push(userId);
    await chat.save();
    res.json({ muted: chat.muted.includes(userId) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/chats/:id/archive
router.patch('/:id/archive', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    const idx = chat.archived.indexOf(userId);
    if (idx >= 0) chat.archived.splice(idx, 1); else chat.archived.push(userId);
    await chat.save();
    res.json({ archived: chat.archived.includes(userId) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
