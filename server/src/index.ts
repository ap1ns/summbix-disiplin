import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma.js';

import authRoutes from './routes/auth.js';
import goalRoutes from './routes/goals.js';
import taskRoutes from './routes/tasks.js';
import habitRoutes from './routes/habits.js';
import sessionRoutes from './routes/sessions.js';
import notificationRoutes from './routes/notifications.js';
import profileRoutes from './routes/profile.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ==================== MIDDLEWARE ====================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// CORS - Allow frontend to communicate
app.use(cors({
  origin: true,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ==================== ROUTES ====================

app.use('/api/auth', authRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ==================== START SERVER ====================

// Only listen if not on Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Summbix Discipline API running on http://localhost:${PORT}`);
  });
}

export default app;
export { prisma };
