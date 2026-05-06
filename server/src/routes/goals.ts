import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ==================== VALIDATION ====================

const goalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).default(''),
  color: z.string().default('#E38569'),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid start date'),
  deadline: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid deadline'),
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.deadline);
  return end > start;
}, { message: 'Deadline must be at least one day after start date' });

// ==================== GET ALL GOALS ====================

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId! },
      include: {
        tasks: true,
        habits: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute progress for each goal using the Daily Quota model
    const goalsWithProgress = goals.map(g => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTime = today.getTime();

      const start = new Date(g.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(g.deadline);
      end.setHours(0, 0, 0, 0);

      const startTime = start.getTime();
      const endTime = end.getTime();

      const totalDays = Math.max(1, Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24)) + 1);
      const dailyQuota = 100 / totalDays;

      let earnedProgress = 0;

      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(startTime + i * 24 * 60 * 60 * 1000);
        const currentDateStr = currentDate.toISOString().split('T')[0];
        const deadlineStr = g.deadline.toISOString().split('T')[0];

        const dayTasks = g.tasks.filter(t =>
          t.date === currentDateStr || (!t.date && currentDateStr === deadlineStr)
        );
        const dayHabits = g.habits;

        const totalItems = dayTasks.length + dayHabits.length;

        if (totalItems === 0) {
          if (currentDate.getTime() <= todayTime) {
            earnedProgress += dailyQuota;
          }
        } else {
          const completedTasks = dayTasks.filter(t => t.completed).length;
          const completedHabits = dayHabits.filter(h =>
            (h.completedDates || []).includes(currentDateStr)
          ).length;

          earnedProgress += ((completedTasks + completedHabits) / totalItems) * dailyQuota;
        }
      }

      const { tasks: _, habits: __, ...goalData } = g;
      return {
        ...goalData,
        startDate: g.startDate.toISOString().split('T')[0],
        deadline: g.deadline.toISOString().split('T')[0],
        progress: Math.min(100, Math.round(earnedProgress)),
      };
    });

    res.json(goalsWithProgress);
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// ==================== CREATE GOAL ====================

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = goalSchema.parse(req.body);

    const goal = await prisma.goal.create({
      data: {
        userId: req.userId!,
        title: data.title,
        description: data.description,
        color: data.color,
        startDate: new Date(data.startDate),
        deadline: new Date(data.deadline),
      },
    });

    res.status(201).json({
      ...goal,
      startDate: goal.startDate.toISOString().split('T')[0],
      deadline: goal.deadline.toISOString().split('T')[0],
      progress: 0,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// ==================== UPDATE GOAL ====================

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const updateSchema = z.object({
      title: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      color: z.string().optional(),
      startDate: z.string().optional(),
      deadline: z.string().optional(),
    });

    const data = updateSchema.parse(req.body);

    // Verify ownership
    const existing = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    const goal = await prisma.goal.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    });

    res.json({
      ...goal,
      startDate: goal.startDate.toISOString().split('T')[0],
      deadline: goal.deadline.toISOString().split('T')[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// ==================== DELETE GOAL ====================

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.goal.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    await prisma.goal.delete({ where: { id: req.params.id } });
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

export default router;
