/**
 * @file App.tsx
 * @description Root application component for Summbix Discipline.
 *
 * This component is intentionally kept thin. Heavy logic is delegated to
 * dedicated custom hooks:
 *  - useAppData     — data fetching, guest sync, cleanup, notification watchers
 *  - useGoalProgress — computes live goal progress percentages
 *  - useNotifications — notification state, toast, daily welcome
 *
 * Authentication state and profile management live here as they are the
 * true "root" concerns that everything else depends on.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle2, Target, X } from 'lucide-react';
import { cn } from './lib/utils';

// ==================== VIEWS ====================
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './components/Overview';
import FocusView from './components/FocusView';
import AnalyticsView from './components/AnalyticsView';
import ScheduleView from './components/ScheduleView';
import GoalsView from './components/GoalsView';
import HistoryView from './components/HistoryView';
import { ProfileView } from './components/ProfileView';
import HabitsView from './components/HabitsView';
import TasksView from './components/TasksView';
import Login from './components/Login';

// ==================== TYPES, HOOKS & API ====================
import { AppView, UserProfile, Notification } from './types';
import { authApi, profileApi } from './lib/api';
import { useAppData } from './hooks/useAppData';
import { useGoalProgress } from './hooks/useGoalProgress';
import { useNotifications } from './hooks/useNotifications';
import { DEFAULT_PROFILE, TOAST_DISMISS_DURATION_S } from './lib/constants';

// ==================== TYPE DEFINITIONS ====================
type FocusTarget = {
  id: string;
  type: 'goal' | 'task' | 'habit';
  title: string;
  goalId?: string;
};

// ==================== COMPONENT ====================
export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE as UserProfile);

  // ==================== CUSTOM HOOKS ====================

  const {
    notifications,
    setNotifications,
    activeToast,
    dismissToast,
    addNotification,
    markNotificationAsRead,
  } = useNotifications({ isGuest, isAuthenticated, profile });

  const {
    goals, setGoals,
    tasks, setTasks,
    habits, setHabits,
    sessions, setSessions,
    fetchAllData,
    clearAllData,
  } = useAppData({ isGuest, isAuthenticated, addNotification });

  // Derives goal progress from raw goals + tasks + habits — no extra state
  const computedGoals = useGoalProgress(goals, tasks, habits);

  // Track goal completions for notifications — must be in App because it needs computedGoals
  const prevCompletedGoalIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isAuthenticated) return;
    computedGoals.forEach((goal) => {
      if (goal.progress === 100 && !prevCompletedGoalIds.current.has(goal.id)) {
        addNotification(
          'Mission Transcendence',
          `Grand objective "${goal.title}" reached 100% mastery. Your discipline has reached a new plateau.`,
          'goal'
        );
      }
      if (goal.progress === 100) {
        prevCompletedGoalIds.current.add(goal.id);
      } else {
        prevCompletedGoalIds.current.delete(goal.id);
      }
    });
  }, [computedGoals, isAuthenticated, addNotification]);

  // ==================== HELPERS ====================

  /** Maps a raw API user object to our UserProfile shape. */
  const mapApiUserToProfile = useCallback((user: any): UserProfile => ({
    name: user.name,
    avatar: user.avatar || DEFAULT_PROFILE.avatar,
    bio: user.bio || DEFAULT_PROFILE.bio,
    email: user.email,
    joinDate: user.createdAt,
  }), []);

  // ==================== AUTO-LOGIN (on app mount) ====================
  useEffect(() => {
    const attemptAutoLogin = async () => {
      try {
        const user = await authApi.tryRefresh();
        if (user) {
          setIsAuthenticated(true);
          setIsGuest(false);
          setProfile(mapApiUserToProfile(user));
          await fetchAllData();
        }
      } catch (err) {
        console.error('[Auth] Auto-login failed:', err);
      } finally {
        setIsAppLoading(false);
      }
    };
    attemptAutoLogin();
  }, [fetchAllData, mapApiUserToProfile]);

  // ==================== AUTH HANDLERS ====================

  const handleLogin = useCallback(async (name: string, guestMode?: boolean) => {
    setIsAuthenticated(true);

    if (guestMode) {
      setIsGuest(true);
      setProfile((prev) => ({ ...prev, name: 'Guest Agent' }));
      clearAllData();
      return;
    }

    setIsGuest(false);
    await fetchAllData();

    try {
      const me = await profileApi.get();
      setProfile(mapApiUserToProfile(me));
    } catch {
      // Fallback: use the name provided by the login form
      setProfile((prev) => ({ ...prev, name }));
    }
  }, [fetchAllData, clearAllData, mapApiUserToProfile]);

  const handleLogout = useCallback(async () => {
    try {
      if (!isGuest) await authApi.logout();
    } catch { /* Ignore logout errors */ }

    setIsAuthenticated(false);
    setIsGuest(false);
    setProfile(DEFAULT_PROFILE as UserProfile);
    clearAllData();
    setNotifications([]);
  }, [isGuest, clearAllData, setNotifications]);

  const handleResetAllData = useCallback(async () => {
    const confirmed = window.confirm(
      'APAKAH ANDA YAKIN INGIN MENGHAPUS SELURUH DATA?\n(History, Goals, Task, dan Lagu Upload akan hilang permanen)'
    );
    if (!confirmed) return;

    localStorage.clear();
    indexedDB.deleteDatabase('summbix-music');

    if (!isGuest) {
      try { await profileApi.deleteAccount(); } catch { /* Ignore */ }
    }

    clearAllData();
    setNotifications([]);
    setProfile(DEFAULT_PROFILE as UserProfile);
    setIsAuthenticated(false);

    window.alert('Seluruh data telah dikosongkan!');
    window.location.reload();
  }, [isGuest, clearAllData, setNotifications]);

  const startFocus = useCallback((target: FocusTarget) => {
    setFocusTarget(target);
    setCurrentView('focus');
  }, []);

  // ==================== VIEW ROUTER ====================
  const renderView = () => {
    const sharedProps = {
      isGuest,
      onNavigate: setCurrentView,
      onStartFocus: startFocus,
    };

    switch (currentView) {
      case 'dashboard':
        return (
          <Overview
            {...sharedProps}
            goals={computedGoals} setGoals={setGoals}
            tasks={tasks} setTasks={setTasks}
            habits={habits} setHabits={setHabits}
            sessions={sessions} setSessions={setSessions}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView
            sessions={sessions} goals={computedGoals}
            tasks={tasks} habits={habits}
            isGuest={isGuest}
          />
        );
      case 'schedule':
        return (
          <ScheduleView
            tasks={tasks} habits={habits}
            sessions={sessions} goals={computedGoals}
          />
        );
      case 'goals':
        return (
          <GoalsView
            goals={computedGoals} setGoals={setGoals}
            tasks={tasks} habits={habits} sessions={sessions}
          />
        );
      case 'history':
        return <HistoryView tasks={tasks} sessions={sessions} goals={computedGoals} />;
      case 'habits':
        return (
          <HabitsView
            {...sharedProps}
            habits={habits} setHabits={setHabits}
            goals={computedGoals}
            sessions={sessions} setSessions={setSessions}
          />
        );
      case 'tasks':
        return (
          <TasksView
            {...sharedProps}
            tasks={tasks} setTasks={setTasks}
            goals={computedGoals}
            sessions={sessions} setSessions={setSessions}
          />
        );
      case 'profile':
        return (
          <ProfileView
            profile={profile}
            setProfile={setProfile}
            isGuest={isGuest}
            onLogout={handleLogout}
            onResetData={handleResetAllData}
          />
        );
      default:
        return null;
    }
  };

  // ==================== LOADING STATE ====================
  if (isAppLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-brand-bg">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full"
        />
      </div>
    );
  }

  // ==================== AUTH GATE ====================
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // ==================== MAIN APP ====================
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-brand-bg text-brand-text selection:bg-brand-primary/20 font-sans">

      {/* ===== TOAST NOTIFICATION ===== */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.85 }}
            animate={{ y: 20, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.85 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
          >
            <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-3xl p-5 shadow-2xl flex items-center gap-4">
              {/* Icon */}
              <div className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg',
                activeToast.type === 'task' ? 'bg-brand-blue text-white' :
                activeToast.type === 'goal' ? 'bg-brand-green text-white' :
                'bg-brand-primary text-white'
              )}>
                {activeToast.type === 'task' && <CheckCircle2 className="w-6 h-6" />}
                {activeToast.type === 'goal' && <Target className="w-6 h-6" />}
                {(activeToast.type === 'system' || activeToast.type === 'habit') && (
                  <Bell className="w-6 h-6" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-white text-xs font-black uppercase tracking-widest truncate">
                  {activeToast.title}
                </h4>
                <p className="text-white/60 text-[10px] font-bold truncate mt-1">
                  {activeToast.message}
                </p>
              </div>

              {/* Dismiss button */}
              <button
                onClick={dismissToast}
                aria-label="Dismiss notification"
                className="p-2 hover:bg-white/10 rounded-xl text-white/40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Auto-dismiss progress bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: TOAST_DISMISS_DURATION_S, ease: 'linear' }}
              onAnimationComplete={dismissToast}
              className="absolute bottom-0 left-6 right-6 h-1 bg-brand-primary rounded-full origin-left"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="flex h-full w-full relative">
        <Sidebar currentView={currentView} setView={setCurrentView} />

        <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto relative scrollbar-hide">
            <div className="max-w-[1600px] mx-auto px-4 md:px-10">

              <Header
                goals={computedGoals}
                tasks={tasks}
                notifications={notifications}
                onMarkRead={markNotificationAsRead}
                onNavigate={setCurrentView}
                profile={profile}
                onUpdateProfile={setProfile}
                onLogout={handleLogout}
              />

              {/* Decorative background — disabled on mobile for performance */}
              <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden hidden md:block">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 180, 270, 360] }}
                  transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                  className="absolute -top-[20%] -right-[10%] w-[80%] h-[80%] bg-brand-primary/5 blur-[120px] rounded-full"
                />
                <motion.div
                  animate={{ scale: [1.2, 1, 1.2], rotate: [360, 270, 180, 90, 0] }}
                  transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                  className="absolute -bottom-[20%] -left-[10%] w-[70%] h-[70%] bg-brand-blue/5 blur-[100px] rounded-full"
                />
              </div>
              <div className="absolute inset-0 bg-grain opacity-20 pointer-events-none" />

              {/* Page transition animations */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentView}
                  initial={{ opacity: 0, y: 20, scale: 0.98, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -20, scale: 0.98, filter: 'blur(10px)' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.8 }}
                  className="h-full pb-28 md:pb-20"
                >
                  {renderView()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      {/* ===== FOCUS MODE (Full-screen overlay) ===== */}
      <AnimatePresence>
        {currentView === 'focus' && (
          <div className="fixed inset-0 z-[9999]">
            <FocusView
              onExit={() => setCurrentView('dashboard')}
              goals={goals}
              sessions={sessions}
              setSessions={setSessions}
              focusTarget={focusTarget}
              tasks={tasks}
              setTasks={setTasks}
              habits={habits}
              setHabits={setHabits}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
