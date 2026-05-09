import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET ALL
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// MARK AS READ
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!existing) { res.status(404).json({ error: 'Not found' }); return; }

    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true },
    });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// CREATE
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { title, message, type } = req.body;
    const notification = await prisma.notification.create({
      data: {
        userId: req.userId!,
        title,
        message,
        type: type || 'system',
        read: false,
      },
    });
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// MARK ALL AS READ
router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, read: false },
      data: { read: true },
    });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
