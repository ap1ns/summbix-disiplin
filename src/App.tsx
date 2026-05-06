/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { AppView, Goal, Task, Habit, FocusSession, Notification, UserProfile } from './types';
import { authApi, goalsApi, tasksApi, habitsApi, sessionsApi, notificationsApi, profileApi } from './lib/api';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [focusTarget, setFocusTarget] = useState<{ id: string, type: 'goal' | 'task' | 'habit', title: string, goalId?: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);

  const [profile, setProfile] = useState<UserProfile>({
    name: 'Summbix',
    avatar: 'Summbix',
    bio: 'Master of Discipline',
    email: '',
    joinDate: new Date().toISOString()
  });


  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);



  // ==================== FETCH ALL DATA FROM BACKEND ====================
  const fetchAllData = useCallback(async () => {
    try {
      const [goalsData, tasksData, habitsData, sessionsData, notifData] = await Promise.all([
        goalsApi.getAll(),
        tasksApi.getAll(),
        habitsApi.getAll(),
        sessionsApi.getAll(),
        notificationsApi.getAll(),
      ]);
      setGoals(goalsData);
      setTasks(tasksData);
      setHabits(habitsData);
      setSessions(sessionsData);
      setNotifications(notifData.map((n: any) => ({
        ...n,
        time: new Date(n.createdAt).toLocaleString(),
      })));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }, []);

  // ==================== AUTO-LOGIN (Try refresh token on app load) ====================
  useEffect(() => {
    const tryAutoLogin = async () => {
      try {
        const user = await authApi.tryRefresh();
        if (user) {
          setIsAuthenticated(true);
          setIsGuest(false);
          setProfile({
            name: user.name,
            avatar: user.avatar || 'Summbix',
            bio: user.bio || 'Master of Discipline',
            email: user.email,
            joinDate: user.createdAt,
          });

          await fetchAllData();
        }
      } catch (err) {
        console.error("Auto-login failed:", err);
      } finally {
        setIsAppLoading(false);
      }
    };
    tryAutoLogin();
  }, [fetchAllData]);

  // ==================== LOGIN HANDLER ====================
  const handleLogin = async (name: string, guestMode?: boolean) => {
    setIsAuthenticated(true);
    if (guestMode) {
      setIsGuest(true);
      setProfile(prev => ({ ...prev, name: 'Guest Agent' }));
      setGoals([]);
      setTasks([]);
      setHabits([]);
      setSessions([]);
    } else {
      setIsGuest(false);
      await fetchAllData();
      try {
        const me = await profileApi.get();
        setProfile({
          name: me.name,
          avatar: me.avatar || 'Summbix',
          bio: me.bio || 'Master of Discipline',
          email: me.email,
          joinDate: me.createdAt,
        });

      } catch {
        setProfile(prev => ({ ...prev, name }));
      }
    }
  };

  const handleLogout = async () => {
    try {
      if (!isGuest) await authApi.logout();
    } catch {}
    setIsAuthenticated(false);
    setIsGuest(false);
    setProfile({ name: '', avatar: 'Summbix', bio: 'Master of Discipline', joinDate: '' });
    setGoals([]);
    setTasks([]);
    setHabits([]);
    setSessions([]);
  };

  const startFocus = (target: { id: string, type: 'goal' | 'task' | 'habit', title: string, goalId?: string }) => {
    setFocusTarget(target);
    setCurrentView('focus');
  };

  // ==================== SYNC TO BACKEND (localStorage fallback for guest) ====================

  // For guest mode, keep localStorage sync
  useEffect(() => {
    if (isGuest) {
      localStorage.setItem('summbix-goals', JSON.stringify(goals));
    }
  }, [goals, isGuest]);
  useEffect(() => {
    if (isGuest) {
      localStorage.setItem('summbix-tasks', JSON.stringify(tasks));
    }
  }, [tasks, isGuest]);
  useEffect(() => {
    if (isGuest) {
      localStorage.setItem('summbix-habits', JSON.stringify(habits));
    }
  }, [habits, isGuest]);
  useEffect(() => {
    if (isGuest) {
      localStorage.setItem('summbix-sessions', JSON.stringify(sessions));
    }
  }, [sessions, isGuest]);

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (!isGuest) {
      try { await notificationsApi.markRead(id); } catch {}
    }
  };

  // Clean up tasks older than 30 days
  useEffect(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    setTasks(prevTasks => {
      const activeTasks = prevTasks.filter(t => {
        if (!t.date) return true;
        const taskDate = new Date(t.date);
        return taskDate.getTime() > thirtyDaysAgo.getTime();
      });
      if (activeTasks.length !== prevTasks.length) return activeTasks;
      return prevTasks;
    });
  }, []);

  // 🗑️ RESET ALL DATA FUNCTION
  const handleResetAllData = async () => {
    if (confirm('APAKAH ANDA YAKIN INGIN MENGHAPUS SELURUH DATA? (History, Goals, Task, dan Lagu Upload akan hilang permanen)')) {
      localStorage.clear();
      indexedDB.deleteDatabase('summbix-music');
      
      if (!isGuest) {
        try { await profileApi.deleteAccount(); } catch {}
      }

      setGoals([]);
      setTasks([]);
      setHabits([]);
      setSessions([]);
      setNotifications([]);
      setProfile({
        name: 'Summbix',
        avatar: 'Summbix',
        bio: 'Master of Discipline',
        joinDate: new Date().toISOString()
      });
      
      setIsAuthenticated(false);
      alert('Seluruh data telah dikosongkan!');
      window.location.reload();
    }
  };

  const computedGoals = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const todayStr = today.toISOString().split('T')[0];

    return goals.map(g => {
      const start = new Date(g.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(g.deadline);
      end.setHours(0, 0, 0, 0);
      
      const startTime = start.getTime();
      const endTime = end.getTime();
      
      // Calculate total days (inclusive)
      const totalDays = Math.max(1, Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24)) + 1);
      const dailyQuota = 100 / totalDays;
      
      let earnedProgress = 0;
      
      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(startTime + i * 24 * 60 * 60 * 1000);
        const currentDateStr = currentDate.toISOString().split('T')[0];
        
        const dayTasks = tasks.filter(t => 
          t.goalId === g.id && 
          (t.date === currentDateStr || (!t.date && currentDateStr === g.deadline))
        );
        const dayHabits = habits.filter(h => h.goalId === g.id);
        
        const totalItems = dayTasks.length + dayHabits.length;
        
        if (totalItems === 0) {
          if (currentDate.getTime() <= todayTime) {
            earnedProgress += dailyQuota;
          }
        } else {
          const completedTasks = dayTasks.filter(t => t.completed).length;
          const completedHabits = dayHabits.filter(h => (h.completedDates || []).includes(currentDateStr)).length;
          
          earnedProgress += ((completedTasks + completedHabits) / totalItems) * dailyQuota;
        }
      }
      
      return { ...g, progress: Math.min(100, Math.round(earnedProgress)) };
    });
  }, [goals, tasks, habits]);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Overview goals={computedGoals} setGoals={setGoals} tasks={tasks} setTasks={setTasks} habits={habits} setHabits={setHabits} sessions={sessions} setSessions={setSessions} onStartFocus={startFocus} onNavigate={setCurrentView} isGuest={isGuest} />;
      case 'analytics':
        return <AnalyticsView sessions={sessions} goals={computedGoals} tasks={tasks} habits={habits} isGuest={isGuest} />;
      case 'schedule':
        return <ScheduleView tasks={tasks} habits={habits} sessions={sessions} goals={computedGoals} />;
      case 'goals':
        return <GoalsView goals={computedGoals} setGoals={setGoals} tasks={tasks} habits={habits} sessions={sessions} />;
      case 'history':
        return <HistoryView tasks={tasks} sessions={sessions} goals={computedGoals} />;
      case 'habits':
        return <HabitsView habits={habits} setHabits={setHabits} goals={computedGoals} sessions={sessions} setSessions={setSessions} onStartFocus={startFocus} onNavigate={setCurrentView} isGuest={isGuest} />;
      case 'tasks':
        return <TasksView tasks={tasks} setTasks={setTasks} goals={computedGoals} sessions={sessions} setSessions={setSessions} onStartFocus={startFocus} onNavigate={setCurrentView} isGuest={isGuest} />;
      case 'profile':
        return <ProfileView 
          profile={profile} 
          setProfile={setProfile} 
          isGuest={isGuest} 
          onLogout={handleLogout}
        />;
      default:
        return <Overview goals={computedGoals} setGoals={setGoals} tasks={tasks} setTasks={setTasks} habits={habits} setHabits={setHabits} sessions={sessions} setSessions={setSessions} onStartFocus={startFocus} onNavigate={setCurrentView} isGuest={isGuest} />;
    }
  };

  // Show loading spinner while checking auth
  if (isAppLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-brand-bg">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-brand-bg text-brand-text selection:bg-brand-primary/20 font-sans">
      {/* Main Application Layout */}
      <div className="flex h-full w-full relative">
        <Sidebar currentView={currentView} setView={setCurrentView} />
        
        <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto relative scrollbar-hide">
            <div className="max-w-[1600px] mx-auto px-10">
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

              {/* Background Decorative Elements */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/5 blur-[120px] rounded-full pointer-events-none -z-10" />
              <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-orange/5 blur-[100px] rounded-full pointer-events-none -z-10" />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentView}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="h-full pb-20"
                >
                  {renderView()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      {/* Focus Mode Overlay (Fixed) */}
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
