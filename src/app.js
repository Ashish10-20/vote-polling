import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './routes/authRoutes.js';
import pollRoutes from './routes/pollRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';



const app = express();

// Middlewares
app.use(helmet());
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/polls', pollRoutes);

// Health check
app.get('/', (_req, res) => res.json({ ok: true, service: 'poll-voting-backend' }));

// Errors
app.use(notFound);
app.use(errorHandler);

export default app;
