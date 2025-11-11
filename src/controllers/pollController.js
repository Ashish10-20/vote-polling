import mongoose from 'mongoose';
import { Poll } from '../models/Poll.js';
import { Vote } from '../models/Vote.js';
import { validateOptions, isPast } from '../utils/validate.js';



// ADMIN: Create poll
export const createPoll = async (req, res, next) => {
  try {
    const { question, options, closesAt } = req.body;
    if (!question || !closesAt) {
      return res.status(400).json({ message: 'Question and closesAt are required' });
    }
    const optErr = validateOptions(options);
    if (optErr) return res.status(400).json({ message: optErr });

    const closeDate = new Date(closesAt);
    if (isPast(closeDate)) return res.status(400).json({ message: 'closesAt must be in the future' });

    const poll = await Poll.create({
      question,
      options: options.map((t) => ({ text: t })),
      closesAt: closeDate,
      createdBy: req.user.id,
    });
    res.status(201).json({ poll });
  } catch (e) {
    next(e);
  }
};

// ADMIN/USER: list polls (filter by ?status=open|closed)
export const listPolls = async (req, res, next) => {
  try {
    const { status } = req.query;
    const polls = await Poll.find({}).sort({ createdAt: -1 }).lean();
    const withStatus = polls.map((p) => ({
      ...p,
      isClosed: p.manuallyClosed || new Date(p.closesAt).getTime() <= Date.now(),
    }));
    const filtered = status ? withStatus.filter((p) => (status === 'open' ? !p.isClosed : p.isClosed)) : withStatus;
    res.json({ polls: filtered });
  } catch (e) {
    next(e);
  }
};

// Get single poll
export const getPoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    res.json({ poll, isClosed: poll.isClosed });
  } catch (e) {
    next(e);
  }
};

// ADMIN: update poll (only if not closed)
export const updatePoll = async (req, res, next) => {
  try {
    const { question, options, closesAt } = req.body;
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (poll.isClosed) return res.status(400).json({ message: 'Cannot edit a closed poll' });

    if (question) poll.question = question;
    if (closesAt) {
      const d = new Date(closesAt);
      if (isPast(d)) return res.status(400).json({ message: 'closesAt must be in the future' });
      poll.closesAt = d;
    }
    if (options) {
      const optErr = validateOptions(options);
      if (optErr) return res.status(400).json({ message: optErr });
      poll.options = options.map((t) => ({ text: t }));
    }

    await poll.save();
    res.json({ poll });
  } catch (e) {
    next(e);
  }
};

// ADMIN: delete poll
export const deletePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findByIdAndDelete(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    await Vote.deleteMany({ poll: poll._id });
    res.json({ message: 'Poll deleted' });
  } catch (e) {
    next(e);
  }
};

// ADMIN: manually close
export const closePoll = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    poll.manuallyClosed = true;
    await poll.save();
    res.json({ poll, isClosed: poll.isClosed });
  } catch (e) {
    next(e);
  }
};

// USER: vote once
export const vote = async (req, res, next) => {
  try {
    const { optionId } = req.body;
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (poll.isClosed) return res.status(400).json({ message: 'Poll is closed' });

    const valid = poll.options.find((o) => String(o._id) === String(optionId));
    if (!valid) return res.status(400).json({ message: 'Invalid option' });

    await Vote.create({
      user: req.user.id,
      poll: poll._id,
      optionId: new mongoose.Types.ObjectId(optionId),
    });

    res.status(201).json({ message: 'Vote recorded' });
  } catch (e) {
    // unique index error => already voted
    if (e?.code === 11000) {
      return res.status(409).json({ message: 'You have already voted on this poll' });
    }
    next(e);
  }
};

// USER: results (only if user voted AND poll closed)
export const results = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    const userVoted = await Vote.findOne({ poll: poll._id, user: req.user.id });
    if (!userVoted) return res.status(403).json({ message: 'Vote first to view results' });
    if (!poll.isClosed) return res.status(403).json({ message: 'Results available after poll closes' });

    // Aggregate counts per optionId
    const counts = await Vote.aggregate([
      { $match: { poll: poll._id } },
      { $group: { _id: '$optionId', count: { $sum: 1 } } },
    ]);

    const map = new Map(counts.map((c) => [String(c._id), c.count]));
    const summary = poll.options.map((o) => ({
      optionId: o._id,
      text: o.text,
      votes: map.get(String(o._id)) || 0,
    }));

    res.json({
      poll: { id: poll._id, question: poll.question },
      totalVotes: summary.reduce((a, b) => a + b.votes, 0),
      summary,
    });
  } catch (e) {
    next(e);
  }
};
