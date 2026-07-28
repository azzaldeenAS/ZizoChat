const router = require('express').Router();
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
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

// POST /api/auth/google — verify Google token, find/create user, send OTP
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ googleId: sub });
    if (!user) {
      user = await User.create({ googleId: sub, email, name, avatar: picture });
    } else {
      // Update name/avatar in case they changed
      user.name = name;
      user.avatar = picture;
      await user.save();
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndDelete({ email });
    await OTP.create({ email, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });

    await transporter.sendMail({
      from: `"ZizoChat" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 رمز التحقق - ZizoChat',
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:24px;background:#f0f2f5;border-radius:12px;">
          <h2 style="color:#128C7E;text-align:center;">ZizoChat</h2>
          <p>مرحباً ${name}،</p>
          <p>رمز التحقق الخاص بك هو:</p>
          <div style="text-align:center;margin:24px 0;">
            <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#075E54;">${code}</span>
          </div>
          <p style="color:#888;font-size:13px;">الرمز صالح لمدة 10 دقائق فقط.</p>
          <hr/>
          <p style="color:#aaa;font-size:11px;text-align:center;">حقوق الطبع للمهندس عزالدين الرهمي ورقم الهاتف +967777320031</p>
        </div>
      `,
    });

    res.json({ success: true, email });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-otp — verify OTP, return JWT + user
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    const record = await OTP.findOne({ email });

    if (!record) return res.status(400).json({ error: 'لم يُرسل أي رمز تحقق. يرجى تسجيل الدخول مرة أخرى.' });
    if (record.expiresAt < new Date()) {
      await record.deleteOne();
      return res.status(400).json({ error: 'انتهت صلاحية الرمز. يرجى تسجيل الدخول مرة أخرى.' });
    }
    if (record.code !== code.toString()) return res.status(400).json({ error: 'رمز التحقق غير صحيح.' });

    await record.deleteOne();
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود.' });

    res.json({ token: sign(user), user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, about: user.about, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/resend-otp — resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود.' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.findOneAndDelete({ email });
    await OTP.create({ email, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });

    await transporter.sendMail({
      from: `"ZizoChat" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 رمز التحقق - ZizoChat',
      text: `رمز التحقق: ${code} (صالح 10 دقائق)`,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
