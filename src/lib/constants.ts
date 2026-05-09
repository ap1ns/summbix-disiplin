/**
 * @file constants.ts
 * @description Centralized constants for the Summbix Discipline application.
 * All magic strings, thresholds, and configuration values should be defined here.
 */

// ==================== APP METADATA ====================
export const APP_NAME = 'Summbix Discipline';
export const APP_VERSION = '2.4.0';

// ==================== API CONFIGURATION ====================
export const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:4000/api';

// ==================== STORAGE KEYS ====================
export const STORAGE_KEYS = {
  GOALS: 'summbix-goals',
  TASKS: 'summbix-tasks',
  HABITS: 'summbix-habits',
  SESSIONS: 'summbix-sessions',
  WELCOME_PREFIX: 'summbix-welcome-',
} as const;

// ==================== DATA RETENTION ====================
export const RETENTION_DAYS = {
  TASKS: 30,
  NOTIFICATIONS: 7,
} as const;

// ==================== NOTIFICATION CONTENT ====================
export const DAILY_GREETINGS = [
  { title: 'Protocol Initiated', message: 'firstName: Another day to transcend limits.' },
  { title: 'Systems Online', message: 'The path to mastery is built one session at a time. Systems ready.' },
  { title: 'Focus Mode Active', message: "Discipline is the bridge between goals and accomplishment. Let's build." },
  { title: 'Discipline Node Ready', message: 'Your potential is a recursive loop of focused effort. Begin execution.' },
  { title: 'Cognitive Sync Complete', message: 'Time is the only currency that matters. Spend it with absolute intent.' },
  { title: 'Neural Integrity High', message: 'Excellence is not an act, but a habit. Your rituals await.' },
  { title: 'Mission Readiness: 100%', message: 'Focus is the weapon, discipline is the armor. Equip yourself.' },
] as const;

// ==================== DEFAULT USER PROFILE ====================
export const DEFAULT_PROFILE = {
  name: 'Summbix',
  avatar: 'Summbix',
  bio: 'Master of Discipline',
  email: '',
  joinDate: '',
} as const;

// ==================== TOAST ANIMATION ====================
export const TOAST_DISMISS_DURATION_S = 5;
