const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  members:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isGroup:   { type: Boolean, default: false },
  name:      { type: String, default: '' },
  avatar:    { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admins:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pinned:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  muted:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archived:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
