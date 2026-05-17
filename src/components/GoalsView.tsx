import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Goal, Task, Habit, FocusSession } from '../types';
import { Target, Clock, Zap, CheckCircle2, ChevronRight, Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { goalsApi } from '../lib/api';
import { GoalModal } from './Overview';
import ConfirmationModal from './ConfirmationModal';

interface GoalsViewProps {
  goals: Goal[];
  setGoals: (goals: Goal[]) => void;
  tasks: Task[];
  habits: Habit[];
  sessions: FocusSession[];
}

export default function GoalsView({ goals, setGoals, tasks, habits, sessions }: GoalsViewProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(goals.length > 0 ? goals[0].id : null);
  
  const selectedGoal = goals.find(g => g.id === selectedGoalId);

  const goalTasks = tasks.filter(t => t.goalId === selectedGoalId);
  const goalHabits = habits.filter(h => h.goalId === selectedGoalId).sort((a, b) => {
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return 0;
  });
  const goalSessions = sessions.filter(s => s.goalId === selectedGoalId);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string, title?: string } | null>(null);

  const handleDeleteGoal = (id: string) => {
    const goal = goals.find(g => g.id === id);
    setDeleteModal({ isOpen: true, id, title: goal?.title });
  };

  const confirmDeleteGoal = async () => {
    if (!deleteModal) return;
    const { id } = deleteModal;
    setGoals(goals.filter(g => g.id !== id));
    if (selectedGoalId === id) setSelectedGoalId(goals.length > 1 ? goals.find(g => g.id !== id)?.id || null : null);
    try { await goalsApi.remove(id); } catch {}
    setDeleteModal(null);
  };

  const handleEditGoal = async (title: string, description: string, deadline: string, color: string) => {
    if (selectedGoalId) {
      setGoals(goals.map(g => g.id === selectedGoalId ? { ...g, title, description, deadline, color } : g));
      try { await goalsApi.update(selectedGoalId, { title, description, deadline, color }); } catch {}
    }
    setIsEditModalOpen(false);
  };
  
  const totalFocusSeconds = goalSessions.reduce((acc, s) => acc + s.duration, 0);
  const focusHours = Math.floor(totalFocusSeconds / 3600);
  const focusMins = Math.floor((totalFocusSeconds % 3600) / 60);

  const nowDateStrLocal = new Date().toISOString().split('T')[0];
  const isHabitDoneToday = (h: Habit) => h.completedDates?.includes(nowDateStrLocal) || false;

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-6 md:gap-8 pt-4">
      {/* Left List of Goals */}
      <div className="w-full lg:w-1/3 flex flex-col gap-4 md:gap-6 lg:h-full">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-brand-text">
              Your Goals
            </h2>
            <p className="text-brand-text-light mt-1 font-medium text-sm uppercase tracking-widest">
              Define your path, conquer your destiny.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-4 -mx-2 md:-mx-4 space-y-3 md:space-y-4 pb-8 lg:pb-20">
          {goals.map(goal => (
            <GoalListItem 
              key={goal.id} 
              goal={goal} 
              isSelected={selectedGoalId === goal.id} 
              onClick={() => setSelectedGoalId(goal.id)} 
            />
          ))}
          {goals.length === 0 && (
            <div className="text-center p-12 bg-white rounded-3xl border border-brand-primary/10 shadow-sm">
              <Target className="w-12 h-12 text-brand-bg mx-auto mb-4" />
              <p className="text-brand-text font-black uppercase tracking-widest text-xs">No active goals found.</p>
              <p className="text-xs text-brand-text-light mt-2">Go to the Dashboard to add your first goal.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Detail View */}
      <div className="flex flex-1 bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden relative min-h-[400px] lg:min-h-0">
        {selectedGoal ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 lg:p-14">
            {/* Dynamic Ambient Background */}
            <div 
              className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] blur-[150px] rounded-full pointer-events-none opacity-10 transition-colors duration-1000" 
              style={{ backgroundColor: selectedGoal.color }} 
            />

            <div className="relative z-10 flex flex-col md:flex-row items-start gap-5 md:gap-8 mb-8 md:mb-14">
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center shrink-0 shadow-2xl border-4 border-white transform -rotate-3" style={{ backgroundColor: selectedGoal.color }}>
                <Target className="w-8 h-8 md:w-12 md:h-12 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex flex-col md:flex-row items-start justify-between gap-3">
                  <h1 className="text-3xl md:text-5xl font-black text-brand-text tracking-tight mb-2 md:mb-4">{selectedGoal.title}</h1>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsEditModalOpen(true)} className="p-4 bg-brand-bg hover:bg-brand-primary hover:text-white rounded-2xl transition-all text-brand-text-light border border-brand-primary/5 shadow-sm">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteGoal(selectedGoal.id)} className="p-4 bg-brand-bg hover:bg-brand-red hover:text-white rounded-2xl transition-all text-brand-red border border-brand-primary/5 shadow-sm">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-xl text-brand-text-light leading-relaxed max-w-2xl font-medium">{selectedGoal.description}</p>
                <div className="flex items-center gap-4 mt-8">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text-light bg-brand-bg px-4 py-2 rounded-xl border border-brand-primary/10 shadow-sm flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Deadline: {selectedGoal.deadline}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-14 relative z-10">
              <StatCard label="Overall Progress" value={`${selectedGoal.progress}%`} color={selectedGoal.color} />
              <StatCard label="Total Focus Time" value={`${focusHours}h ${focusMins}m`} color={selectedGoal.color} />
              <StatCard label="Completed Tasks" value={`${goalTasks.filter(t => t.completed).length} / ${goalTasks.length}`} color={selectedGoal.color} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 relative z-10">
              <div>
                <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-brand-text border-b border-brand-primary/5 pb-5">
                  <CheckCircle2 className="w-6 h-6" style={{ color: selectedGoal.color }} /> Related Tasks
                </h3>
                <div className="space-y-4">
                  {goalTasks.length === 0 && <p className="text-brand-text-light text-sm italic">No tasks associated with this goal.</p>}
                  {goalTasks.map((task, idx) => (
                    <motion.div 
                      key={task.id} 
                      whileHover={{ x: 8 }}
                      className="bg-brand-bg/50 border border-brand-primary/5 rounded-[1.5rem] p-5 flex items-center gap-5 group hover:bg-white hover:shadow-xl transition-all relative overflow-hidden"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-transparent group-hover:bg-brand-primary transition-colors" />
                      <div className={cn("w-7 h-7 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all", task.completed ? "bg-brand-green border-brand-green shadow-lg shadow-brand-green/20" : "border-brand-primary/20 bg-white group-hover:border-brand-primary/40")}>
                        {task.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                        {!task.completed && <div className="w-2 h-2 rounded-full bg-brand-primary/0 group-hover:bg-brand-primary/20 transition-all" />}
                      </div>
                      <span className={cn("text-base font-bold transition-colors", task.completed ? "text-brand-text-light line-through opacity-50" : "text-brand-text group-hover:text-brand-primary")}>{task.title}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-brand-text border-b border-brand-primary/5 pb-5">
                  <Zap className="w-6 h-6" style={{ color: selectedGoal.color }} /> Associated Habits
                </h3>
                <div className="space-y-4">
                  {goalHabits.length === 0 && <p className="text-brand-text-light text-sm italic">No habits associated with this goal.</p>}
                  {goalHabits.map(habit => {
                    const isDone = isHabitDoneToday(habit);
                    return (
                      <div key={habit.id} className="bg-brand-bg/50 border border-brand-primary/5 rounded-[1.5rem] p-5 flex items-center gap-5 group hover:bg-white hover:shadow-xl transition-all">
                        <div className={cn("w-6 h-6 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all", isDone ? "bg-brand-orange border-brand-orange shadow-lg shadow-brand-orange/20" : "border-brand-primary/20")}>
                          {isDone && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <span className={cn("text-base font-bold transition-colors", isDone ? "text-brand-text-light line-through opacity-50" : "text-brand-text")}>{habit.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <Target className="w-32 h-32 text-brand-bg mb-8" />
            <h2 className="text-3xl font-black text-brand-text">Select a Goal</h2>
            <p className="text-brand-text-light mt-4 max-w-sm text-lg">Choose a goal from the left to view its detailed statistics, related tasks, and progress.</p>
          </div>
        )}
      </div>

      <GoalModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onAdd={handleEditGoal}
        initialGoal={selectedGoal}
      />

      <ConfirmationModal 
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={confirmDeleteGoal}
        title="Hapus Goal?"
        message={`Apakah Anda yakin ingin menghapus "${deleteModal?.title || ''}"? Tindakan ini akan menghapus goal secara permanen beserta semua keterkaitannya.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        type="danger"
      />
    </div>
  );
}

interface GoalListItemProps {
  goal: Goal;
  isSelected: boolean;
  onClick: () => void;
}

const GoalListItem: React.FC<GoalListItemProps> = ({ goal, isSelected, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] cursor-pointer transition-all border overflow-hidden group mx-1 md:mx-2",
        isSelected ? "bg-white border-brand-primary/30 shadow-2xl ring-4 ring-brand-primary/5" : "bg-white/60 border-brand-primary/10 hover:border-brand-primary/20 hover:bg-white"
      )}
    >
      <div className="relative z-10 flex items-start gap-5">
        <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110" style={{ backgroundColor: goal.color }}>
          <Target className="w-8 h-8 text-white" />
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col gap-2 pt-1">
          <h4 className="font-black text-brand-text text-xl tracking-tight truncate">{goal.title}</h4>
          
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.1em] text-brand-text-light mb-2">
             <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {goal.deadline.split('-').reverse().join('/')}</span>
             <span style={{ color: goal.color }}>{goal.progress}% Done</span>
          </div>

          <div className="h-2.5 bg-brand-bg rounded-full overflow-hidden border border-brand-primary/5 w-full shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${goal.progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: goal.color }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

function StatCard({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="bg-brand-bg/50 border border-brand-primary/5 rounded-[2rem] p-7 group hover:bg-white hover:shadow-xl transition-all">
      <p className="text-[10px] font-black text-brand-text-light uppercase tracking-[0.2em] mb-3">{label}</p>
      <p className="text-3xl font-black text-brand-text">{value}</p>
      <div className="h-1.5 w-12 rounded-full mt-4" style={{ backgroundColor: color }} />
    </div>
  );
}
