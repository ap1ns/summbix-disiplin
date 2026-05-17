import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ListTodo, Plus, CheckCircle2, Pencil, Trash2, Play, Target, Clock, Calendar, Search, Filter, ArrowUpCircle, ArrowRightCircle, ArrowDownCircle } from 'lucide-react';
import { Task, Goal, FocusSession, AppView } from '../types';
import { cn } from '../lib/utils';
import { tasksApi, sessionsApi } from '../lib/api';
import { TaskModal } from './Overview';
import CustomSelect from './CustomSelect';
import ConfirmationModal from './ConfirmationModal';

interface TasksViewProps {
  tasks: Task[];
  setTasks: (t: Task[]) => void;
  goals: Goal[];
  sessions: FocusSession[];
  setSessions: (s: FocusSession[]) => void;
  onStartFocus: (target: { id: string, type: 'goal' | 'task' | 'habit', title: string, goalId?: string }) => void;
  onNavigate?: (view: AppView) => void;
  isGuest?: boolean;
}

export default function TasksView({ tasks, setTasks, goals, sessions, setSessions, onStartFocus, onNavigate, isGuest }: TasksViewProps) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [resetModal, setResetModal] = useState<{ isOpen: boolean, id: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string, title?: string } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'completed' ? t.completed : !t.completed);
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.completed) {
      setResetModal({ isOpen: true, id: taskId });
      return;
    }
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
    if (!isGuest) { try { await tasksApi.toggle(taskId); } catch {} }
  };

  const confirmReset = async () => {
    if (!resetModal) return;
    setTasks(tasks.map(t => t.id === resetModal.id ? { ...t, completed: false } : t));
    setSessions(sessions.filter(s => s.taskId !== resetModal.id));
    if (!isGuest) {
      try {
        await tasksApi.update(resetModal.id, { completed: false });
        await sessionsApi.removeByTask(resetModal.id);
      } catch {}
    }
    setResetModal(null);
  };

  const confirmRemoveCheckOnly = async () => {
    if (!resetModal) return;
    setTasks(tasks.map(t => t.id === resetModal.id ? { ...t, completed: false } : t));
    if (!isGuest) {
      try {
        await tasksApi.update(resetModal.id, { completed: false });
      } catch {}
    }
    setResetModal(null);
  };

  const handleAddTask = async (title: string, goalId: string, priority: 'low' | 'medium' | 'high', startTime?: string, endTime?: string, date?: string) => {
    if (editingTask) {
      setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, title, goalId, priority, startTime, endTime, date } : t));
      if (!isGuest) { try { await tasksApi.update(editingTask.id, { title, goalId: goalId || null, priority, startTime, endTime, date }); } catch {} }
      setEditingTask(null);
    } else {
      if (isGuest && tasks.length >= 2) {
        alert("Guest Limit: Maximum 2 Tasks allowed.");
        return;
      }
      if (!isGuest) {
        try {
          const created = await tasksApi.create({ title, goalId: goalId || undefined, priority, startTime, endTime, date: date || todayStr });
          setTasks([...tasks, created]);
        } catch { return; }
      } else {
        setTasks([...tasks, { id: `t${Date.now()}`, title, goalId, completed: false, priority, startTime, endTime, date: date || todayStr }]);
      }
    }
    setIsTaskModalOpen(false);
  };

  const handleDeleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    setDeleteModal({ isOpen: true, id, title: task?.title });
  };

  const confirmDeleteTask = async () => {
    if (!deleteModal) return;
    const { id } = deleteModal;
    setTasks(tasks.filter(t => t.id !== id));
    if (!isGuest) { try { await tasksApi.remove(id); } catch {} }
    setDeleteModal(null);
  };

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-brand-text flex items-center gap-4 md:gap-6">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.5rem] md:rounded-[2rem] bg-brand-blue/10 flex items-center justify-center shadow-inner">
              <ListTodo className="w-6 h-6 md:w-8 md:h-8 text-brand-blue" />
            </div>
            Daily Missions
          </h2>
          <p className="text-brand-text-light font-medium mt-2 md:mt-4 px-2 text-sm md:text-lg hidden md:block">Execute with precision. Conquer your objectives.</p>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <div className="bg-white border border-brand-primary/10 rounded-3xl p-1.5 flex items-center gap-1 shadow-xl">
             <button 
                onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
                className={cn(
                  "flex flex-col items-center px-3 md:px-6 py-2 rounded-xl md:rounded-2xl transition-all",
                  statusFilter === 'pending' ? "bg-brand-orange/10 ring-1 ring-brand-orange/20" : "hover:bg-brand-bg"
                )}
             >
                <span className="text-[9px] md:text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-1">Pending</span>
                <span className="text-lg md:text-2xl font-black text-brand-orange">{pendingTasks}</span>
             </button>
             <div className="w-px h-8 bg-brand-primary/5 mx-1" />
             <button 
                onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
                className={cn(
                  "flex flex-col items-center px-3 md:px-6 py-2 rounded-xl md:rounded-2xl transition-all",
                  statusFilter === 'completed' ? "bg-brand-green/10 ring-1 ring-brand-green/20" : "hover:bg-brand-bg"
                )}
             >
                <span className="text-[9px] md:text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-1">Success</span>
                <span className="text-lg md:text-2xl font-black text-brand-green">{completionRate}%</span>
             </button>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsTaskModalOpen(true)}
            className="h-12 md:h-16 px-5 md:px-8 bg-brand-primary text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-[10px] md:text-xs shadow-2xl shadow-brand-primary/30 flex items-center gap-2 md:gap-3"
          >
            <Plus className="w-5 h-5" />
            New Mission
          </motion.button>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-6 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text-light group-focus-within:text-brand-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search missions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-16 pl-16 pr-8 bg-white border border-brand-primary/10 rounded-[2rem] text-sm font-bold text-brand-text placeholder:text-brand-text-light/40 focus:outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary/30 transition-all shadow-sm"
          />
        </div>
        <div className="lg:col-span-3">
          <CustomSelect
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as any)}
            options={[
              { id: 'all', title: 'All Status' },
              { id: 'pending', title: 'Pending Only' },
              { id: 'completed', title: 'Completed Only' }
            ]}
            placeholder="Filter Status"
            icon={<Filter className="w-5 h-5" />}
          />
        </div>
        <div className="lg:col-span-3">
          <CustomSelect
            value={priorityFilter}
            onChange={(v) => setPriorityFilter(v as any)}
            options={[
              { id: 'all', title: 'All Priorities' },
              { id: 'high', title: 'High Priority' },
              { id: 'medium', title: 'Medium Priority' },
              { id: 'low', title: 'Low Priority' }
            ]}
            placeholder="Filter Priority"
            icon={<Filter className="w-5 h-5" />}
          />
        </div>
      </section>

      {/* Tasks List */}
      <section className="bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task, idx) => {
            const goal = goals.find(g => g.id === task.goalId);
            const isToday = task.date === todayStr;
            
            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.03 }}
                className={cn(
                  "p-4 md:p-8 flex items-center gap-4 md:gap-8 transition-all group relative",
                  idx !== filteredTasks.length - 1 && "border-b border-brand-primary/5",
                  task.completed ? "bg-brand-bg/20" : "hover:bg-brand-primary/[0.02]"
                )}
              >
                {/* Status Indicator */}
                <button 
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    "w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90 shrink-0",
                    task.completed ? "bg-brand-green text-white shadow-brand-green/30" : "bg-white border-2 border-brand-primary/20 text-brand-primary/20 hover:border-brand-primary"
                  )}
                >
                  <CheckCircle2 className={cn("w-4 h-4 md:w-6 md:h-6", task.completed ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 mb-2">
                    <h4 className={cn(
                      "text-base md:text-2xl font-black tracking-tight transition-all truncate",
                      task.completed ? "text-brand-text-light line-through opacity-50" : "text-brand-text"
                    )}>
                      {task.title}
                    </h4>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border shadow-sm",
                      task.priority === 'high' ? "bg-brand-red text-white border-brand-red shadow-brand-red/20" : 
                      task.priority === 'medium' ? "bg-brand-orange text-white border-brand-orange shadow-brand-orange/20" : 
                      "bg-brand-primary text-white border-brand-primary shadow-brand-primary/20"
                    )}>
                      {task.priority}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4">
                    {goal && (
                      <span className="text-[10px] font-black text-brand-text-light uppercase tracking-widest flex items-center gap-2">
                        <Target className="w-4 h-4" style={{ color: goal.color }} />
                        {goal.title}
                      </span>
                    )}
                    {task.date && (
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                        isToday ? "text-brand-orange" : "text-brand-text-light"
                      )}>
                        <Calendar className="w-4 h-4" />
                        {isToday ? "Today" : new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                    {task.startTime && task.endTime && (
                      <span className="text-[10px] font-black text-brand-text-light uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {task.startTime} - {task.endTime}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 md:opacity-0 md:group-hover:opacity-100 transition-all md:translate-x-4 md:group-hover:translate-x-0 shrink-0">
                  <button 
                    onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }}
                    className="p-2.5 md:p-4 bg-brand-bg hover:bg-white rounded-xl md:rounded-[1.5rem] text-brand-text-light hover:text-brand-primary transition-all shadow-sm border border-brand-primary/5"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2.5 md:p-4 bg-brand-bg hover:bg-white rounded-xl md:rounded-[1.5rem] text-brand-red transition-all shadow-sm border border-brand-primary/5"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  {!task.completed && (
                    <button 
                      onClick={() => onStartFocus({ id: task.id, type: 'task', title: task.title, goalId: task.goalId })}
                      className="p-2.5 md:p-4 bg-brand-primary text-white rounded-xl md:rounded-[1.5rem] shadow-xl shadow-brand-primary/20 hover:scale-110 active:scale-95 transition-all"
                    >
                      <Play className="w-5 h-5 fill-current" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <div className="p-24 text-center">
            <div className="w-24 h-24 rounded-[2.5rem] bg-brand-bg flex items-center justify-center mb-8 mx-auto border border-brand-primary/10">
              <ListTodo className="w-10 h-10 text-brand-text-light/30" />
            </div>
            <h3 className="text-2xl font-black text-brand-text uppercase tracking-widest mb-4">No Missions Found</h3>
            <p className="text-brand-text-light max-w-sm mx-auto font-medium">Your current filters returned no results. Clear them or add a new mission to begin.</p>
          </div>
        )}
      </section>

      <TaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }} 
        onAdd={handleAddTask} 
        initialTask={editingTask} 
        goals={goals}
      />

      <ConfirmationModal 
        isOpen={!!resetModal}
        onClose={() => setResetModal(null)}
        onConfirm={confirmReset}
        onAlternative={confirmRemoveCheckOnly}
        title="Reset Progress?"
        message="This task is already completed. Do you want to reset everything (including focus time) or just remove the checkmark?"
        confirmLabel="Riset Progres"
        alternativeLabel="Tanpa Riset"
        cancelLabel="Batal"
        type="warning"
      />

      <ConfirmationModal 
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={confirmDeleteTask}
        title="Hapus Task?"
        message={`Apakah Anda yakin ingin menghapus "${deleteModal?.title || ''}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        type="danger"
      />
    </div>
  );
}
