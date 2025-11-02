import mongoose from 'mongoose';

const rewardSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
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
});

// 인덱스: 학생별 보상 조회용
rewardSchema.index({ studentId: 1, earnedAt: -1 });
rewardSchema.index({ studentId: 1, claimed: 1 });

export default mongoose.model('Reward', rewardSchema);
