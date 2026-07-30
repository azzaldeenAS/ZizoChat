const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  emoji: String,
  by:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const pollOptionSchema = new mongoose.Schema({
  id:    { type: String, required: true },
  text:  { type: String, required: true },
  votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const messageSchema = new mongoose.Schema({
  chatId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  senderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['text', 'voice', 'image', 'poll', 'system'], default: 'text' },
  text:      { type: String },
  replyToId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  voice: {
    duration: Number,
    waveform:  [Number],
    speed:     { type: Number, default: 1 },
    url:       { type: String, default: '' },
  },
  image:     { url: String, caption: String },
  poll:      { question: String, options: [pollOptionSchema] },
  reactions: [reactionSchema],
  status:    { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
