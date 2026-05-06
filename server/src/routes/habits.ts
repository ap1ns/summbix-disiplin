import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ==================== VALIDATION ====================

const habitSchema = z.object({
  label: z.string().min(1, 'Label is required').max(200),
  goalId: z.string().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
});

// ==================== GET ALL HABITS ====================

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });

    res.json(habits);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
});

// ==================== CREATE HABIT ====================

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = habitSchema.parse(req.body);

    if (data.goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: data.goalId, userId: req.userId! },
      });
      if (!goal) {
        res.status(400).json({ error: 'Goal not found' });
        return;
      }
    }

    const habit = await prisma.habit.create({
      data: {
        userId: req.userId!,
        label: data.label,
        goalId: data.goalId || null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        completedDates: [],
      },
    });

    res.status(201).json(habit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Failed to create habit' });
  }
});

// ==================== UPDATE HABIT ====================

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const updateSchema = z.object({
      label: z.string().min(1).max(200).optional(),
      goalId: z.string().optional().nullable(),
      startTime: z.string().optional().nullable(),
      endTime: z.string().optional().nullable(),
    });

    const data = updateSchema.parse(req.body);

    const existing = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }

    const habit = await prisma.habit.update({
      where: { id: req.params.id },
      data,
    });

    res.json(habit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Failed to update habit' });
  }
});

// ==================== TOGGLE HABIT (Add/Remove date) ====================

router.patch('/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const { date } = z.object({ date: z.string() }).parse(req.body);

    const existing = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }

    const dates = existing.completedDates || [];
    const isCompleted = dates.includes(date);

    const habit = await prisma.habit.update({
      where: { id: req.params.id },
      data: {
        completedDates: isCompleted
          ? dates.filter(d => d !== date)
          : [...dates, date],
      },
    });

    res.json(habit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Failed to toggle habit' });
  }
});

// ==================== DELETE HABIT ====================

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.habit.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: 'Habit not found' });
      return;
    }

    await prisma.habit.delete({ where: { id: req.params.id } });
    res.json({ message: 'Habit deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete habit' });
  }
});

export default router;
