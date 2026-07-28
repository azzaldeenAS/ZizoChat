const router = require('express').Router();
const auth = require('../middleware/auth');
const Message = require('../models/Message');

// GET /api/messages/:chatId — paginated messages
router.get('/:chatId', auth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before; // message ID for pagination

    const query = { chatId };
    if (before) query._id = { $lt: before };

    const messages = await Message.find(query)
      .populate('senderId', 'name avatar')
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    const result = messages.reverse().map(m => ({
      id: m._id.toString(),
      chatId: m.chatId.toString(),
      senderId: m.senderId._id.toString(),
      senderName: m.senderId.name,
      senderAvatar: m.senderId.avatar,
      type: m.type,
      text: m.text,
      replyToId: m.replyToId?.toString(),
      voice: m.voice,
      image: m.image,
      poll: m.poll ? {
        question: m.poll.question,
        options: m.poll.options.map(o => ({ id: o.id, text: o.text, votes: o.votes.map(v => v.toString()) })),
      } : undefined,
      reactions: m.reactions.map(r => ({ emoji: r.emoji, by: r.by.toString() })),
      status: m.status,
      timestamp: m.timestamp,
      time: formatTime(m.timestamp),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/messages/:id/read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, { status: 'read' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function formatTime(date) {
  const d = new Date(date);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'م' : 'ص';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

module.exports = router;
