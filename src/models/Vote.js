import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    poll: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
    optionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true }
);

// one vote per user per poll
voteSchema.index({ user: 1, poll: 1 }, { unique: true });

export const Vote = mongoose.models.Vote || mongoose.model('Vote', voteSchema);
