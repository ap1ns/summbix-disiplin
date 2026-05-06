import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const sessionSchema = z.object({
  date: z.string(),
  duration: z.number().min(1),
  title: z.string().optional().nullable(),
  goalId: z.string().optional().nullable(),
  taskId: z.string().optional().nullable(),
  habitId: z.string().optional().nullable(),
});

// GET ALL
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await prisma.focusSession.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// CREATE
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = sessionSchema.parse(req.body);
    const session = await prisma.focusSession.create({
      data: {
        userId: req.userId!,
        date: data.date,
        duration: data.duration,
        title: data.title || null,
        goalId: data.goalId || null,
        taskId: data.taskId || null,
        habitId: data.habitId || null,
      },
    });
    res.status(201).json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// DELETE
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.focusSession.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }
    await prisma.focusSession.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// DELETE BY TASK
router.delete('/by-task/:taskId', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.focusSession.deleteMany({
      where: { taskId: req.params.taskId, userId: req.userId! },
    });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// DELETE BY HABIT (optionally filtered by date)
router.delete('/by-habit/:habitId', async (req: AuthRequest, res: Response) => {
  try {
    const { date } = req.query as { date?: string };
    await prisma.focusSession.deleteMany({
      where: {
        habitId: req.params.habitId,
        userId: req.userId!,
        ...(date ? { date } : {}),
      },
    });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
