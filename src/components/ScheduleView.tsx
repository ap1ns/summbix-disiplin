import React, { useState, useMemo } from 'react';
import { Task, Habit, FocusSession, Goal } from '../types';
import { format, addDays, subDays, isSameDay, isToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Target, Calendar as CalendarIcon, CheckCircle2, Layout } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ScheduleViewProps {
  tasks: Task[];
  habits: Habit[];
  sessions: FocusSession[];
  goals: Goal[];
}

type ScheduleEvent = {
  id: string;
  type: 'task' | 'habit';
  title: string;
  start?: string;
  end?: string;
  color: string;
  completed: boolean;
  goalTitle?: string;
  goalColor?: string;
  priority?: string;
};

export default function ScheduleView({ tasks, habits, sessions, goals }: ScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const hasTasksForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return tasks.some(t => t.date === dateStr);
  };

  const getItemsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dTasks = tasks.filter(t => t.date === dateStr);
    
    const events: ScheduleEvent[] = [];
    
    dTasks.forEach(t => {
      const goal = goals.find(g => g.id === t.goalId);
      events.push({
        id: t.id,
        type: 'task',
        title: t.title || 'Untitled Mission',
        start: t.startTime,
        end: t.endTime,
        color: goal ? goal.color : (t.priority === 'high' ? '#E38569' : t.priority === 'medium' ? '#F4A261' : '#E38569'),
        completed: t.completed,
        goalTitle: goal?.title,
        goalColor: goal?.color,
        priority: t.priority
      });
    });

    habits.forEach(h => {
      const goal = goals.find(g => g.id === h.goalId);
      const isCompleted = h.done || h.completedDates?.includes(dateStr);
      events.push({
        id: h.id,
        type: 'habit',
        title: h.label || 'Untitled Ritual',
        start: (h as any).startTime,
        end: (h as any).endTime,
        color: goal ? goal.color : '#10B981',
        completed: !!isCompleted,
        goalTitle: goal?.title,
        goalColor: goal?.color
      });
    });

    return events;
  };

  const selectedEvents = useMemo(() => getItemsForDate(selectedDate), [selectedDate, tasks, habits, goals]);
  
  const scheduledEvents = selectedEvents.filter(e => e.start).sort((a, b) => a.start!.localeCompare(b.start!));
  const allUnscheduledEvents = selectedEvents.filter(e => !e.start);

  const groupedEvents = useMemo(() => {
    return scheduledEvents.reduce((acc, ev) => {
      if (!acc[ev.start!]) acc[ev.start!] = [];
      acc[ev.start!].push(ev);
      return acc;
    }, {} as Record<string, ScheduleEvent[]>);
  }, [scheduledEvents]);

  const sortedTimes = Object.keys(groupedEvents).sort();

  return (
    <div className="relative w-full h-full pt-4 pb-20">
      {/* Decorative BGs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-primary/5 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-blue/5 blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3" />
      </div>

      <div className="flex flex-col md:flex-row items-end justify-between mb-12 relative z-10">
        <div className="space-y-2">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1.2rem] bg-white border border-brand-primary/10 flex items-center justify-center shadow-sm">
              <CalendarIcon className="w-6 h-6 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-brand-text">Timeline <span className="text-brand-primary/40">Nexus</span></h2>
              <p className="text-[10px] text-brand-text-light font-black uppercase tracking-[0.3em] mt-1 opacity-60">Chronological Operations</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10 items-start">
        {/* Left Column: Calendar & Flexible */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-8">
          {/* Calendar */}
          <div className="bg-white border border-brand-primary/10 rounded-[1.8rem] md:rounded-[2.5rem] p-5 md:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-brand-text tracking-tighter">
                {format(calendarMonth, 'MMMM')} <span className="text-brand-primary/40">{format(calendarMonth, 'yyyy')}</span>
              </h3>
              <div className="flex gap-1">
                <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-2 bg-brand-bg rounded-xl text-brand-text-light hover:text-brand-primary transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-2 bg-brand-bg rounded-xl text-brand-text-light hover:text-brand-primary transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-[9px] font-black text-brand-text-light/50 uppercase tracking-widest text-center">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(date => {
                const isSelected = isSameDay(date, selectedDate);
                const isCurrentMonth = isSameMonth(date, calendarMonth);
                const isTodayDate = isToday(date);
                const hasTask = hasTasksForDate(date);
                
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => {
                      setSelectedDate(date);
                      if (!isSameMonth(date, calendarMonth)) setCalendarMonth(date);
                    }}
                    className={cn(
                      "relative aspect-square flex flex-col items-center justify-center rounded-2xl text-xs font-black transition-all hover:scale-105 active:scale-95",
                      !isCurrentMonth ? "text-brand-text-light/20" : "text-brand-text",
                      isSelected ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30" : "hover:bg-brand-bg",
                      isTodayDate && !isSelected ? "ring-2 ring-brand-primary/20 bg-brand-primary/5 text-brand-primary" : ""
                    )}
                  >
                    <span className="relative z-10">{format(date, 'd')}</span>
                    {hasTask && (
                      <div className={cn(
                        "absolute bottom-2 w-1.5 h-1.5 rounded-full transition-colors",
                        isSelected ? "bg-white" : "bg-brand-primary"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flexible Missions */}
          <div className="bg-white border border-brand-primary/10 rounded-[1.8rem] md:rounded-[2.5rem] p-5 md:p-8 shadow-xl">
            <h3 className="text-sm font-black text-brand-text uppercase tracking-widest mb-6 flex items-center gap-3">
              <Layout className="w-4 h-4 text-brand-primary" />
              Flexible Missions
            </h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
              {allUnscheduledEvents.length > 0 ? (
                allUnscheduledEvents.map(event => (
                  <div key={event.id} className={cn(
                    "p-4 rounded-2xl border bg-brand-bg/50 transition-all relative overflow-hidden",
                    event.completed ? "opacity-60 bg-brand-bg grayscale-[0.5]" : "border-brand-primary/10 hover:bg-white hover:shadow-md"
                  )}>
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-bold text-brand-text truncate decoration-2",
                          event.completed && "line-through text-brand-text-light italic"
                        )}>
                          {event.title}
                        </p>
                        {event.goalTitle && (
                          <p className={cn(
                            "text-[8px] font-black uppercase tracking-widest mt-0.5 truncate",
                            event.completed ? "line-through opacity-40" : ""
                          )} style={{ color: event.goalColor }}>
                            {event.goalTitle}
                          </p>
                        )}
                      </div>
                      {event.completed && <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-center font-black text-brand-text-light/40 uppercase tracking-widest py-8">
                  No flexible missions
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Timeline Agenda */}
        <div className="lg:col-span-8 xl:col-span-9">
          <div className="bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[3rem] p-5 md:p-10 shadow-2xl min-h-[400px] md:min-h-[600px]">
            <div className="flex items-center justify-between mb-12 border-b border-brand-primary/5 pb-8">
              <div>
                <h3 className="text-2xl font-black text-brand-text tracking-tighter">
                  {format(selectedDate, 'EEEE, MMMM d')}
                </h3>
                <p className="text-xs font-black text-brand-text-light uppercase tracking-widest mt-2">
                  {scheduledEvents.length} Scheduled Events
                </p>
              </div>
              <button 
                onClick={() => setSelectedDate(new Date())} 
                className={cn(
                  "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                  isToday(selectedDate) ? "bg-brand-bg text-brand-text-light cursor-default" : "bg-brand-primary text-white hover:shadow-lg hover:shadow-brand-primary/20"
                )}
              >
                Go to Today
              </button>
            </div>

            {scheduledEvents.length > 0 ? (
              <div className="relative">
                {/* The continuous vertical track line */}
                <div className="absolute left-[70px] top-4 bottom-4 w-0.5 bg-brand-primary/10 rounded-full" />
                
                <div className="space-y-10">
                  {sortedTimes.map((time, idx) => (
                    <div key={time} className="relative pl-[110px] min-h-[60px]">
                      {/* Time Label */}
                      <div className="absolute left-0 top-3 w-[50px] text-right">
                        <span className="text-xs font-black text-brand-text-light/80 tracking-wide">{time}</span>
                      </div>
                      
                      {/* Track Node */}
                      <div className="absolute left-[66px] top-4 w-2.5 h-2.5 rounded-full bg-brand-primary ring-4 ring-white shadow-sm z-10" />
                      
                      {/* Event Cards for this time */}
                      <div className="space-y-4">
                        {groupedEvents[time].map(event => (
                          <div 
                            key={event.id}
                            className={cn(
                              "p-5 rounded-3xl border border-brand-primary/5 bg-white shadow-sm transition-all hover:shadow-lg relative overflow-hidden group",
                              event.completed ? "opacity-60 bg-brand-bg/40 grayscale-[0.3]" : "hover:bg-brand-bg/5"
                            )}
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: event.color }} />
                            
                            {event.completed && (
                              <div className="absolute right-4 top-4 px-3 py-1 bg-brand-green/10 rounded-full flex items-center gap-2">
                                <span className="text-[8px] font-black text-brand-green uppercase tracking-widest">Completed</span>
                                <CheckCircle2 className="w-3 h-3 text-brand-green" />
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                              <div className="pl-2">
                                <h4 className={cn(
                                  "text-lg font-black text-brand-text tracking-tight transition-colors group-hover:text-brand-primary decoration-2",
                                  event.completed && "line-through text-brand-text-light italic"
                                )}>
                                  {event.title}
                                </h4>
                                {event.goalTitle && (
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <Target className={cn("w-3 h-3", event.completed && "opacity-30")} style={{ color: event.goalColor }} />
                                    <span className={cn(
                                      "text-[10px] font-black uppercase tracking-widest",
                                      event.completed ? "line-through opacity-40" : ""
                                    )} style={{ color: event.goalColor }}>
                                      {event.goalTitle}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all",
                                  event.type === 'habit' ? "bg-brand-orange/10 text-brand-orange border-brand-orange/20" : "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
                                  event.completed && "opacity-40 grayscale"
                                )}>
                                  {event.type === 'habit' ? 'Ritual' : 'Mission'}
                                </span>
                                {event.end && (
                                  <span className={cn(
                                    "text-xs font-bold text-brand-text-light flex items-center gap-1 bg-brand-bg px-3 py-1.5 rounded-xl",
                                    event.completed && "opacity-30 line-through"
                                  )}>
                                    <Clock className="w-3.5 h-3.5" />
                                    {event.start} - {event.end}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 rounded-[2rem] bg-brand-bg flex items-center justify-center mb-6 border border-brand-primary/10">
                  <Layout className="w-10 h-10 text-brand-primary/40" />
                </div>
                <h4 className="text-xl font-black text-brand-text uppercase tracking-widest">Clear Schedule</h4>
                <p className="text-xs text-brand-text-light font-medium mt-2 max-w-xs">No timed events scheduled for this day. Check your flexible missions or take a break.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
