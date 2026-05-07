import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie 
} from 'recharts';
import { TrendingUp, Clock, Zap, Target, Flame, CheckCircle2, ListTodo, History, Timer, BarChart3 } from 'lucide-react';
import { FocusSession, Goal, Task, Habit } from '../types';
import { cn } from '../lib/utils';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, differenceInDays } from 'date-fns';

interface AnalyticsViewProps {
  sessions: FocusSession[];
  goals: Goal[];
  tasks: Task[];
  habits: Habit[];
  isGuest?: boolean;
}

export default function AnalyticsView({ sessions, goals, tasks, habits, isGuest }: AnalyticsViewProps) {
  const [timeRange, setTimeRange] = useState<7 | 30>(7);
  
  const now = new Date();
  const startDate = startOfDay(subDays(now, timeRange));
  const endDate = endOfDay(now);

  const filteredSessions = sessions.filter(s => {
    const sessionDate = new Date(s.date);
    return isWithinInterval(sessionDate, { start: startDate, end: endDate });
  });

  // Calculate Bar Chart Data (Focus Hours per Day)
  const CHART_DATA = useMemo(() => {
    const dateKeyToLabel: Record<string, string> = {};
    const data: Record<string, number> = {};
    
    for (let i = timeRange - 1; i >= 0; i--) {
      const d = subDays(now, i);
      const dateKey = format(d, 'yyyy-MM-dd');
      const label = timeRange <= 7 ? format(d, 'EEE') : format(d, 'dd/MM');
      dateKeyToLabel[dateKey] = label;
      data[dateKey] = 0;
    }
    
    filteredSessions.forEach(s => {
      const dateKey = format(new Date(s.date), 'yyyy-MM-dd');
      if (data[dateKey] !== undefined) {
        data[dateKey] += s.duration / 3600;
      }
    });

    return Object.entries(data).map(([key, hours]) => ({ 
      name: dateKeyToLabel[key] || key, 
      hours: parseFloat(hours.toFixed(2)) 
    }));
  }, [filteredSessions, timeRange]);

  // Calculate Pie Chart Data (Focus by Goal)
  const PIE_DATA = useMemo(() => {
    const goalFocus: Record<string, { value: number; color: string; hours: number }> = {};
    
    filteredSessions.forEach(s => {
      const goalId = s.goalId || 'general';
      const goal = goals.find(g => g.id === goalId);
      const name = goal ? goal.title : 'General';
      const color = goal ? goal.color : '#71717a';
      
      if (!goalFocus[name]) {
        goalFocus[name] = { value: 0, color, hours: 0 };
      }
      goalFocus[name].value += s.duration;
      goalFocus[name].hours += s.duration / 3600;
    });

    const total = Object.values(goalFocus).reduce((acc, curr) => acc + curr.value, 0);
    if (total === 0) return [];

    return Object.entries(goalFocus).map(([name, data]) => ({
      name,
      value: Math.round((data.value / total) * 100),
      hours: data.hours,
      color: data.color
    }));
  }, [filteredSessions, goals]);

  // Habit Deep Analysis
  const habitStats = useMemo(() => {
    return habits.map(h => {
      const habitSessions = sessions.filter(s => s.habitId === h.id);
      const periodSessions = habitSessions.filter(s => {
        const d = new Date(s.date);
        return isWithinInterval(d, { start: startDate, end: endDate });
      });
      
      const totalSeconds = periodSessions.reduce((acc, s) => acc + s.duration, 0);
      const completionCount = h.completedDates?.filter(dStr => {
        const d = new Date(dStr);
        return isWithinInterval(d, { start: startDate, end: endDate });
      }).length || 0;

      return {
        id: h.id,
        label: h.label,
        totalMins: Math.round(totalSeconds / 60),
        count: completionCount,
        goalId: h.goalId
      };
    });
  }, [habits, sessions, startDate, endDate]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.date) return false;
      const taskDate = new Date(t.date);
      return isWithinInterval(taskDate, { start: startDate, end: endDate });
    });
  }, [tasks, startDate, endDate]);

  // Task Performance Analysis
  const taskAnalysis = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.completed).length;
    const pending = total - completed;

    const taskEfficiency = filteredTasks.map(t => {
      const taskSessions = sessions.filter(s => s.taskId === t.id);
      const totalSeconds = taskSessions.reduce((acc, s) => acc + s.duration, 0);
      
      return {
        ...t,
        focusSeconds: totalSeconds,
        efficiency: totalSeconds === 0 ? 'untouched' : totalSeconds < 1800 ? 'fast' : 'heavy'
      };
    });

    return {
      total,
      completed,
      pending,
      efficiency: {
        fast: taskEfficiency.filter(t => t.completed && t.efficiency === 'fast').length,
        heavy: taskEfficiency.filter(t => t.completed && t.efficiency === 'heavy').length,
        untouched: taskEfficiency.filter(t => !t.completed && t.efficiency === 'untouched').length,
      }
    };
  }, [filteredTasks, sessions]);

  // Metrics Calculations
  const totalFocusSeconds = filteredSessions.reduce((acc, s) => acc + s.duration, 0);
  const totalHours = Math.floor(totalFocusSeconds / 3600);
  const totalMins = Math.floor((totalFocusSeconds % 3600) / 60);
  
  const avgSessionMins = filteredSessions.length > 0 
    ? Math.floor((totalFocusSeconds / filteredSessions.length) / 60) 
    : 0;

  // New Time-Based Goal Progress Logic:
  // (Completed tasks assigned to goals in period) / (Total tasks assigned to goals in period)
  const avgGoalProgress = useMemo(() => {
    const tasksInPeriodWithGoal = filteredTasks.filter(t => t.goalId);
    if (tasksInPeriodWithGoal.length === 0) return 0;
    
    const completedWithGoal = tasksInPeriodWithGoal.filter(t => t.completed).length;
    return Math.round((completedWithGoal / tasksInPeriodWithGoal.length) * 100);
  }, [filteredTasks]);

  const habitConsistency = useMemo(() => {
    if (habits.length === 0) return 0;
    let totalPossible = habits.length * timeRange;
    let actualCompleted = 0;
    
    habits.forEach(h => {
      const completedInPeriod = h.completedDates?.filter(dateStr => {
        const d = new Date(dateStr);
        return isWithinInterval(d, { start: startDate, end: endDate });
      }).length || 0;
      actualCompleted += completedInPeriod;
    });
    
    return Math.round((actualCompleted / totalPossible) * 100);
  }, [habits, timeRange, startDate, endDate]);

  if (isGuest) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-8 py-20">
        <div className="relative">
          <div className="w-32 h-32 bg-brand-primary/10 rounded-[3rem] flex items-center justify-center blur-2xl absolute inset-0 animate-pulse" />
          <div className="w-32 h-32 bg-white border-2 border-brand-primary/20 rounded-[3rem] flex items-center justify-center relative z-10 shadow-2xl">
            <Zap className="w-16 h-16 text-brand-primary fill-current" />
          </div>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-4xl font-black text-brand-text tracking-tight uppercase">Analytics Locked</h2>
          <p className="text-brand-text-light font-medium leading-relaxed">
            Guest accounts are restricted from accessing performance analytics. Create a full node to unlock deep data insights and discipline tracking.
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-10 py-4 bg-brand-primary text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          Initialize Full Node
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full space-y-12 pb-20">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-brand-text uppercase italic">
            Discipline <span className="text-brand-primary">Node</span>
          </h2>
          <p className="text-brand-text-light mt-1 font-medium tracking-wide">Performance data & neural efficiency tracking.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-brand-primary/10 p-1.5 rounded-2xl shadow-xl">
          <button 
            onClick={() => setTimeRange(7)}
            className={cn(
              "px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all",
              timeRange === 7 ? "bg-brand-primary text-white shadow-lg" : "text-brand-text-light hover:text-brand-primary"
            )}
          >
            7 Days
          </button>
          <button 
            onClick={() => setTimeRange(30)}
            className={cn(
              "px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all",
              timeRange === 30 ? "bg-brand-primary text-white shadow-lg" : "text-brand-text-light hover:text-brand-primary"
            )}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Focus" value={`${totalHours}h ${totalMins}m`} icon={<Clock className="text-brand-primary" />} desc={`${timeRange}d Aggregate`} />
        <MetricCard title="Habit Strength" value={`${habitConsistency}%`} icon={<Flame className="text-brand-orange" />} desc="Execution Rate" />
        <MetricCard title="Goal Progress" value={`${avgGoalProgress}%`} icon={<Target className="text-brand-blue" />} desc="Neural Completion" />
        <MetricCard title="Avg Session" value={`${avgSessionMins}m`} icon={<Zap className="text-brand-primary" />} desc="Focus Intensity" />
      </div>

      {/* Focus Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[3rem] p-5 md:p-10 shadow-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div>
              <h3 className="font-black text-xl text-brand-text uppercase tracking-tight flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-brand-primary" />
                Focus Distribution
              </h3>
              <p className="text-xs text-brand-text-light font-medium mt-1">Daily energy expenditure (Hours)</p>
            </div>
          </div>
          <div className="h-60 md:h-80 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E38569" vertical={false} opacity={0.1} />
                <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#4A352F', fontSize: 10, fontWeight: 800 }}
                   dy={15}
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#4A352F', fontSize: 10, fontWeight: 800 }}
                />
                <Tooltip 
                   cursor={{ fill: 'rgba(227,133,105,0.05)' }}
                   contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(227,133,105,0.2)', borderRadius: '24px', boxShadow: '0 20px 40px rgba(227,133,105,0.1)' }}
                   itemStyle={{ color: '#4A352F', fontSize: '12px', fontWeight: '900' }}
                />
                <Bar 
                   dataKey="hours" 
                   radius={[8, 8, 8, 8]} 
                   fill="#E38569"
                   barSize={32}
                >
                   {CHART_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === CHART_DATA.length - 1 ? '#E38569' : '#F5E8D3'} className="hover:fill-brand-primary transition-all duration-300" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[3rem] p-5 md:p-10 shadow-2xl relative overflow-hidden group">
          <h3 className="font-black text-xl text-brand-text mb-12 relative z-10 flex items-center gap-3 uppercase tracking-tight">
            <Target className="w-6 h-6 text-brand-blue" />
            Mission Load
          </h3>
          <div className="h-64 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={PIE_DATA.length > 0 ? PIE_DATA : [{ name: 'No Data', value: 100, color: '#F5E8D3' }]}
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={8}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1500}
                >
                  {(PIE_DATA.length > 0 ? PIE_DATA : [{ name: 'No Data', value: 100, color: '#F5E8D3' }]).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-brand-text tracking-tighter">{totalHours}h</span>
              <span className="text-[10px] text-brand-text-light font-black uppercase tracking-[0.2em]">Total</span>
            </div>
          </div>
          <div className="space-y-3 mt-10 relative z-10">
            {PIE_DATA.slice(0, 3).map((item) => (
              <div key={item.name} className="flex items-center justify-between bg-brand-bg/50 p-4 rounded-2xl border border-brand-primary/5">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full shadow-[0_0_12px_currentColor]" style={{ backgroundColor: item.color, color: item.color }} />
                  <span className="text-[11px] font-black text-brand-text-light uppercase tracking-widest truncate max-w-[140px]">{item.name}</span>
                </div>
                <span className="text-xs font-black text-brand-text">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deep Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Habit Consistency Analysis */}
        <div className="bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[3rem] p-5 md:p-10 shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <h3 className="font-black text-xl text-brand-text uppercase tracking-tight flex items-center gap-3">
              <Flame className="w-6 h-6 text-brand-orange" />
              Ritual Persistence
            </h3>
            <span className="text-[10px] font-black text-brand-text-light uppercase tracking-widest bg-brand-orange/5 px-4 py-1.5 rounded-full border border-brand-orange/10">
              Neural Habitats
            </span>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
            {habitStats.map(stat => (
              <div key={stat.id} className="bg-brand-bg/50 border border-brand-primary/5 rounded-[2rem] p-6 hover:border-brand-primary/20 transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-black text-brand-text uppercase tracking-wide group-hover:text-brand-primary transition-colors">{stat.label}</span>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-white border border-brand-primary/10 rounded-xl flex items-center gap-2">
                       <History className="w-3 h-3 text-brand-primary" />
                       <span className="text-[10px] font-black text-brand-text">{stat.count}x</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black text-brand-text-light uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5 text-brand-orange" />
                    <span>Total: {stat.totalMins} Minutes Focused</span>
                  </div>
                  <div className="w-24 h-1.5 bg-white border border-brand-primary/5 rounded-full overflow-hidden">
                     <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((stat.count / timeRange) * 100, 100)}%` }}
                        className="h-full bg-brand-orange"
                     />
                  </div>
                </div>
              </div>
            ))}
            {habits.length === 0 && <p className="text-center py-20 text-brand-text-light italic text-sm">No rituals initialized in the neural network.</p>}
          </div>
        </div>

        {/* Task Efficiency Analysis */}
        <div className="bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[3rem] p-5 md:p-10 shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <h3 className="font-black text-xl text-brand-text uppercase tracking-tight flex items-center gap-3">
              <ListTodo className="w-6 h-6 text-brand-primary" />
              Task Execution Node
            </h3>
            <span className="text-[10px] font-black text-brand-text-light uppercase tracking-widest bg-brand-primary/5 px-4 py-1.5 rounded-full border border-brand-primary/10">
              Efficiency Audit
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-6 mb-10">
            <div className="p-6 bg-brand-green/5 border border-brand-green/10 rounded-[2rem] text-center">
              <p className="text-[10px] font-black text-brand-green uppercase tracking-widest mb-2">Fast Exec</p>
              <p className="text-3xl font-black text-brand-text">{taskAnalysis.efficiency.fast}</p>
              <p className="text-[8px] font-bold text-brand-text-light mt-1 uppercase leading-tight">{"< 30m Focus"}</p>
            </div>
            <div className="p-6 bg-brand-orange/5 border border-brand-orange/10 rounded-[2rem] text-center">
              <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-2">Heavy Load</p>
              <p className="text-3xl font-black text-brand-text">{taskAnalysis.efficiency.heavy}</p>
              <p className="text-[8px] font-bold text-brand-text-light mt-1 uppercase leading-tight">{"> 30m Focus"}</p>
            </div>
            <div className="p-6 bg-brand-primary/5 border border-brand-primary/10 rounded-[2rem] text-center">
              <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-2">Ignored</p>
              <p className="text-3xl font-black text-brand-text">{taskAnalysis.efficiency.untouched}</p>
              <p className="text-[8px] font-bold text-brand-text-light mt-1 uppercase leading-tight">Zero Sessions</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-black text-brand-text-light uppercase tracking-[0.2em] mb-4 px-2">
              <span>Overall Integrity</span>
              <span>{taskAnalysis.completed} / {taskAnalysis.total} Nodes Done</span>
            </div>
            <div className="h-4 bg-brand-bg border border-brand-primary/10 rounded-full overflow-hidden">
               <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${taskAnalysis.total > 0 ? (taskAnalysis.completed / taskAnalysis.total) * 100 : 0}%` }}
                  className="h-full bg-brand-primary relative"
               >
                 <div className="absolute inset-0 bg-white/20 animate-pulse" />
               </motion.div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8">
               <div className="p-6 bg-white border border-brand-primary/10 rounded-[2rem] shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-green" />
                    <span className="text-[10px] font-black text-brand-text uppercase tracking-widest">Completed</span>
                  </div>
                  <p className="text-2xl font-black text-brand-text">{taskAnalysis.completed}</p>
               </div>
               <div className="p-6 bg-white border border-brand-primary/10 rounded-[2rem] shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <History className="w-4 h-4 text-brand-orange" />
                    <span className="text-[10px] font-black text-brand-text uppercase tracking-widest">Pending</span>
                  </div>
                  <p className="text-2xl font-black text-brand-text">{taskAnalysis.pending}</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, desc }: { title: string, value: string, icon: React.ReactNode, desc?: string }) {
  return (
    <div className="bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[3rem] p-5 md:p-10 shadow-2xl group hover:border-brand-primary/20 transition-all relative overflow-hidden">
      <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-125 group-hover:opacity-10 transition-all duration-700 hidden md:block">
        {React.cloneElement(icon as React.ReactElement, { size: 80 })}
      </div>
      <div className="relative z-10">
        <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-brand-bg flex items-center justify-center mb-4 md:mb-8 border border-brand-primary/10 group-hover:scale-110 group-hover:bg-brand-primary/5 transition-all">
          {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5 md:w-7 md:h-7' })}
        </div>
        <p className="text-[9px] md:text-[10px] font-black text-brand-text-light uppercase tracking-[0.15em] md:tracking-[0.2em] mb-1">{title}</p>
        <p className="text-2xl md:text-4xl font-black text-brand-text tracking-tighter">{value}</p>
        {desc && <p className="text-[8px] md:text-[9px] font-bold text-brand-text-light/60 uppercase tracking-widest mt-1 md:mt-2">{desc}</p>}
      </div>
    </div>
  );
}

