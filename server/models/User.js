const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: false }, // optional for google auth
  googleId: { type: String, required: false }, // optional
  name:     { type: String, required: true },
  avatar:   { type: String, default: '' },
  about:    { type: String, default: 'مرحباً! أنا أستخدم ZizoChat.' },
  phone:    { type: String, default: '' },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
