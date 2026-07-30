const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function sign(user) {
  return jwt.sign({ id: user._id.toString(), email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'يرجى إكمال جميع الحقول.' });

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً.' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    user = await User.create({ email, name, password: hashedPassword });
    
    res.json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, about: user.about, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'يرجى إكمال جميع الحقول.' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'البريد الإلكتروني غير موجود.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'كلمة المرور غير صحيحة.' });
    }
    
    res.json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, about: user.about, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ error: 'يرجى إكمال جميع الحقول.' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'البريد الإلكتروني غير موجود.' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
