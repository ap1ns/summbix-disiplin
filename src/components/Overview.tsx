import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Clock, Flame, ChevronRight, Play, Plus, Target, Quote, X, Calendar, Pencil, Trash2 } from 'lucide-react';
import { MOCK_GOALS, MOCK_TASKS, MOCK_TIME_BLOCKS } from '../data';
import { cn } from '../lib/utils';
import { Goal, Task, TimeBlock, Habit, FocusSession, AppView } from '../types';
import { goalsApi, tasksApi, habitsApi, sessionsApi } from '../lib/api';
import CustomSelect from './CustomSelect';
import ConfirmationModal from './ConfirmationModal';
import Portal from './Portal';

interface OverviewProps {
  goals: Goal[];
  setGoals: (g: Goal[]) => void;
  tasks: Task[];
  setTasks: (t: Task[]) => void;
  habits: Habit[];
  setHabits: (h: Habit[]) => void;
  sessions: FocusSession[];
  setSessions: (s: FocusSession[]) => void;
  onStartFocus: (target: { id: string, type: 'goal' | 'task' | 'habit', title: string, goalId?: string }) => void;
  onNavigate?: (view: AppView) => void;
  isGuest?: boolean;
}

export default function Overview({ goals, setGoals, tasks, setTasks, habits, setHabits, sessions, setSessions, onStartFocus, onNavigate, isGuest }: OverviewProps) {

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [resetModal, setResetModal] = useState<{ isOpen: boolean, type: 'task' | 'habit', id: string } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000); // update every 30s for time-window checks
    return () => clearInterval(timer);
  }, []);



  const computedTimeBlocks = useMemo(() => {
    const nowHour = currentTime.getHours();
    const nowMin = currentTime.getMinutes();
    const nowTimeStr = `${nowHour.toString().padStart(2, '0')}:${nowMin.toString().padStart(2, '0')}`;
    const nowDateStr = `${currentTime.getFullYear()}-${(currentTime.getMonth() + 1).toString().padStart(2, '0')}-${currentTime.getDate().toString().padStart(2, '0')}`;

    const combinedBlocks: TimeBlock[] = [];

    tasks.forEach(t => {
      // 1. Must have time defined
      if (!t.startTime || !t.endTime) return;

      // 2. If task has a specific date, it must be today
      if (t.date && t.date !== nowDateStr) return;

      // 3. If task belongs to a goal, today must be within the goal's active window
      if (t.goalId) {
        const goal = goals.find(g => g.id === t.goalId);
        if (goal) {
          if (nowDateStr < goal.startDate || nowDateStr > goal.deadline) return;
        }
      }

      combinedBlocks.push({
        id: `tb-t-${t.id}`,
        title: t.title,
        startTime: t.startTime,
        endTime: t.endTime,
        status: 'upcoming',
        goalId: t.goalId
      });
    });

    habits.forEach(h => {
      const habitDate = (h as any).date;
      const startTime = (h as any).startTime;
      const endTime = (h as any).endTime;

      // 1. Must have time defined
      if (!startTime || !endTime) return;

      // 2. If habit has a specific date, it must be today
      if (habitDate && habitDate !== nowDateStr) return;

      // 3. If habit belongs to a goal, today must be within the goal's active window
      if (h.goalId) {
        const goal = goals.find(g => g.id === h.goalId);
        if (goal) {
          if (nowDateStr < goal.startDate || nowDateStr > goal.deadline) return;
        }
      }

      combinedBlocks.push({
        id: `tb-h-${h.id}`,
        title: h.label,
        startTime: startTime,
        endTime: endTime,
        status: 'upcoming',
        goalId: h.goalId
      });
    });

    combinedBlocks.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return combinedBlocks.map(block => {
      let status: 'completed' | 'active' | 'upcoming' | 'missed' = 'upcoming';
      if (nowTimeStr >= block.startTime && nowTimeStr <= block.endTime) {
        status = 'active';
      } else if (nowTimeStr > block.endTime) {
        status = 'completed';
      } else {
        status = 'upcoming';
      }
      return { ...block, status };
    });
  }, [currentTime, tasks, habits, goals]);

  const scheduleTimeRange = useMemo(() => {
    if (computedTimeBlocks.length === 0) return '00:00 — 00:00';
    const sortedByStart = [...computedTimeBlocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const sortedByEnd = [...computedTimeBlocks].sort((a, b) => a.endTime.localeCompare(b.endTime));
    return `${sortedByStart[0].startTime} — ${sortedByEnd[sortedByEnd.length - 1].endTime}`;
  }, [computedTimeBlocks]);

  const currentDayName = currentTime.toLocaleDateString('en-US', { weekday: 'long' });

  const nowHour = currentTime.getHours();
  const nowMin = currentTime.getMinutes();
  const nowTimeStr = `${nowHour.toString().padStart(2, '0')}:${nowMin.toString().padStart(2, '0')}`;
  const nowDateStrLocal = `${currentTime.getFullYear()}-${(currentTime.getMonth() + 1).toString().padStart(2, '0')}-${currentTime.getDate().toString().padStart(2, '0')}`;

  // Returns the time status: 'active' | 'locked' | 'expired'
  // - 'locked': before startTime - 1 minute, or future date
  // - 'active': within the time window (startTime-1min to endTime)
  // - 'expired': after endTime has passed
  const getHabitTimeStatus = (itemDate?: string, itemStartTime?: string, itemEndTime?: string): 'active' | 'locked' | 'expired' => {
    // Future date → locked
    if (itemDate && itemDate > nowDateStrLocal) return 'locked';
    // Past date → expired
    if (itemDate && itemDate < nowDateStrLocal) return 'expired';

    // No time constraints → always active
    if (!itemStartTime || !itemEndTime) return 'active';

    // Subtract 1 minute from start time for early unlock
    const [sh, sm] = itemStartTime.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const earlyUnlockMinutes = Math.max(0, startMinutes - 1);

    const [eh, em] = itemEndTime.split(':').map(Number);
    const endMinutes = eh * 60 + em;

    const nowMinutes = nowHour * 60 + nowMin;

    if (nowMinutes > endMinutes) return 'expired';
    if (nowMinutes < earlyUnlockMinutes) return 'locked';
    return 'active';
  };

  // Backward-compatible wrapper for tasks (they only need locked/not-locked)
  const isLocked = (itemDate?: string, itemStartTime?: string) => {
    if (itemDate && itemDate > nowDateStrLocal) return true;
    return false;
  };

  const isTaskArchived = (task: Task) => {
    // If completed, only archive if it was for a previous day
    if (task.completed) {
      if (task.date && task.date < nowDateStrLocal) return true;
      return false; // Keep today's completed tasks
    }
    
    // If not completed, check if it's past its deadline (expired)
    if (task.date) {
      const taskDate = new Date(task.date);
      if (task.endTime) {
         const [h, m] = task.endTime.split(':').map(Number);
         taskDate.setHours(h, m, 0, 0);
      } else {
         taskDate.setHours(23, 59, 59, 999);
      }
      if (currentTime.getTime() > taskDate.getTime()) {
         return true;
      }
    }
    return false;
  };

  const isHabitDoneToday = (h: Habit) => h.completedDates?.includes(nowDateStrLocal) || false;

  const totalDailyItems = tasks.filter(t => !isTaskArchived(t)).length + habits.length;
  const completedDailyItems = tasks.filter(t => !isTaskArchived(t) && t.completed).length + habits.filter(isHabitDoneToday).length;
  const dailyProgressPercent = totalDailyItems > 0 ? Math.round((completedDailyItems / totalDailyItems) * 100) : 0;

  const activeTasks = tasks.filter(t => !isTaskArchived(t));

  const sortedTasks = [...activeTasks].sort((a, b) => {
    // 1. Completed tasks always go to the bottom
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;

    // 2. Today's tasks first
    const isAToday = !a.date || a.date === nowDateStrLocal;
    const isBToday = !b.date || b.date === nowDateStrLocal;
    if (isAToday && !isBToday) return -1;
    if (!isAToday && isBToday) return 1;

    // 3. Sort by date
    if (a.date !== b.date) {
      if (!a.date) return -1;
      if (!b.date) return 1;
      return a.date.localeCompare(b.date);
    }

    // 4. Sort by time
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
    return 0;
  });

  const sortedHabitsList = [...habits].sort((a, b) => {
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return 0;
  });

  const displayedTasks = useMemo(() => {
    const filtered = selectedGoalId ? sortedTasks.filter(t => t.goalId === selectedGoalId) : sortedTasks.filter(t => !t.goalId);
    return filtered.filter(t => {
      if (t.goalId) {
        const goal = goals.find(g => g.id === t.goalId);
        if (goal) {
          return nowDateStrLocal >= goal.startDate && nowDateStrLocal <= goal.deadline;
        }
      }
      // Only show today's tasks if they have a date (sortedTasks already mostly handles this)
      return !t.date || t.date === nowDateStrLocal;
    });
  }, [sortedTasks, selectedGoalId, goals, nowDateStrLocal]);

  const displayedHabits = useMemo(() => {
    const filtered = selectedGoalId ? sortedHabitsList.filter(h => h.goalId === selectedGoalId) : sortedHabitsList.filter(h => !h.goalId);
    return filtered.filter(h => {
      if (h.goalId) {
        const goal = goals.find(g => g.id === h.goalId);
        if (goal) {
          return nowDateStrLocal >= goal.startDate && nowDateStrLocal <= goal.deadline;
        }
      }
      // Only show today's habits if they have a date
      return !h.date || h.date === nowDateStrLocal;
    });
  }, [sortedHabitsList, selectedGoalId, goals, nowDateStrLocal]);

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.completed) {
      setResetModal({ isOpen: true, type: 'task', id: taskId });
      return;
    }
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
    if (!isGuest) { try { await tasksApi.toggle(taskId); } catch {} }
  };

  const toggleHabit = async (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    // Enforce time window
    const status = getHabitTimeStatus(habit.date, habit.startTime, habit.endTime);
    if (status === 'locked') {
      showToast('This ritual is not yet available. It unlocks 1 minute before start time.');
      return;
    }
    if (status === 'expired') {
      showToast('This ritual\'s time window has ended.');
      return;
    }

    if (isHabitDoneToday(habit)) {
      setResetModal({ isOpen: true, type: 'habit', id: habitId });
      return;
    }
    setHabits(habits.map(h => {
      if (h.id === habitId) {
        const dates = h.completedDates || [];
        const isDone = dates.includes(nowDateStrLocal);
        return {
          ...h,
          completedDates: isDone ? dates.filter(d => d !== nowDateStrLocal) : [...dates, nowDateStrLocal]
        };
      }
      return h;
    }));
    if (!isGuest) { try { await habitsApi.toggle(habitId, nowDateStrLocal); } catch {} }
  };

  const confirmReset = async () => {
    if (!resetModal) return;
    if (resetModal.type === 'task') {
      setTasks(tasks.map(t => t.id === resetModal.id ? { ...t, completed: false } : t));
      setSessions(sessions.filter(s => s.taskId !== resetModal.id));
      if (!isGuest) {
        try {
          await tasksApi.update(resetModal.id, { completed: false });
          await sessionsApi.removeByTask(resetModal.id);
        } catch {}
      }
    } else {
      setHabits(habits.map(h => {
        if (h.id === resetModal.id) {
          const dates = h.completedDates || [];
          return { ...h, completedDates: dates.filter(d => d !== nowDateStrLocal) };
        }
        return h;
      }));
      setSessions(sessions.filter(s => {
        if (s.habitId === resetModal.id) {
          return s.date !== nowDateStrLocal;
        }
        return true;
      }));
      if (!isGuest) {
        try {
          await habitsApi.toggle(resetModal.id, nowDateStrLocal);
          await sessionsApi.removeByHabit(resetModal.id, nowDateStrLocal);
        } catch {}
      }
    }
    setResetModal(null);
  };

  const handleAddHabit = async (label: string, goalId: string, startTime?: string, endTime?: string) => {
    if (editingHabit) {
      setHabits(habits.map(h => h.id === editingHabit.id ? { ...h, label, goalId, startTime, endTime } as any : h));
      if (!isGuest) { try { await habitsApi.update(editingHabit.id, { label, goalId: goalId || null, startTime, endTime }); } catch {} }
      setEditingHabit(null);
    } else {
      if (isGuest && habits.length >= 2) {
        showToast("Guest Limit: Maximum 2 Habits allowed.");
        return;
      }
      if (!isGuest) {
        try {
          const created = await habitsApi.create({ label, goalId: goalId || undefined, startTime, endTime });
          setHabits([...habits, created]);
        } catch (e: any) { showToast(e.message); return; }
      } else {
        setHabits([...habits, { id: `h${Date.now()}`, label, done: false, goalId, startTime, endTime, completedDates: [] } as any]);
      }
    }
    setIsHabitModalOpen(false);
  };

  const handleAddTask = async (title: string, goalId: string, priority: 'low' | 'medium' | 'high', startTime?: string, endTime?: string, date?: string) => {
    if (editingTask) {
      setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, title, goalId, priority, startTime, endTime, date } : t));
      if (!isGuest) { try { await tasksApi.update(editingTask.id, { title, goalId: goalId || null, priority, startTime, endTime, date }); } catch {} }
      setEditingTask(null);
    } else {
      if (isGuest && tasks.length >= 2) {
        showToast("Guest Limit: Maximum 2 Tasks allowed.");
        return;
      }
      if (!isGuest) {
        try {
          const created = await tasksApi.create({ title, goalId: goalId || undefined, priority, startTime, endTime, date });
          setTasks([...tasks, created]);
        } catch (e: any) { showToast(e.message); return; }
      } else {
        setTasks([...tasks, { id: `t${Date.now()}`, title, goalId, completed: false, priority, startTime, endTime, date }]);
      }
    }
    setIsTaskModalOpen(false);
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    if (!isGuest) { try { await tasksApi.remove(id); } catch {} }
  };
  const handleDeleteHabit = async (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
    if (!isGuest) { try { await habitsApi.remove(id); } catch {} }
  };

  const handleAddGoal = async (title: string, description: string, deadline: string, color: string, startDate: string) => {
    if (editingGoal) {
      setGoals(goals.map(g => g.id === editingGoal.id ? { ...g, title, description, deadline, color } : g));
      if (!isGuest) { try { await goalsApi.update(editingGoal.id, { title, description, deadline, color }); } catch {} }
      setEditingGoal(null);
    } else {
      if (isGuest && goals.length >= 1) {
        showToast("Guest Limit: Maximum 1 Goal allowed.");
        return;
      }
      if (!isGuest) {
        try {
          const created = await goalsApi.create({ title, description, deadline, color, startDate });
          setGoals([...goals, created]);
        } catch (e: any) { showToast(e.message); return; }
      } else {
        setGoals([...goals, { id: `g${Date.now()}`, title, description, progress: 0, startDate, deadline, color }]);
      }
    }
    setIsGoalModalOpen(false);
  };

  const handleDeleteGoal = async (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
    if (selectedGoalId === id) setSelectedGoalId(null);
    if (!isGuest) { try { await goalsApi.remove(id); } catch {} }
  };

  const todaySessions = sessions.filter(s => {
    const sDate = new Date(s.date);
    return sDate.getDate() === currentTime.getDate() && sDate.getMonth() === currentTime.getMonth() && sDate.getFullYear() === currentTime.getFullYear();
  });
  const focusSecondsToday = todaySessions.reduce((acc, s) => acc + s.duration, 0);
  const focusHours = Math.floor(focusSecondsToday / 3600);
  const focusMins = Math.floor((focusSecondsToday % 3600) / 60);

  // Simple streak calculation
  let currentStreak = 0;
  let checkDate = new Date(currentTime);
  checkDate.setHours(0, 0, 0, 0);
  while (true) {
    const hasSession = sessions.some(s => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === checkDate.getTime();
    });
    if (hasSession) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return (
    <div className="w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 relative pt-4">
      {/* Decorative Blob Backgrounds - Hidden on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-primary/5 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ x: [0, -80, 0], y: [0, 100, 0] }}
          transition={{ duration: 25, repeat: Infinity }}
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-blue/5 blur-[100px] rounded-full" 
        />
      </div>

      {/* Left Column - Main Stats & Goals */}
      <div className="lg:col-span-8 space-y-8 md:space-y-10 relative z-10">
        
        {/* Daily Stats Summary */}
        <section className="grid grid-cols-3 gap-3 md:gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <StatCard 
              label="Focus Hours" 
              value={`${focusHours}h ${focusMins}m`} 
              sub={focusSecondsToday > 0 ? "Active today" : "No focus yet"} 
              icon={<Clock className="w-5 h-5 text-brand-orange" />}
              color="orange"
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <StatCard 
              label="Daily Progress" 
              value={`${dailyProgressPercent}%`} 
              sub={`${completedDailyItems} of ${totalDailyItems} tasks & habits done`} 
              icon={<CheckCircle2 className="w-5 h-5 text-brand-green" />}
              color="green"
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <StatCard 
              label="Current Streak" 
              value={`${currentStreak} Days`} 
              sub={`Personal best: ${currentStreak > 0 ? currentStreak : 0}`} 
              icon={<Flame className="w-5 h-5 text-brand-red" />}
              color="red"
            />
          </motion.div>
        </section>

        {/* Goals Section */}
        <section>
          <div className="flex items-end justify-between mb-6 md:mb-8">
            <div>
              <h3 className="text-xl md:text-3xl font-black tracking-tight flex items-center gap-3 md:gap-4 text-brand-text">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 md:w-6 md:h-6 text-brand-primary" />
                </div>
                Active Goals
              </h3>
              <p className="text-xs text-brand-text-light font-medium mt-1 md:mt-2 px-11 md:px-14 hidden md:block">Your main objectives for this season</p>
            </div>
            <motion.button 
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate?.('goals')} 
              className="group flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-white border border-brand-primary/5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black text-brand-text-light hover:text-brand-primary hover:border-brand-primary/20 transition-all uppercase tracking-[0.15em] md:tracking-[0.2em] shadow-sm hover:shadow-md shrink-0"
            >
              <span className="hidden md:inline">Explore Missions</span>
              <span className="md:hidden">More</span>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </motion.button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.slice(0, 3).map((goal, idx) => (
              <motion.div 
                key={goal.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + (idx * 0.1) }}
              >
                <GoalCard 
                  goal={goal} 
                  isSelected={selectedGoalId === goal.id}
                  onSelect={(id) => setSelectedGoalId(selectedGoalId === id ? null : id)}
                  onEdit={() => { setEditingGoal(goal); setIsGoalModalOpen(true); }}
                  onDelete={() => handleDeleteGoal(goal.id)}
                />
              </motion.div>
            ))}
            <motion.button 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              onClick={() => setIsGoalModalOpen(true)}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-brand-primary/20 rounded-[2rem] hover:border-brand-primary/40 hover:bg-white transition-all group min-h-[180px] shadow-sm"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-bg border border-brand-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-brand-primary/10 group-hover:text-brand-primary group-hover:border-brand-primary/30 transition-all">
                <Plus className="w-7 h-7 text-brand-text-light group-hover:text-brand-primary" />
              </div>
              <span className="text-[10px] font-black text-brand-text-light group-hover:text-brand-text uppercase tracking-[0.2em]">Launch New Mission</span>
            </motion.button>
          </div>
        </section>

        {/* Tasks Section */}
        <section>
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div>
              <h3 className="text-xl md:text-3xl font-black tracking-tight flex items-center gap-3 md:gap-4 text-brand-text">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-brand-primary/10 flex items-center justify-center">
                  <Target className="w-4 h-4 md:w-6 md:h-6 text-brand-primary" />
                </div>
                {selectedGoalId ? "Mission Tasks" : "Daily Missions"}
              </h3>
              <p className="text-xs text-brand-text-light font-medium mt-1 md:mt-2 px-11 md:px-14 hidden md:block">
                {selectedGoalId ? `Objectives for ${goals.find(g => g.id === selectedGoalId)?.title}` : "Your primary objectives for today"}
              </p>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <button 
                onClick={() => setIsTaskModalOpen(true)}
                className="px-4 md:px-6 py-2.5 md:py-3 text-[9px] md:text-[10px] font-black bg-brand-primary text-white rounded-xl md:rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20 uppercase tracking-[0.15em] md:tracking-[0.2em]"
              >
                New Task
              </button>
              <motion.button 
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigate?.('schedule')} 
                className="group hidden md:flex items-center gap-2 px-6 py-3 bg-white border border-brand-primary/5 rounded-2xl text-[10px] font-black text-brand-text-light hover:text-brand-primary hover:border-brand-primary/20 transition-all uppercase tracking-[0.2em] shadow-sm hover:shadow-md"
              >
                Schedule
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </div>
          </div>
          <div className="bg-white border border-brand-primary/10 rounded-[1.8rem] md:rounded-[2.5rem] overflow-hidden shadow-xl">
            <div className="max-h-[360px] overflow-y-auto scrollbar-hide">
              {displayedTasks.map((task, idx) => {
              const taskSessions = sessions.filter(s => s.taskId === task.id);
              const totalTaskSeconds = taskSessions.reduce((acc, s) => acc + s.duration, 0);
              const taskHours = Math.floor(totalTaskSeconds / 3600);
              const taskMins = Math.floor((totalTaskSeconds % 3600) / 60);
              const goal = goals.find(g => g.id === task.goalId);

              return (
                <motion.div 
                  key={task.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ x: 8, backgroundColor: "var(--color-brand-primary-5)" }}
                  style={{ 
                    "--color-brand-primary-5": "rgba(227, 133, 101, 0.05)",
                    borderLeft: goal ? `4px solid ${goal.color}` : 'none'
                  } as React.CSSProperties}
                  className={cn(
                    "p-5 flex items-center gap-5 transition-all group relative",
                    idx !== displayedTasks.length - 1 && "border-b border-brand-primary/5",
                    task.date && task.date !== nowDateStrLocal && "opacity-60",
                    !isLocked(task.date, task.startTime) ? "cursor-pointer" : "bg-brand-bg/10 cursor-not-allowed"
                  )}
                >
                  <button 
                    onClick={() => !isLocked(task.date, task.startTime) && toggleTask(task.id)}
                    className={cn("flex-shrink-0 transition-transform active:scale-90", isLocked(task.date, task.startTime) && "cursor-not-allowed")}
                    disabled={isLocked(task.date, task.startTime)}
                  >
                    {task.completed ? (
                      <div className="w-7 h-7 bg-brand-green rounded-xl flex items-center justify-center shadow-lg shadow-brand-green/20">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-xl border-2 border-brand-primary/20 bg-white group-hover:border-brand-primary/50 transition-all shadow-sm flex items-center justify-center">
                         <div className="w-2 h-2 rounded-full bg-brand-primary/0 group-hover:bg-brand-primary/20 transition-all" />
                      </div>
                    )}
                  </button>
                  
                  <div 
                    className="flex-1 min-w-0" 
                    onClick={() => !isLocked(task.date, task.startTime) && toggleTask(task.id)}
                  >
                    <p className={cn("text-base font-bold transition-all truncate", task.completed ? "text-brand-text-light line-through opacity-50" : "text-brand-text")}>
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      {goal ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedGoalId(selectedGoalId === task.goalId ? null : task.goalId); }}
                          className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg flex items-center gap-1.5 border hover:opacity-80 transition-all"
                          style={{ backgroundColor: `${goal.color}10`, color: goal.color, borderColor: `${goal.color}20` }}
                        >
                          <Target className="w-3 h-3" />
                          {goal.title}
                        </button>
                      ) : (
                        <span className="text-[9px] font-black text-brand-text-light uppercase tracking-widest bg-brand-bg px-2.5 py-1 rounded-lg border border-brand-primary/5">
                          General Task
                        </span>
                      )}
                      {totalTaskSeconds > 0 && (
                        <span className="text-[9px] font-black text-brand-orange uppercase tracking-widest flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {taskHours > 0 ? `${taskHours}h ` : ''}{taskMins}m
                        </span>
                      )}
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm border",
                        task.priority === 'high' ? "bg-brand-red text-white border-brand-red shadow-brand-red/20" : 
                        task.priority === 'medium' ? "bg-brand-orange text-white border-brand-orange shadow-brand-orange/20" : 
                        "bg-brand-primary text-white border-brand-primary shadow-brand-primary/20"
                      )}>
                        {task.priority}
                      </span>
                      {task.date && task.date !== nowDateStrLocal && (
                        <span className="text-[9px] font-black text-brand-orange uppercase tracking-widest bg-brand-orange/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-brand-orange/10">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {task.startTime && task.endTime && (
                        <span className="text-[9px] text-brand-text-light font-black uppercase tracking-widest flex items-center gap-1.5 bg-brand-bg px-2.5 py-1 rounded-lg border border-brand-primary/5">
                          <Clock className="w-3 h-3" />
                          <span>{task.startTime} - {task.endTime}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all md:translate-x-4 md:group-hover:translate-x-0 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setEditingTask(task); setIsTaskModalOpen(true); }} className="p-3 bg-white border border-brand-primary/5 hover:border-brand-primary/20 rounded-2xl text-brand-text-light hover:text-brand-primary transition-all shadow-sm">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="p-3 bg-white border border-brand-primary/5 hover:border-brand-primary/20 rounded-2xl text-brand-red transition-all shadow-sm">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {!isLocked(task.date, task.startTime) && !task.completed && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onStartFocus({ id: task.id, type: 'task', title: task.title, goalId: task.goalId }); }}
                        className="p-3 bg-brand-primary text-white rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
              {displayedTasks.length > 3 && (
                <div className="p-4 text-center border-t border-brand-primary/5 bg-brand-bg/10">
                  <p className="text-[8px] font-black text-brand-text-light uppercase tracking-widest">Scroll to see {displayedTasks.length - 3} more missions</p>
                </div>
              )}
              {displayedTasks.length === 0 && (
                <div className="p-12 text-center text-brand-text-light/50 font-black uppercase tracking-widest text-[10px]">No missions pending</div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Right Column - Schedule & Habit Tracker */}
      <div className="lg:col-span-4 space-y-6 md:space-y-8">
        
        {/* Timeline / Time Blocking */}
        <section className="bg-white border border-brand-primary/10 rounded-[1.8rem] md:rounded-[2.5rem] p-5 md:p-8 flex flex-col h-[450px] md:h-[600px] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl rounded-full" />
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h3 className="font-black text-lg text-brand-text flex items-center gap-3">
              <Clock className="w-5 h-5 text-brand-primary" />
              {currentDayName}'s Loop
            </h3>
            <span className="text-[10px] font-black text-brand-text-light uppercase tracking-widest bg-brand-bg px-3 py-1.5 rounded-xl border border-brand-primary/5">{scheduleTimeRange}</span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-hide relative pr-2">
            {computedTimeBlocks.length > 0 ? (
              <div className="space-y-4">
                {computedTimeBlocks.map((block) => (
                  <TimelineBlock key={block.id} block={block} goals={goals} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-brand-text-light/30">
                <div className="w-20 h-20 rounded-[2rem] bg-brand-bg flex items-center justify-center mb-6">
                  <Clock className="w-10 h-10" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Temporal Void</p>
                <p className="text-[10px] font-medium text-center mt-3 max-w-[180px] uppercase tracking-widest leading-relaxed">Your time is currently unstructured. Add schedules to begin.</p>
              </div>
            )}
          </div>
        </section>

        {/* Discipline Tracker / Habits */}
        <section className="bg-white border border-brand-primary/10 rounded-[1.8rem] md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-orange/5 blur-3xl rounded-full" />
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h3 className="font-black text-lg text-brand-text flex items-center gap-3">
                <Flame className="w-5 h-5 text-brand-orange" />
                {selectedGoalId ? "Mission Rituals" : "Core Rituals"}
              </h3>
              <p className="text-[9px] text-brand-text-light font-black uppercase tracking-widest mt-1">
                {selectedGoalId ? "Specific focus habits" : "Daily baseline discipline"}
              </p>
            </div>
            <button 
              onClick={() => setIsHabitModalOpen(true)}
              className={cn("px-4 py-2 text-[10px] font-black rounded-xl border transition-all uppercase tracking-widest shadow-sm bg-brand-primary text-white border-brand-primary hover:opacity-90 shadow-brand-primary/20")}
            >
              Add
            </button>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto scrollbar-hide pr-1">
            {displayedHabits.map(habit => {
              const habitSessions = sessions.filter(s => s.habitId === habit.id);
              const todaySessions = habitSessions.filter(s => s.date === nowDateStrLocal);
              const totalHabitSecondsToday = todaySessions.reduce((acc, s) => acc + s.duration, 0);
              const goal = goals.find(g => g.id === habit.goalId);
              const timeStatus = getHabitTimeStatus(habit.date, habit.startTime, habit.endTime);
              
              return (
                <HabitItem 
                  key={habit.id} 
                  label={habit.label} 
                  done={isHabitDoneToday(habit)} 
                  startTime={habit.startTime}
                  endTime={habit.endTime}
                  date={habit.date}
                  timeStatus={timeStatus}
                  onClick={() => toggleHabit(habit.id)} 
                  onEdit={() => { setEditingHabit(habit); setIsHabitModalOpen(true); }}
                  onDelete={() => handleDeleteHabit(habit.id)}
                  onPlay={() => {
                    if (timeStatus !== 'active') {
                      showToast(timeStatus === 'locked' ? 'This ritual has not started yet.' : 'This ritual\'s time window has ended.');
                      return;
                    }
                    onStartFocus({ id: habit.id, type: 'habit', title: habit.label, goalId: habit.goalId });
                  }}
                  goalTitle={goal?.title}
                  goalColor={goal?.color}
                  onGoalClick={() => setSelectedGoalId(selectedGoalId === habit.goalId ? null : (habit.goalId || null))}
                  totalSeconds={totalHabitSecondsToday}
                />
              );
            })}
            {displayedHabits.length === 0 && (
              <div className="py-10 text-center border-2 border-dashed border-brand-primary/5 rounded-[2rem]">
                <p className="text-[9px] font-black text-brand-text-light/30 uppercase tracking-widest">No rituals active</p>
              </div>
            )}
          </div>
        </section>

        {/* Daily Motivation */}
        <section className="bg-brand-bg border border-brand-primary/10 rounded-[2.5rem] p-8 relative overflow-hidden shadow-xl">
          <Quote className="absolute -top-6 -right-6 w-32 h-32 text-brand-primary/5 rotate-12" />
          <p className="text-brand-text italic text-lg relative z-10 leading-relaxed font-medium">
            "Discipline is the bridge between goals and accomplishment."
          </p>
          <div className="mt-6 flex items-center gap-3 relative z-10">
            <div className="w-10 h-1.5 bg-brand-primary rounded-full shadow-lg shadow-brand-primary/20" />
            <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em]">Jim Rohn</span>
          </div>
        </section>
      </div>

      <GoalModal isOpen={isGoalModalOpen} onClose={() => { setIsGoalModalOpen(false); setEditingGoal(null); }} onAdd={handleAddGoal} initialGoal={editingGoal} />
      <TaskModal isOpen={isTaskModalOpen} onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }} onAdd={handleAddTask} initialTask={editingTask} goals={goals} defaultGoalId={selectedGoalId} />
      <HabitModal isOpen={isHabitModalOpen} onClose={() => { setIsHabitModalOpen(false); setEditingHabit(null); }} onAdd={handleAddHabit} initialHabit={editingHabit} goals={goals} defaultGoalId={selectedGoalId} />
      
      <ConfirmationModal 
        isOpen={!!resetModal}
        onClose={() => setResetModal(null)}
        onConfirm={confirmReset}
        title="Reset Progress?"
        message="This item is already completed. Resetting it will remove its 'done' status for today. Do you want to continue?"
        confirmLabel="Yes, Reset"
        type="warning"
      />
      
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 bg-white border border-brand-primary/20 rounded-[2rem] shadow-[0_20px_60px_rgba(227,133,105,0.2)] flex items-center gap-4"
          >
            <div className="w-3 h-3 rounded-full bg-brand-primary animate-pulse" />
            <p className="text-xs font-black text-brand-text uppercase tracking-widest">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color }: { label: string, value: string, sub: string, icon: React.ReactNode, color: string }) {
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-4 md:p-8 border border-brand-primary/5 shadow-xl hover:shadow-2xl transition-all group overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity transform group-hover:scale-150 duration-700 hidden md:block">
        {icon}
      </div>
      <div className="flex items-start justify-between mb-3 md:mb-6">
        <div className={cn(
          "p-2 md:p-4 rounded-xl md:rounded-2xl shadow-lg transform group-hover:rotate-12 transition-transform duration-500",
          color === 'orange' ? "bg-brand-orange/10 text-brand-orange" : 
          color === 'green' ? "bg-brand-green/10 text-brand-green" : 
          "bg-brand-primary/10 text-brand-primary"
        )}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[8px] md:text-[10px] font-black text-brand-text-light uppercase tracking-[0.2em] md:tracking-[0.3em] mb-1 md:mb-2">{label}</p>
        <h3 className="text-xl md:text-4xl font-black text-brand-text tracking-tight mb-1 md:mb-2 group-hover:text-brand-primary transition-colors">{value}</h3>
        <p className="text-[10px] md:text-xs text-brand-text-light font-medium leading-relaxed hidden md:block">{sub}</p>
      </div>
    </motion.div>
  );
}

const GoalCard: React.FC<{ goal: Goal, isSelected: boolean, onSelect: (id: string) => void, onEdit: () => void, onDelete: () => void }> = ({ goal, isSelected, onSelect, onEdit, onDelete }) => {
  const timeProgress = useMemo(() => {
    if (!goal.startDate || !goal.deadline) return 0;
    const start = new Date(goal.startDate).getTime();
    const end = new Date(goal.deadline).getTime();
    const now = new Date().getTime();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  }, [goal.startDate, goal.deadline]);

  const integrityScore = useMemo(() => {
    if (timeProgress === 0) return 100;
    const score = Math.min(100, Math.round((goal.progress / timeProgress) * 100));
    return isNaN(score) ? 0 : score;
  }, [goal.progress, timeProgress]);

  const isBehind = integrityScore < 90 && timeProgress > 5;
  const isCompleted = goal.progress === 100;

  const { daysElapsed, totalDays } = useMemo(() => {
    if (!goal.startDate || !goal.deadline) return { daysElapsed: 0, totalDays: 0 };
    const start = new Date(goal.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(goal.deadline);
    end.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const diffTotal = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const diffElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      daysElapsed: Math.max(1, Math.min(diffTotal, diffElapsed)),
      totalDays: Math.max(1, diffTotal)
    };
  }, [goal.startDate, goal.deadline]);

  return (
    <motion.div 
      layout
      onClick={() => onSelect(goal.id)} 
      whileHover={{ y: -5, scale: 1.01 }}
      className={cn(
        "relative rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 transition-all cursor-pointer group overflow-hidden border shadow-2xl",
        isSelected ? "border-brand-primary/40 bg-white ring-4 md:ring-8 ring-brand-primary/5" : "border-brand-primary/5 hover:border-brand-primary/20 bg-white/60 backdrop-blur-md",
        integrityScore >= 100 && !isCompleted && "ring-2 ring-brand-green/20"
      )}
    >
      {/* Integrity Glow */}
      {integrityScore >= 100 && !isCompleted && (
        <div className="absolute inset-0 bg-brand-green/[0.02] pointer-events-none animate-pulse" />
      )}

      <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.1] transition-all transform group-hover:scale-150 duration-1000">
         <Target className="w-full h-full" style={{ color: goal.color }} />
      </div>

      <div className="relative z-10 flex items-start justify-between mb-8">
          <div className="pr-4 md:pr-6 flex-1">
          <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
            <div className="w-4 h-4 md:w-5 md:h-5 rounded-full shadow-lg shrink-0 animate-pulse" style={{ backgroundColor: goal.color }} />
            <div className="flex flex-col">
              <h4 className="font-black text-brand-text text-lg md:text-2xl tracking-tight leading-tight line-clamp-1">{goal.title}</h4>
              <div className="flex items-center gap-2 mt-1">
                {isCompleted ? (
                  <span className="text-[8px] font-black text-brand-green uppercase tracking-widest">Mission Accomplished</span>
                ) : integrityScore >= 100 ? (
                  <span className="text-[8px] font-black text-brand-green uppercase tracking-widest flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-brand-green" />
                    Day {daysElapsed} of {totalDays} • Perfect Sync
                  </span>
                ) : isBehind ? (
                  <span className="text-[8px] font-black text-brand-red uppercase tracking-widest flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-brand-red animate-ping" />
                    Day {daysElapsed} of {totalDays} • Integrity Leak
                  </span>
                ) : (
                  <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest">Day {daysElapsed} of {totalDays} • Active Flow</span>
                )}
              </div>
            </div>
          </div>
          <p className="text-sm text-brand-text-light line-clamp-2 leading-relaxed font-medium opacity-80">{goal.description}</p>
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 bg-brand-bg/90 backdrop-blur-md rounded-2xl p-1.5 border border-brand-primary/10 shadow-lg">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-3 hover:bg-white rounded-xl transition-all text-brand-text-light hover:text-brand-primary shadow-sm"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-3 hover:bg-white rounded-xl transition-all text-brand-red shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="relative z-10 mt-10 pt-8 border-t border-brand-primary/5">
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-brand-text-light uppercase tracking-[0.2em] bg-brand-bg/50 px-4 py-2.5 rounded-2xl border border-brand-primary/5 flex items-center gap-2.5 shadow-inner">
              <Calendar className="w-4 h-4" />
              {goal.deadline.split('-').reverse().join(' / ')}
            </span>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
               <span className="text-[9px] font-black text-brand-text-light uppercase tracking-[0.3em] block mb-1 opacity-40">Progress</span>
               <span className="font-black text-2xl tabular-nums text-brand-text">{goal.progress}%</span>
            </div>
            <div className="text-right">
               <span className="text-[9px] font-black text-brand-text-light uppercase tracking-[0.3em] block mb-1 opacity-40">Integrity</span>
               <span className="font-black text-2xl tabular-nums" style={{ color: integrityScore < 100 ? '#EF4444' : '#10B981' }}>{integrityScore}%</span>
            </div>
          </div>
        </div>
        <div className="relative h-4 bg-brand-bg rounded-full overflow-hidden border border-brand-primary/5 shadow-inner p-1">
          {/* Time Progress Bar (Shadow) */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${timeProgress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute left-1 top-1 bottom-1 bg-brand-text/5 rounded-full z-0"
          />
          {/* Task Progress Bar (Main) */}
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${goal.progress}%` }}
            transition={{ duration: 1.5, type: "spring", bounce: 0.3 }}
            className="h-full rounded-full shadow-lg relative z-10"
            style={{ backgroundColor: goal.color }}
          />
        </div>
        {!isCompleted && (
          <div className="mt-3 flex items-center justify-between px-1">
            <span className="text-[8px] font-black text-brand-text-light/40 uppercase tracking-widest">Temporal Flow: {timeProgress}%</span>
            {integrityScore < 100 && (
              <span className="text-[8px] font-black text-brand-red uppercase tracking-widest">Neural Gap: -{100 - integrityScore}%</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

const TimelineBlock: React.FC<{ block: TimeBlock, goals: Goal[] }> = ({ block, goals }) => {
  const isCompleted = block.status === 'completed';
  const isMissed = block.status === 'missed';
  const isActive = block.status === 'active';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02 }}
      className="flex gap-6 group"
    >
      <div className="flex flex-col items-center">
        <motion.div 
          animate={isActive ? { scale: [1, 1.2, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className={cn(
            "w-4 h-4 rounded-full border-4 border-white shadow-xl z-10",
            isCompleted ? "bg-brand-green" : isMissed ? "bg-brand-red" : isActive ? "bg-brand-primary shadow-[0_0_15px_rgba(227,133,105,0.5)]" : "bg-brand-bg border-brand-primary/10"
          )} 
        />
        <div className="w-1 flex-1 bg-gradient-to-b from-brand-primary/20 to-transparent my-1 rounded-full" />
      </div>
      <div className={cn(
        "flex-1 p-6 rounded-[2.5rem] border transition-all shadow-xl mb-8 relative overflow-hidden",
        isActive ? "bg-white border-brand-primary/30 ring-8 ring-brand-primary/5 shadow-brand-primary/10" : "bg-white/60 backdrop-blur-md border-brand-primary/5 hover:bg-white"
      )}>
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-2 bg-brand-primary animate-pulse" />}
        <div className="flex items-start justify-between">
          <span className="text-[10px] font-black text-brand-text-light uppercase tracking-[0.2em] bg-brand-bg/50 px-3 py-1.5 rounded-xl border border-brand-primary/5">
            {block.startTime} — {block.endTime}
          </span>
          {isActive && (
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="px-3 py-1 rounded-full bg-brand-primary text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20"
            >
              Live Mission
            </motion.div>
          )}
        </div>
        <h5 className={cn("text-lg font-black mt-4 tracking-tight", isActive ? "text-brand-primary" : "text-brand-text")}>
          {block.title}
        </h5>
        {block.goalId && (
          <p className="text-[10px] text-brand-text-light mt-2.5 flex items-center gap-2 font-black uppercase tracking-widest opacity-60">
            <Target className="w-4 h-4 text-brand-primary" />
            {goals.find(g => g.id === block.goalId)?.title}
          </p>
        )}
      </div>
    </motion.div>
  );
}

const HabitItem: React.FC<{ label: string, done: boolean, onClick: () => void, onPlay: () => void, onEdit: () => void, onDelete: () => void, startTime?: string, endTime?: string, date?: string, timeStatus?: 'active' | 'locked' | 'expired', goalTitle?: string, goalColor?: string, onGoalClick?: () => void, totalSeconds?: number }> = ({ label, done, onClick, onPlay, onEdit, onDelete, startTime, endTime, date, timeStatus = 'active', goalTitle, goalColor, onGoalClick, totalSeconds = 0 }) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const isDisabled = timeStatus !== 'active';

  return (
    <motion.div 
      layout
      whileHover={!isDisabled ? { x: 5 } : undefined}
      onClick={() => !isDisabled && onClick()}
      className={cn(
        "flex items-center gap-4 p-5 rounded-[2.5rem] transition-all group relative overflow-hidden border",
        timeStatus === 'locked' ? "opacity-50 bg-brand-bg/50 border-brand-primary/5 cursor-not-allowed" 
        : timeStatus === 'expired' ? "opacity-40 bg-brand-bg/30 border-brand-primary/5 cursor-not-allowed" 
        : "hover:bg-white bg-white border-brand-primary/5 hover:shadow-xl cursor-pointer shadow-sm",
        goalTitle ? "border-l-4" : ""
      )}
      style={goalTitle ? { borderLeftColor: goalColor } : {}}
    >
      {/* Status badge for locked/expired */}
      {timeStatus === 'locked' && (
        <div className="absolute top-2 right-3 text-[7px] font-black uppercase tracking-widest text-brand-text-light bg-brand-bg px-2 py-0.5 rounded-full border border-brand-primary/10">
          🔒 Locked
        </div>
      )}
      {timeStatus === 'expired' && !done && (
        <div className="absolute top-2 right-3 text-[7px] font-black uppercase tracking-widest text-brand-red bg-brand-red/5 px-2 py-0.5 rounded-full border border-brand-red/10">
          ⏰ Expired
        </div>
      )}

      <div className={cn(
        "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shrink-0 shadow-lg",
        done ? "bg-brand-green border-brand-green shadow-brand-green/20" 
        : isDisabled ? "border-brand-primary/10 bg-brand-bg" 
        : "border-brand-primary/20 bg-white group-hover:border-brand-primary/50",
      )}>
        {done && <CheckCircle2 className="w-5 h-5 text-white" />}
        {!done && !isDisabled && <div className="w-2.5 h-2.5 rounded-full bg-brand-primary/0 group-hover:bg-brand-primary/20 transition-all" />}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className={cn("text-base font-black truncate transition-all", 
          done ? "text-brand-text-light line-through opacity-50" 
          : timeStatus === 'expired' ? "text-brand-text-light line-through opacity-60" 
          : "text-brand-text group-hover:text-brand-primary"
        )}>
          {label}
        </span>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          {goalTitle ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onGoalClick?.(); }}
              className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border flex items-center gap-1.5 transition-all"
              style={{ backgroundColor: `${goalColor}10`, color: goalColor, borderColor: `${goalColor}20` }}
            >
              <Target className="w-3 h-3" />
              {goalTitle}
            </button>
          ) : (
            <span className="text-[8px] text-brand-text-light font-black uppercase tracking-widest bg-brand-bg px-2 py-0.5 rounded-lg border border-brand-primary/5">
              General Ritual
            </span>
          )}
          {totalSeconds > 0 && (
            <span className="text-[8px] font-black text-brand-orange uppercase tracking-widest flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {h > 0 ? `${h}h ` : ''}{m}m focused today
            </span>
          )}
          {(date || (startTime && endTime)) && (
            <span className="text-[9px] text-brand-text-light flex items-center gap-2 font-black uppercase tracking-widest opacity-60">
              <Clock className="w-3.5 h-3.5 text-brand-primary/50" />
              {date && <span>{date}</span>}
              {date && startTime && endTime && <span className="opacity-30">|</span>}
              {startTime && endTime && <span>{startTime} - {endTime}</span>}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all md:translate-x-4 md:group-hover:translate-x-0 shrink-0">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }} 
          className="p-3 bg-brand-bg rounded-2xl transition-all text-brand-text-light hover:text-brand-primary hover:bg-white shadow-sm border border-brand-primary/5"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }} 
          className="p-3 bg-brand-bg rounded-2xl transition-all text-brand-red hover:bg-white shadow-sm border border-brand-primary/5"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        {timeStatus === 'active' && !done && (
          <button 
            onClick={(e) => { e.stopPropagation(); onPlay(); }} 
            className="p-3 bg-brand-primary text-white rounded-2xl transition-all shadow-lg shadow-brand-primary/20 hover:opacity-90"
          >
            <Play className="w-4 h-4 fill-current" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

// --- Modals ---

export function GoalModal({ isOpen, onClose, onAdd, initialGoal }: { isOpen: boolean, onClose: () => void, onAdd: (t: string, d: string, dl: string, c: string, sd: string) => void, initialGoal?: Goal | null }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#E38569');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialGoal) {
        setTitle(initialGoal.title);
        setDescription(initialGoal.description);
        setStartDate(initialGoal.startDate || new Date().toISOString().split('T')[0]);
        setDeadline(initialGoal.deadline);
        setColor(initialGoal.color);
      } else {
        setTitle('');
        setDescription('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setDeadline(new Date().toISOString().split('T')[0]);
        setColor('#E38569');
      }
      setError('');
    }
  }, [isOpen, initialGoal]);

  const handleValidateAndAdd = () => {
    setError('');
    if (!title) return;

    const startD = new Date(startDate);
    const endD = new Date(deadline);
    
    if (endD <= startD) {
      setError('Deadline must be at least one day after the start date.');
      return;
    }

    onAdd(title, description, deadline, color, startDate);
    setTitle(''); setDescription('');
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-text/60 backdrop-blur-md" 
              onClick={onClose} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[2.5rem] w-full max-w-md p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h3 className="text-xl md:text-2xl font-black text-brand-text">{initialGoal ? "Edit Mission" : "Launch New Mission"}</h3>
                <button onClick={onClose} className="p-2 text-brand-text-light hover:text-brand-primary transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4 md:space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-2">Mission Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-brand-bg border border-brand-primary/10 rounded-2xl px-5 py-4 text-sm text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/10 shadow-inner transition-all" placeholder="e.g. Master React Framework" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-2">Short Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-brand-bg border border-brand-primary/10 rounded-2xl px-5 py-4 text-sm text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/10 shadow-inner h-20 resize-none transition-all" placeholder="What is the ultimate goal?" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-2">Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-brand-bg border border-brand-primary/10 rounded-2xl px-4 py-3.5 text-xs text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/10 shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-2">Deadline</label>
                    <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-brand-bg border border-brand-primary/10 rounded-2xl px-4 py-3.5 text-xs text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/10 shadow-inner" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-3">Neural Color Code</label>
                  <div className="flex items-center gap-3">
                    {['#E38569', '#98B684', '#3B82F6', '#EF4444', '#8B5CF6'].map(c => (
                      <button key={c} onClick={() => setColor(c)} className={cn("w-9 h-9 rounded-xl border-4 transition-all shadow-sm", color === c ? "border-white ring-4 ring-brand-primary/20 scale-110" : "border-transparent hover:scale-110")} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                
                <button onClick={handleValidateAndAdd} className="w-full mt-4 py-4 bg-brand-primary text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-brand-primary/30 uppercase tracking-widest text-xs">
                  {initialGoal ? "Update Neural Link" : "Establish Mission"}
                </button>
                {error && <p className="text-brand-red text-[10px] text-center font-bold mt-3 uppercase tracking-wider">{error}</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function TaskModal({ isOpen, onClose, onAdd, initialTask, goals, defaultGoalId }: { isOpen: boolean, onClose: () => void, onAdd: (t: string, goalId: string, p: 'low' | 'medium' | 'high', st?: string, et?: string, d?: string) => void, initialTask?: Task | null, goals: Goal[], defaultGoalId?: string | null }) {
  const [title, setTitle] = useState('');
  const [goalId, setGoalId] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTitle(initialTask.title);
        setGoalId(initialTask.goalId || '');
        setPriority(initialTask.priority);
        setStartTime(initialTask.startTime || '');
        setEndTime(initialTask.endTime || '');
        setDate(initialTask.date || new Date().toISOString().split('T')[0]);
      } else {
        setTitle('');
        setGoalId(defaultGoalId || ''); 
        setPriority('medium');
        setStartTime('');
        setEndTime('');
        setDate(new Date().toISOString().split('T')[0]);
      }
      setError('');
    }
  }, [isOpen, initialTask, defaultGoalId]);

  const handleValidateAndAdd = () => {
    setError('');
    if (!title) return;

    onAdd(title, goalId, priority, startTime || undefined, endTime || undefined, date);
    setTitle(''); setStartTime(''); setEndTime(''); setDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-text/60 backdrop-blur-md" 
              onClick={onClose} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[2.5rem] w-full max-w-md p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h3 className="text-xl md:text-2xl font-black text-brand-text">{initialTask ? "Edit Task" : "Add New Task"}</h3>
                <button onClick={onClose} className="p-2 text-brand-text-light hover:text-brand-primary transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4 md:space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-2">Task Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus className="w-full bg-brand-bg border border-brand-primary/10 rounded-2xl px-5 py-4 text-sm text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all shadow-inner" placeholder="e.g. Learn Excel Basics" />
                </div>
                <CustomSelect 
                  label="Associated Mission (Optional)"
                  placeholder="Select a mission..."
                  value={goalId}
                  onChange={setGoalId}
                  options={[
                    { id: '', title: 'None (Tanpa Misi)', color: '#CBD5E1' },
                    ...goals.map(g => ({ id: g.id, title: g.title, color: g.color }))
                  ]}
                />
                <div>
                  <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-2">Priority</label>
                  <div className="flex items-center gap-2">
                    {(['low', 'medium', 'high'] as const).map(p => (
                      <button key={p} onClick={() => setPriority(p)} className={cn("flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all", priority === p ? (p === 'high' ? "bg-brand-red text-white border-brand-red shadow-lg shadow-brand-red/20" : p === 'medium' ? "bg-brand-orange text-white border-brand-orange shadow-lg shadow-brand-orange/20" : "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20") : "bg-brand-bg border-brand-primary/10 text-brand-text-light hover:bg-white")}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-2">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-brand-bg border border-brand-primary/10 rounded-2xl px-5 py-4 text-sm text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/10 shadow-inner" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-2">Start Time (Optional)</label>
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-brand-bg border border-brand-primary/10 rounded-2xl px-5 py-4 text-sm text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/10 shadow-inner" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-2">End Time (Optional)</label>
                      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-brand-bg border border-brand-primary/10 rounded-2xl px-5 py-4 text-sm text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/10 shadow-inner" />
                    </div>
                  </div>
                </div>
                <button onClick={handleValidateAndAdd} className="w-full mt-6 py-4 bg-brand-primary text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-brand-primary/30 uppercase tracking-widest text-xs">
                  {initialTask ? "Save Changes" : "Add Task"}
                </button>
                {error && <p className="text-brand-red text-xs text-center font-bold mt-3">{error}</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function HabitModal({ isOpen, onClose, onAdd, initialHabit, goals, defaultGoalId }: { isOpen: boolean, onClose: () => void, onAdd: (l: string, goalId: string, st?: string, et?: string) => void, initialHabit?: any | null, goals: Goal[], defaultGoalId?: string | null }) {
  const [label, setLabel] = useState('');
  const [goalId, setGoalId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialHabit) {
        setLabel(initialHabit.label);
        setGoalId(initialHabit.goalId || '');
        setStartTime(initialHabit.startTime || '');
        setEndTime(initialHabit.endTime || '');
      } else {
        setLabel('');
        setGoalId(defaultGoalId || ''); 
        setStartTime('');
        setEndTime('');
      }
      setError('');
    }
  }, [isOpen, initialHabit, goals, defaultGoalId]);

  const handleValidateAndAdd = () => {
    setError('');
    if (!label) return;

    onAdd(label, goalId, startTime || undefined, endTime || undefined);
    setLabel(''); setStartTime(''); setEndTime('');
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-text/60 backdrop-blur-md" 
              onClick={onClose} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[2.5rem] w-full max-w-md p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-h-[calc(100dvh-2rem)] sm:max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h3 className="text-xl md:text-2xl font-black text-brand-text">{initialHabit ? "Edit Habit" : "Add New Habit"}</h3>
                <button onClick={onClose} className="p-2 text-brand-text-light hover:text-brand-primary transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4 md:space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-2">Ritual Name</label>
                  <input type="text" value={label} onChange={e => setLabel(e.target.value)} autoFocus className="w-full bg-brand-bg border border-brand-primary/10 rounded-2xl px-5 py-4 text-sm text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all shadow-inner" placeholder="e.g. Read 10 Pages" />
                </div>
                <CustomSelect 
                  label="Associated Mission (Optional)"
                  placeholder="Select a mission..."
                  value={goalId}
                  onChange={setGoalId}
                  options={[
                    { id: '', title: 'None (Tanpa Misi)', color: '#CBD5E1' },
                    ...goals.map(g => ({ id: g.id, title: g.title, color: g.color }))
                  ]}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-2">Start Time (Optional)</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-brand-bg border border-brand-primary/10 rounded-2xl px-5 py-4 text-sm text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/10 shadow-inner" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-2">End Time (Optional)</label>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-brand-bg border border-brand-primary/10 rounded-2xl px-5 py-4 text-sm text-brand-text focus:outline-none focus:ring-4 focus:ring-brand-primary/10 shadow-inner" />
                  </div>
                </div>
                <button onClick={handleValidateAndAdd} className="w-full mt-6 py-4 bg-brand-primary text-white font-black rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-brand-primary/30 uppercase tracking-widest text-xs">
                  {initialHabit ? "Save Changes" : "Add Ritual"}
                </button>
                {error && <p className="text-brand-red text-xs text-center font-bold mt-3">{error}</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
