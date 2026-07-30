const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const OTP = require('../models/OTP');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

function sign(user) {
  return jwt.sign({ id: user._id.toString(), email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ googleId: sub, email, name, avatar: picture });
    } else {
      user.googleId = sub;
      user.name = name;
      if (!user.avatar) user.avatar = picture;
      await user.save();
    }
    res.json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, about: user.about, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'يرجى إكمال جميع الحقول.' });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً.' });

    const code = generateCode();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await OTP.findOneAndDelete({ email });
    await OTP.create({ 
      email, 
      code, 
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      meta: { name, password: hashedPassword }
    });

    await transporter.sendMail({
      from: `"ZizoChat" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 رمز التحقق - ZizoChat',
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:24px;background:#f0f2f5;border-radius:12px;"><h2 style="color:#128C7E;text-align:center;">ZizoChat</h2><p>رمز التحقق لإنشاء حسابك هو:</p><div style="text-align:center;margin:24px 0;"><span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#075E54;">${code}</span></div><p style="color:#888;font-size:13px;">الرمز صالح لمدة 10 دقائق فقط.</p><hr/><p style="color:#aaa;font-size:11px;text-align:center;">حقوق الطبع للمهندس عزالدين الرهمي ورقم الهاتف +967777320031</p></div>`
    });

    res.json({ success: true, message: 'تم إرسال رمز التحقق إلى بريدك.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signup-verify
router.post('/signup-verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    const record = await OTP.findOne({ email });

    if (!record) return res.status(400).json({ error: 'انتهت صلاحية الرمز أو أنه غير موجود.' });
    if (record.code !== code.toString()) return res.status(400).json({ error: 'رمز التحقق غير صحيح.' });

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, name: record.meta.name, password: record.meta.password });
    }
    
    await record.deleteOne();
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
    if (!user || !user.password) return res.status(404).json({ error: 'البريد الإلكتروني غير مسجل عبر كلمة مرور. جرب الدخول بجوجل.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'كلمة المرور غير صحيحة.' });

    res.json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, about: user.about, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'البريد الإلكتروني غير موجود.' });

    const code = generateCode();
    await OTP.findOneAndDelete({ email });
    await OTP.create({ email, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });

    await transporter.sendMail({
      from: `"ZizoChat" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 رمز التحقق - ZizoChat',
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:24px;background:#f0f2f5;border-radius:12px;"><h2 style="color:#128C7E;text-align:center;">ZizoChat</h2><p>رمز التحقق لاستعادة كلمة المرور هو:</p><div style="text-align:center;margin:24px 0;"><span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#075E54;">${code}</span></div><p style="color:#888;font-size:13px;">الرمز صالح لمدة 10 دقائق فقط.</p><hr/><p style="color:#aaa;font-size:11px;text-align:center;">حقوق الطبع للمهندس عزالدين الرهمي ورقم الهاتف +967777320031</p></div>`
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password-verify
router.post('/forgot-password-verify', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'البيانات غير مكتملة.' });

    const record = await OTP.findOne({ email });
    if (!record) return res.status(400).json({ error: 'انتهت صلاحية الرمز أو أنه غير موجود.' });
    if (record.code !== code.toString()) return res.status(400).json({ error: 'رمز التحقق غير صحيح.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود.' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await record.deleteOne();

    res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
