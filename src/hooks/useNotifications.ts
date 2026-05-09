/**
 * @file useNotifications.ts
 * @description Custom hook that encapsulates all notification-related logic,
 * including creation, read-marking, auto-cleanup, and daily welcome triggers.
 * Extracted from App.tsx to improve separation of concerns.
 */

import { useState, useCallback, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Notification, UserProfile } from '../types';
import { notificationsApi } from '../lib/api';
import { STORAGE_KEYS, RETENTION_DAYS, DAILY_GREETINGS, TOAST_DISMISS_DURATION_S } from '../lib/constants';

interface UseNotificationsReturn {
  notifications: Notification[];
  setNotifications: Dispatch<SetStateAction<Notification[]>>;
  activeToast: Notification | null;
  dismissToast: () => void;
  addNotification: (title: string, message: string, type?: Notification['type']) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
}

interface UseNotificationsOptions {
  isGuest: boolean;
  isAuthenticated: boolean;
  profile: UserProfile;
}

export function useNotifications({
  isGuest,
  isAuthenticated,
  profile,
}: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeToast, setActiveToast] = useState<Notification | null>(null);

  // ==================== CORE: ADD NOTIFICATION ====================
  const addNotification = useCallback(
    async (
      title: string,
      message: string,
      type: Notification['type'] = 'system'
    ) => {
      const payload = { title, message, type };

      if (!isGuest) {
        try {
          const created = await notificationsApi.create(payload);
          const normalized: Notification = {
            ...created,
            time: new Date(created.createdAt).toLocaleString(),
          };
          setNotifications((prev) => [normalized, ...prev]);
          setActiveToast(normalized);
        } catch (err) {
          // Fail silently — notifications are non-critical
          console.error('[Notification] Failed to persist notification:', err);
        }
      } else {
        const localNotif: Notification = {
          id: `local-${Date.now()}`,
          ...payload,
          read: false,
          time: new Date().toLocaleString(),
          createdAt: new Date().toISOString(),
        };
        setNotifications((prev) => [localNotif, ...prev]);
        setActiveToast(localNotif);
      }
    },
    [isGuest]
  );

  // ==================== MARK AS READ ====================
  const markNotificationAsRead = useCallback(
    async (id: string) => {
      // Optimistic UI update first
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      if (!isGuest) {
        try {
          await notificationsApi.markRead(id);
        } catch {
          // Fail silently — state is already updated optimistically
        }
      }
    },
    [isGuest]
  );

  // ==================== TOAST DISMISS ====================
  const dismissToast = useCallback(() => setActiveToast(null), []);

  // ==================== CLEANUP OLD NOTIFICATIONS (on mount) ====================
  useEffect(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS.NOTIFICATIONS);
    const cutoffTimestamp = cutoffDate.getTime();

    setNotifications((prev) =>
      prev.filter((n) => {
        const createdTimestamp = n.createdAt
          ? new Date(n.createdAt).getTime()
          : Date.now();
        return createdTimestamp > cutoffTimestamp;
      })
    );
  }, []); // Intentionally runs only once on mount

  // ==================== DAILY WELCOME NOTIFICATION ====================
  useEffect(() => {
    if (!isAuthenticated || !profile.name) return;

    const todayString = new Date().toDateString();
    const storageKey = `${STORAGE_KEYS.WELCOME_PREFIX}${profile.email || profile.name}`;
    const lastWelcomeDate = localStorage.getItem(storageKey);

    // Only fire once per calendar day
    if (lastWelcomeDate === todayString) return;

    const firstName = profile.name.split(' ')[0];
    const randomIndex = Math.floor(Math.random() * DAILY_GREETINGS.length);
    const greeting = DAILY_GREETINGS[randomIndex];

    // Personalize the first message with the user's first name
    const personalizedMessage = greeting.message.startsWith('firstName: ')
      ? `Welcome back, ${firstName}. ${greeting.message.slice('firstName: '.length)}`
      : greeting.message;

    addNotification(greeting.title, personalizedMessage, 'system');
    localStorage.setItem(storageKey, todayString);
  }, [isAuthenticated, profile.name, profile.email, addNotification]);

  return {
    notifications,
    setNotifications,
    activeToast,
    dismissToast,
    addNotification,
    markNotificationAsRead,
  };
}
