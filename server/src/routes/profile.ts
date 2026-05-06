import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET PROFILE
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, name: true, avatar: true, bio: true, email: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// UPDATE PROFILE
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(1).max(50).optional(),
      avatar: z.string().optional(),

      bio: z.string().max(300).optional(),
      email: z.string().email().optional(),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(8).optional(),
    });
    const data = schema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const updateData: any = {
      name: data.name,
      avatar: data.avatar,
      bio: data.bio,
    };

    // Handle Email Update
    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) {
        res.status(409).json({ error: 'Email already in use' });
        return;
      }
      updateData.email = data.email;
    }

    // Handle Password Update
    if (data.newPassword) {
      if (!data.currentPassword) {
        res.status(400).json({ error: 'Current password is required to set a new one' });
        return;
      }
      const valid = await bcrypt.compare(data.currentPassword, user.password);
      if (!valid) {
        res.status(401).json({ error: 'Current password incorrect' });
        return;
      }
      updateData.password = await bcrypt.hash(data.newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: req.userId! },
      data: updateData,
      select: { id: true, name: true, avatar: true, bio: true, email: true, createdAt: true },
    });
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Update Profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});


// DELETE ACCOUNT & ALL DATA
router.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.userId! } });
    res.clearCookie('refreshToken');
    res.json({ message: 'Account deleted permanently' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
