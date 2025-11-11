import { Router } from 'express';
import { auth, requireRole } from '../middleware/authMiddleware.js';
import {
  createPoll,
  listPolls,
  getPoll,
  updatePoll,
  deletePoll,
  closePoll,
  vote,
  results,
} from '../controllers/pollController.js';

const router = Router();

// Public-ish (needs auth only if protecting list; here list is public for discovery)
router.get('/', listPolls);
router.get('/:id', getPoll);

// Admin
router.post('/', auth, requireRole('admin'), createPoll);
router.patch('/:id', auth, requireRole('admin'), updatePoll);
router.delete('/:id', auth, requireRole('admin'), deletePoll);
router.post('/:id/close', auth, requireRole('admin'), closePoll);

// User actions
router.post('/:id/vote', auth, vote);
router.get('/:id/results', auth, results);

export default router;
