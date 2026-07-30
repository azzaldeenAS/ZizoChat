const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true },
  code:      { type: String, required: true },
  expiresAt: { type: Date, required: true },
  meta:      { type: Object, default: {} }, // Used to store temp signup data like name and password
});

// Auto-delete after expiry
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);
