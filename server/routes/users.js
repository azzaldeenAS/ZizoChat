const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /api/users/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-googleId');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id, name: user.name, email: user.email, avatar: user.avatar, about: user.about, phone: user.phone });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('name email avatar about phone isOnline lastSeen');
    res.json(users.map(u => ({
      id: u._id, name: u.name, email: u.email, avatar: u.avatar,
      about: u.about, phone: u.phone, isOnline: u.isOnline, lastSeen: u.lastSeen
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/users/me — update profile
router.patch('/me', auth, async (req, res) => {
  try {
    const { name, about, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { ...(name && { name }), ...(about !== undefined && { about }), ...(phone !== undefined && { phone }) },
      { new: true }
    ).select('-googleId');
    res.json({ id: user._id, name: user.name, email: user.email, avatar: user.avatar, about: user.about, phone: user.phone });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/users/search?q=email_or_name
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ],
    }).select('name email avatar isOnline').limit(20);
    res.json(users.map(u => ({ id: u._id, name: u.name, email: u.email, avatar: u.avatar, isOnline: u.isOnline })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
