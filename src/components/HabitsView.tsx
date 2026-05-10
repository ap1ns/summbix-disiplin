import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Repeat, Plus, CheckCircle2, Pencil, Trash2, Play, Flame, Target, Clock, Calendar, ChevronRight, Search, Filter } from 'lucide-react';
import { Habit, Goal, FocusSession, AppView } from '../types';
import { cn } from '../lib/utils';
import { habitsApi, sessionsApi } from '../lib/api';
import { HabitModal } from './Overview';
import CustomSelect from './CustomSelect';
import ConfirmationModal from './ConfirmationModal';

interface HabitsViewProps {
  habits: Habit[];
  setHabits: (h: Habit[]) => void;
  goals: Goal[];
  sessions: FocusSession[];
  setSessions: (s: FocusSession[]) => void;
  onStartFocus: (target: { id: string, type: 'goal' | 'task' | 'habit', title: string, goalId?: string }) => void;
  onNavigate?: (view: AppView) => void;
  isGuest?: boolean;
}

export default function HabitsView({ habits, setHabits, goals, sessions, setSessions, onStartFocus, onNavigate, isGuest }: HabitsViewProps) {
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoalFilter, setSelectedGoalFilter] = useState<string | 'all'>('all');
  const [resetModal, setResetModal] = useState<{ isOpen: boolean, id: string } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const isHabitDoneToday = (h: Habit) => h.completedDates?.includes(todayStr) || false;

  const filteredHabits = habits.filter(h => {
    const matchesSearch = h.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGoal = selectedGoalFilter === 'all' || h.goalId === selectedGoalFilter;
    return matchesSearch && matchesGoal;
  }).sort((a, b) => {
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return 0;
  });

  const toggleHabit = async (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (isHabitDoneToday(habit!)) {
      setResetModal({ isOpen: true, id: habitId });
      return;
    }
    setHabits(habits.map(h => {
      if (h.id === habitId) {
        const dates = h.completedDates || [];
        const isDone = dates.includes(todayStr);
        return {
          ...h,
          completedDates: isDone ? dates.filter(d => d !== todayStr) : [...dates, todayStr]
        };
      }
      return h;
    }));
    if (!isGuest) { try { await habitsApi.toggle(habitId, todayStr); } catch {} }
  };

  const confirmReset = async () => {
    if (!resetModal) return;
    setHabits(habits.map(h => {
      if (h.id === resetModal.id) {
        const dates = h.completedDates || [];
        return { ...h, completedDates: dates.filter(d => d !== todayStr) };
      }
      return h;
    }));
    setSessions(sessions.filter(s => {
      if (s.habitId === resetModal.id) {
        return s.date !== todayStr;
      }
      return true;
    }));
    if (!isGuest) {
      try {
        await habitsApi.toggle(resetModal.id, todayStr);
        await sessionsApi.removeByHabit(resetModal.id, todayStr);
      } catch {}
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
        alert("Guest Limit: Maximum 2 Habits allowed.");
        return;
      }
      if (!isGuest) {
        try {
          const created = await habitsApi.create({ label, goalId: goalId || undefined, startTime, endTime });
          setHabits([...habits, created]);
        } catch { return; }
      } else {
        setHabits([...habits, { id: `h${Date.now()}`, label, done: false, goalId: goalId || (selectedGoalFilter !== 'all' ? selectedGoalFilter : ''), startTime, endTime, completedDates: [] } as any]);
      }
    }
    setIsHabitModalOpen(false);
  };

  const handleDeleteHabit = async (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
    if (!isGuest) { try { await habitsApi.remove(id); } catch {} }
  };

  // Calculate stats
  const totalHabits = habits.length;
  const completedToday = habits.filter(isHabitDoneToday).length;
  const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-brand-text flex items-center gap-4 md:gap-6">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.5rem] md:rounded-[2rem] bg-brand-primary/10 flex items-center justify-center shadow-inner">
              <Repeat className="w-6 h-6 md:w-8 md:h-8 text-brand-primary" />
            </div>
            Daily Rituals
          </h2>
          <p className="text-brand-text-light font-medium mt-2 md:mt-4 px-2 text-sm md:text-lg hidden md:block">Systematize your excellence through consistent action.</p>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="bg-white border border-brand-primary/10 rounded-2xl md:rounded-3xl p-1.5 md:p-2 flex items-center gap-1 md:gap-2 shadow-xl">
            <div className="flex flex-col items-center px-3 md:px-6 py-1.5 md:py-2 border-r border-brand-primary/5">
              <span className="text-[9px] md:text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-0.5 md:mb-1">Today</span>
              <span className="text-lg md:text-2xl font-black text-brand-primary">{completedToday}/{totalHabits}</span>
            </div>
            <div className="flex flex-col items-center px-3 md:px-6 py-1.5 md:py-2">
              <span className="text-[9px] md:text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-0.5 md:mb-1">Power</span>
              <span className="text-lg md:text-2xl font-black text-brand-orange">{completionRate}%</span>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsHabitModalOpen(true)}
            className="h-12 md:h-16 px-5 md:px-8 bg-brand-primary text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-[10px] md:text-xs shadow-2xl shadow-brand-primary/30 flex items-center gap-2 md:gap-3"
          >
            <Plus className="w-5 h-5" />
            New Ritual
          </motion.button>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-7 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-light group-focus-within:text-brand-primary transition-colors" />
          <input
            type="text"
            placeholder="Search rituals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-16 pl-16 pr-8 bg-white border border-brand-primary/10 rounded-[2rem] text-sm font-bold text-brand-text placeholder:text-brand-text-light/40 focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary/30 transition-all shadow-sm"
          />
        </div>
        <div className="md:col-span-5 flex items-center gap-4">
          <CustomSelect
            value={selectedGoalFilter}
            onChange={setSelectedGoalFilter}
            options={[
              { id: 'all', title: 'All Missions' },
              ...goals.map(g => ({ id: g.id, title: g.title, color: g.color }))
            ]}
            placeholder="Filter Mission"
            icon={<Filter className="w-5 h-5" />}
          />
        </div>
      </section>

      {/* Habits Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <AnimatePresence mode="popLayout">
          {filteredHabits.map((habit, idx) => {
            const isDone = isHabitDoneToday(habit);
            const goal = goals.find(g => g.id === habit.goalId);

            return (
              <motion.div
                key={habit.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "group relative bg-white border rounded-[2rem] md:rounded-[3rem] p-5 md:p-8 transition-all hover:shadow-2xl overflow-hidden",
                  isDone ? "border-brand-green/20 bg-brand-green/[0.02]" : "border-brand-primary/10"
                )}
              >
                {/* Visual Accent */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-[0.1] transition-all transform group-hover:scale-150 duration-1000"
                  style={{ color: goal?.color || 'var(--brand-primary)' }}
                >
                  <Repeat className="w-full h-full" />
                </div>

                <div className="flex items-start justify-between mb-8 relative z-10">
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90",
                      isDone ? "bg-brand-green text-white shadow-brand-green/30" : "bg-brand-bg border-2 border-brand-primary/20 text-brand-primary/20 hover:border-brand-primary hover:text-brand-primary"
                    )}
                  >
                    <CheckCircle2 className={cn("w-7 h-7", isDone ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                  </button>

                  <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all md:translate-x-4 md:group-hover:translate-x-0">
                    <button
                      onClick={() => { setEditingHabit(habit); setIsHabitModalOpen(true); }}
                      className="p-3 bg-brand-bg hover:bg-white rounded-xl text-brand-text-light hover:text-brand-primary transition-all shadow-sm border border-brand-primary/5"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="p-3 bg-brand-bg hover:bg-white rounded-xl text-brand-red transition-all shadow-sm border border-brand-primary/5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="relative z-10">
                  <h4 className={cn(
                    "text-2xl font-black tracking-tight mb-2 transition-all",
                    isDone ? "text-brand-text-light line-through opacity-50" : "text-brand-text group-hover:text-brand-primary"
                  )}>
                    {habit.label}
                  </h4>

                  <div className="flex flex-wrap items-center gap-3 mt-6">
                    {goal && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-brand-primary/10 bg-brand-bg text-brand-text-light flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: goal.color }} />
                        {goal.title}
                      </span>
                    )}
                    {habit.startTime && habit.endTime && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-brand-primary/10 bg-brand-bg text-brand-text-light flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-brand-primary" />
                        {habit.startTime} - {habit.endTime}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Visual */}
                <div className="mt-10 pt-8 border-t border-brand-primary/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className={cn("w-5 h-5", habit.completedDates && habit.completedDates.length > 0 ? "text-brand-orange" : "text-brand-text-light/20")} />
                    <span className="text-xs font-black text-brand-text">
                      {habit.completedDates?.length || 0} Day Streak
                    </span>
                  </div>
                  {!isDone && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onStartFocus({ id: habit.id, type: 'habit', title: habit.label, goalId: habit.goalId }); }}
                      className="p-4 bg-brand-primary text-white rounded-3xl shadow-xl shadow-brand-primary/20 hover:scale-110 active:scale-95 transition-all"
                    >
                      <Play className="w-5 h-5 fill-current" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {filteredHabits.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-[2.5rem] bg-brand-bg flex items-center justify-center mb-8 border border-brand-primary/10">
              <Repeat className="w-10 h-10 text-brand-text-light/30" />
            </div>
            <h3 className="text-2xl font-black text-brand-text uppercase tracking-widest mb-4">No Rituals Found</h3>
            <p className="text-brand-text-light max-w-sm font-medium">Refine your search or create a new ritual to begin your journey toward discipline.</p>
            <button
              onClick={() => setIsHabitModalOpen(true)}
              className="mt-10 px-8 py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 shadow-xl"
            >
              Add First Ritual
            </button>
          </div>
        )}
      </section>

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => { setIsHabitModalOpen(false); setEditingHabit(null); }}
        onAdd={handleAddHabit}
        initialHabit={editingHabit}
        goals={goals}
        defaultGoalId={selectedGoalFilter !== 'all' ? selectedGoalFilter : null}
      />

      <ConfirmationModal
        isOpen={!!resetModal}
        onClose={() => setResetModal(null)}
        onConfirm={confirmReset}
        title="Reset Ritual?"
        message="This ritual is already completed for today. Resetting it will remove its 'done' status. Do you want to continue?"
        confirmLabel="Yes, Reset"
        type="warning"
      />
    </div>
  );
}
