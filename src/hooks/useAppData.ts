/**
 * @file useAppData.ts
 * @description Custom hook that manages all application data fetching and state:
 * goals, tasks, habits, sessions, and localStorage sync for guest mode.
 * Also provides notification watchers for task/goal/session completion events.
 * Extracted from App.tsx to improve readability and maintainability.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Goal, Task, Habit, FocusSession } from '../types';
import { goalsApi, tasksApi, habitsApi, sessionsApi } from '../lib/api';
import { STORAGE_KEYS, RETENTION_DAYS } from '../lib/constants';

type AddNotificationFn = (title: string, message: string, type?: 'system' | 'task' | 'goal' | 'habit') => Promise<void>;

interface UseAppDataReturn {
  goals: Goal[];
  setGoals: Dispatch<SetStateAction<Goal[]>>;
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  habits: Habit[];
  setHabits: Dispatch<SetStateAction<Habit[]>>;
  sessions: FocusSession[];
  setSessions: Dispatch<SetStateAction<FocusSession[]>>;
  isDataLoading: boolean;
  fetchAllData: () => Promise<void>;
  clearAllData: () => void;
}

interface UseAppDataOptions {
  isGuest: boolean;
  isAuthenticated: boolean;
  addNotification: AddNotificationFn;
}

export function useAppData({
  isGuest,
  isAuthenticated,
  addNotification,
}: UseAppDataOptions): UseAppDataReturn {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // ==================== FETCH: PROGRESSIVE LOADING ====================
  const fetchAllData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      // Stage 1: Fetch critical data first — goals, tasks, habits
      // This allows the UI to render as quickly as possible.
      const [goalsData, tasksData, habitsData] = await Promise.all([
        goalsApi.getAll(),
        tasksApi.getAll(),
        habitsApi.getAll(),
      ]);
      setGoals(goalsData);
      setTasks(tasksData);
      setHabits(habitsData);
      setIsDataLoading(false);

      // Stage 2: Fetch secondary data in the background
      // Sessions and notifications are heavier and not needed for the initial render.
      const sessionsData = await sessionsApi.getAll();
      setSessions(sessionsData);
    } catch (error) {
      console.error('[AppData] Failed to fetch data:', error);
      setIsDataLoading(false);
    }
  }, []);

  // ==================== CLEAR ALL DATA ====================
  const clearAllData = useCallback(() => {
    setGoals([]);
    setTasks([]);
    setHabits([]);
    setSessions([]);
  }, []);

  // ==================== GUEST SYNC (localStorage) ====================
  // Mirror state to localStorage when in guest mode so data persists on reload.
  useEffect(() => {
    if (!isGuest) return;
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
  }, [goals, isGuest]);

  useEffect(() => {
    if (!isGuest) return;
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks, isGuest]);

  useEffect(() => {
    if (!isGuest) return;
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
  }, [habits, isGuest]);

  useEffect(() => {
    if (!isGuest) return;
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }, [sessions, isGuest]);

  // ==================== CLEANUP: Purge old tasks on mount ====================
  useEffect(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS.TASKS);
    const cutoffTimestamp = cutoffDate.getTime();

    setTasks((prevTasks) => {
      const filtered = prevTasks.filter((task) => {
        if (!task.date) return true;
        return new Date(task.date).getTime() > cutoffTimestamp;
      });
      // Avoid state update if nothing changed (prevents unnecessary re-renders)
      return filtered.length !== prevTasks.length ? filtered : prevTasks;
    });
  }, []); // Intentionally runs once on mount only

  // ==================== NOTIFICATION WATCHER: Task Completion ====================
  const prevCompletedTaskIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) return;

    tasks.forEach((task) => {
      if (task.completed && !prevCompletedTaskIds.current.has(task.id)) {
        addNotification(
          'Mission Accomplished',
          `Objective "${task.title}" has been successfully completed. Neural integrity increased.`,
          'task'
        );
      }
      if (task.completed) {
        prevCompletedTaskIds.current.add(task.id);
      } else {
        prevCompletedTaskIds.current.delete(task.id);
      }
    });
  }, [tasks, isAuthenticated, addNotification]);

  // ==================== NOTIFICATION WATCHER: Session Completion ====================
  const prevSessionCount = useRef(0);

  useEffect(() => {
    if (sessions.length > prevSessionCount.current && prevSessionCount.current > 0) {
      const latestSession = sessions[0];
      if (latestSession) {
        const durationInMinutes = Math.round(latestSession.duration / 60);
        addNotification(
          'Focus Protocol Complete',
          `Session finalized. You dedicated ${durationInMinutes} minutes to focused work. Cognitive capacity expanded.`,
          'system'
        );
      }
    }
    prevSessionCount.current = sessions.length;
  }, [sessions, addNotification]);

  return {
    goals,
    setGoals,
    tasks,
    setTasks,
    habits,
    setHabits,
    sessions,
    setSessions,
    isDataLoading,
    fetchAllData,
    clearAllData,
  };
}
