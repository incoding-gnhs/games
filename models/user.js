import mongoose from 'mongoose';

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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// User 삭제 시 관련된 Score와 Reward도 함께 삭제
userSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    const Score = mongoose.model('Score');
    const Reward = mongoose.model('Reward');
    
    await Score.deleteMany({ studentId: this.studentId });
    await Reward.deleteMany({ studentId: this.studentId });
    
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.pre('findOneAndDelete', async function(next) {
  try {
    const doc = await this.model.findOne(this.getQuery());
    if (doc) {
      const Score = mongoose.model('Score');
      const Reward = mongoose.model('Reward');
      
      await Score.deleteMany({ studentId: doc.studentId });
      await Reward.deleteMany({ studentId: doc.studentId });
    }
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model('User', userSchema);
