import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    index: true
  },
  gameName: {
    type: String,
    required: true,
    index: true
  },
  score: {
    type: Number,
    required: true,
    default: 0
  },
  playTime: {
    type: Number, // 플레이 시간 (초)
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// 복합 인덱스: 게임별 점수 정렬을 위한 인덱스
scoreSchema.index({ gameName: 1, score: -1 });
scoreSchema.index({ gameName: 1, studentId: 1 });

export default mongoose.model('Score', scoreSchema);
