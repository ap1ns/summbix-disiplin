import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Task, FocusSession, Goal } from '../types';
import { Archive, CheckCircle2, Clock, Calendar, Search } from 'lucide-react';
import { cn } from '../lib/utils';

interface HistoryViewProps {
  tasks: Task[];
  sessions: FocusSession[];
  goals: Goal[];
}

export default function HistoryView({ tasks, sessions, goals }: HistoryViewProps) {
  
  // Combine archived tasks and sessions into a single timeline
  const timelineEvents = useMemo(() => {
    const events: any[] = [];
    
    // Add completed or expired tasks
    const now = new Date();
    tasks.forEach(task => {
      let isArchived = task.completed;
      let sortDate = task.date || now.toISOString().split('T')[0];
      
      if (!isArchived && task.date) {
        const taskDate = new Date(task.date);
        if (task.endTime) {
          const [h, m] = task.endTime.split(':').map(Number);
          taskDate.setHours(h, m, 0, 0);
        } else {
          taskDate.setHours(23, 59, 59, 999);
        }
        if (now.getTime() > taskDate.getTime()) {
          isArchived = true;
        }
      }
      
      if (isArchived) {
        events.push({
          id: `task-${task.id}`,
          type: 'task',
          title: task.title,
          status: task.completed ? 'completed' : 'expired',
          date: sortDate,
          time: task.endTime || '23:59',
          goalId: task.goalId
        });
      }
    });

    // Add sessions
    sessions.forEach(session => {
      events.push({
        id: `session-${session.id}`,
        type: 'session',
        title: session.title,
        status: 'completed',
        date: session.date.split('T')[0],
        time: new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        goalId: session.goalId,
        duration: session.duration
      });
    });

    // Group by Date
    const grouped: Record<string, any[]> = {};
    events.forEach(e => {
      if (!grouped[e.date]) grouped[e.date] = [];
      grouped[e.date].push(e);
    });

    // Sort dates descending
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    
    // Sort events within each date by time descending
    sortedDates.forEach(date => {
      grouped[date].sort((a, b) => b.time.localeCompare(a.time));
    });

    return { grouped, sortedDates };
  }, [tasks, sessions]);

  const { grouped, sortedDates } = timelineEvents;

  const totalCompleted = tasks.filter(t => t.completed).length;
  const totalFocusHours = Math.floor(sessions.reduce((acc, s) => acc + s.duration, 0) / 3600);

  return (
    <div className="flex h-full w-full gap-8 pt-4">
      
      <div className="flex-1 flex flex-col h-full bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="shrink-0 p-5 md:p-10 lg:p-14 border-b border-brand-primary/5 relative overflow-hidden bg-gradient-to-br from-brand-primary/5 to-transparent">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-primary/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
          
          <div className="relative z-10 flex items-center gap-4 md:gap-8">
            <div className="w-14 h-14 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center shrink-0 bg-brand-primary text-white shadow-2xl shadow-brand-primary/30 transform rotate-3">
              <Archive className="w-7 h-7 md:w-12 md:h-12" />
            </div>
            <div>
              <h1 className="text-2xl md:text-5xl font-black text-brand-text tracking-tight mb-1 md:mb-3">The Archive</h1>
              <p className="text-brand-text-light text-sm md:text-xl font-medium hidden md:block">Your legacy of discipline and conquered challenges.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-8 mt-5 md:mt-12 relative z-10">
            <div className="bg-white border border-brand-primary/10 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm">
              <p className="text-[9px] md:text-[10px] font-black text-brand-text-light uppercase tracking-[0.2em] mb-1 md:mb-2">Tasks Conquered</p>
              <p className="text-2xl md:text-4xl font-black text-brand-text">{totalCompleted}</p>
            </div>
            <div className="bg-white border border-brand-primary/10 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm">
              <p className="text-[9px] md:text-[10px] font-black text-brand-text-light uppercase tracking-[0.2em] mb-1 md:mb-2">Deep Work</p>
              <p className="text-2xl md:text-4xl font-black text-brand-text">{totalFocusHours} <span className="text-sm md:text-lg text-brand-text-light">hours</span></p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-10 lg:p-14 relative bg-white">
          {sortedDates.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Archive className="w-32 h-32 text-brand-bg mb-8" />
              <h2 className="text-3xl font-black text-brand-text mb-3">The Archive is Empty</h2>
              <p className="text-brand-text-light max-w-sm text-lg">Complete tasks or focus sessions to build your legacy.</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-brand-primary/20 before:to-transparent">
              {sortedDates.map((date, dateIdx) => (
                <div key={date} className="relative mb-20 last:mb-0">
                  {/* Date Badge */}
                  <div className="flex items-center justify-center mb-12 sticky top-0 z-20">
                    <div className="bg-brand-text text-white px-8 py-3 rounded-full shadow-2xl shadow-brand-text/20 ">
                      <span className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-brand-primary" />
                        {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Events */}
                  <div className="space-y-10">
                    {grouped[date].map((item, idx) => {
                      const goal = goals.find(g => g.id === item.goalId);
                      const color = goal ? goal.color : '#8C7A74';

                      return (
                        <motion.div 
                          key={item.id}
                          initial={{ opacity: 0, x: idx % 2 === 0 ? 20 : -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
                        >
                          {/* Timeline Dot */}
                          <div className="flex items-center justify-center w-12 h-12 rounded-full border-[6px] border-white shadow-xl shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" style={{ backgroundColor: color }}>
                            {item.status === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            ) : (
                              <div className="w-3 h-3 rounded-full bg-white/50" />
                            )}
                          </div>
                          
                          {/* Card */}
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 rounded-[2rem] bg-brand-bg/40 border border-brand-primary/5 transition-all hover:bg-white hover:shadow-2xl hover:shadow-brand-primary/10 hover:translate-y-[-4px]" style={{ borderLeft: `4px solid ${color}` }}>
                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-brand-text-light mb-3">
                              <Clock className="w-3.5 h-3.5" /> {item.time}
                              {goal && (
                                <>
                                  <span className="opacity-30">|</span>
                                  <span style={{ color }}>{goal.title}</span>
                                </>
                              )}
                            </div>
                            <h4 className={cn("text-xl font-black text-brand-text tracking-tight", item.status === 'expired' && "text-brand-text-light/50 line-through")}>
                              {item.title}
                            </h4>
                            {item.type === 'session' && (
                              <div className="mt-4 flex items-center gap-3">
                                <div className="px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-black uppercase tracking-wider">
                                  Focused for {Math.floor(item.duration / 60)}m
                                </div>
                              </div>
                            )}
                            {item.status === 'expired' && (
                              <div className="mt-3 text-[10px] font-black text-brand-red uppercase tracking-[0.2em]">
                                Expired / Missed
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
