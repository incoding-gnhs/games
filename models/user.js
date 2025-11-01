const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: false
  },
  studentId: {
    type: String,
    required: true,
    unique: true
  },
  rewards: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    earnedAt: {
      type: Date,
      default: Date.now
    },
    claimed: {
      type: Boolean,
      default: false
    },
    claimedAt: {
      type: Date,
      default: null
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
