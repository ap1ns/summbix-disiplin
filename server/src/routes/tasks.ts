import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ==================== VALIDATION ====================

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  goalId: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
});

// ==================== GET ALL TASKS ====================

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ==================== CREATE TASK ====================

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = taskSchema.parse(req.body);

    // Verify goal ownership if goalId provided
    if (data.goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: data.goalId, userId: req.userId! },
      });
      if (!goal) {
        res.status(400).json({ error: 'Goal not found' });
        return;
      }
    }

    const task = await prisma.task.create({
      data: {
        userId: req.userId!,
        title: data.title,
        priority: data.priority,
        goalId: data.goalId || null,
        date: data.date || null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
      },
    });

    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// ==================== UPDATE TASK ====================

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const updateSchema = z.object({
      title: z.string().min(1).max(200).optional(),
      completed: z.boolean().optional(),
      priority: z.enum(['low', 'medium', 'high']).optional(),
      goalId: z.string().optional().nullable(),
      date: z.string().optional().nullable(),
      startTime: z.string().optional().nullable(),
      endTime: z.string().optional().nullable(),
    });

    const data = updateSchema.parse(req.body);

    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
    });

    res.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ==================== TOGGLE TASK COMPLETION ====================

router.patch('/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { completed: !existing.completed },
    });

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle task' });
  }
});

// ==================== DELETE TASK ====================

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
