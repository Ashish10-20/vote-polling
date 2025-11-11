import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: true }
);

const pollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    options: { type: [optionSchema], validate: [arr => arr.length >= 2, 'At least two options'] },
    closesAt: { type: Date, required: true },
    manuallyClosed: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

pollSchema.virtual('isClosed').get(function () {
  return this.manuallyClosed || new Date(this.closesAt).getTime() <= Date.now();
});

export const Poll = mongoose.models.Poll || mongoose.model('Poll', pollSchema);
