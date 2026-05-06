import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../index.js';
import { authenticate, generateTokens, AuthRequest } from '../middleware/auth.js';
import { sendOtpEmail } from '../utils/email.js';


const router = Router();

// ==================== VALIDATION SCHEMAS ====================

const DISPOSABLE_DOMAINS = ['mailinator.com', 'temp-mail.org', 'guerrillamail.com', '10minutemail.com'];

const registerSchema = z.object({
  email: z.string().email('Invalid email address').refine((email) => {
    const domain = email.split('@')[1];
    return !DISPOSABLE_DOMAINS.includes(domain);
  }, 'Disposable emails are not allowed'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(50),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ==================== REGISTER ====================

router.post('/register', async (req, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      if (existing.isVerified) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      } else {
        // If not verified, delete the old unverified user to allow re-registration
        await prisma.user.delete({ where: { id: existing.id } });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create user with OTP
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        otpCode,
        otpExpires,
      },
      select: { id: true, email: true, name: true },
    });

    // Send OTP Email
    await sendOtpEmail(user.email, otpCode);


    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Identity Pending',
        message: 'Please verify your node with the transmitted code.',
        type: 'system',
      },
    });

    // Removed auto-login tokens
    res.status(201).json({ 
      message: 'Registration successful. OTP sent to your console.',
      user: { id: user.id, email: user.email, name: user.name } 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// ==================== LOGIN ====================

router.post('/login', async (req, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    // Check if user exists and is verified
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    
    // Treat unverified users exactly like non-existent users
    if (!user || !user.isVerified) {
      res.status(401).json({ error: 'Identity not found. Please join the Aura first.' });
      return;
    }

    // Check password
    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Security credentials mismatch.' });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,

    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        createdAt: user.createdAt,
      },
      accessToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// ==================== VERIFY OTP ====================

router.post('/verify-otp', async (req, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ error: 'Email and OTP are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ error: 'Account already verified' });
      return;
    }

    if (user.otpCode !== otp) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    if (user.otpExpires && user.otpExpires < new Date()) {
      res.status(400).json({ error: 'Code expired. Please request a new one.' });
      return;
    }

    // Mark as verified
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpires: null,
      },
      select: { id: true, email: true, name: true, avatar: true, bio: true, createdAt: true },
    });

    // Create welcome notification
    await prisma.notification.create({
      data: {
        userId: updatedUser.id,
        title: 'Node Authorized',
        message: 'Your biometric verification is complete. Welcome, Agent.',
        type: 'system',
      },
    });

    // Generate tokens (auto-login after verify)
    const { accessToken, refreshToken } = generateTokens(updatedUser.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,

    });

    res.json({ user: updatedUser, accessToken });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ==================== RESEND OTP ====================

router.post('/resend-otp', async (req, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: 'Email is required' }); return; }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) { res.status(404).json({ error: 'Email not found' }); return; }
    if (user.isVerified) { res.status(400).json({ error: 'Account already verified' }); return; }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({ where: { email }, data: { otpCode, otpExpires } });
    await sendOtpEmail(email, otpCode);

    res.json({ message: 'Verification code resent successfully' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend code' });
  }
});

// ==================== REFRESH TOKEN ====================

router.post('/refresh', async (req, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      res.status(401).json({ error: 'Refresh token required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, avatar: true, bio: true, createdAt: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,

    });

    res.json({ user, accessToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ==================== LOGOUT ====================

router.post('/logout', (_req, res: Response) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

// ==================== GET CURRENT USER ====================

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, email: true, name: true, avatar: true, bio: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
