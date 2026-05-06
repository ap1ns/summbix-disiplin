import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Bell, Search, Command, Target, CheckCircle2, X, Info, Flame, Calendar, Clock, User, LogOut, Camera, Save, RefreshCw } from 'lucide-react';
import { Goal, Task, AppView, Notification, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  goals: Goal[];
  tasks: Task[];
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onNavigate: (view: AppView) => void;
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onLogout: () => void;
}

export default function Header({ goals, tasks, notifications, onMarkRead, onNavigate, profile, onUpdateProfile, onLogout }: HeaderProps) {
  const [time, setTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAvatarUrl = (seed: string) => {
    if (seed.startsWith('data:image')) return seed;
    return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
  };

  const filteredResults = searchQuery.length >= 2 ? {
    goals: goals.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase())),
    tasks: tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
  } : { goals: [], tasks: [] };

  const hasResults = filteredResults.goals.length > 0 || filteredResults.tasks.length > 0;
  const unreadCount = notifications.filter(n => !n.read).length;

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="relative z-40 w-full pt-8 pb-4 pointer-events-none mb-6">
      <div className="h-24 bg-white border border-brand-primary/10 rounded-[2.5rem] flex items-center justify-between px-10 shadow-[0_20px_60px_rgba(0,0,0,0.06)] pointer-events-auto relative overflow-visible">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black tracking-tight text-brand-text leading-tight">
              {getGreeting()}, <span className="text-gradient">{profile.name}</span>
            </h2>
            <div className="flex items-center gap-3 mt-1 opacity-60">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/60">
                 {format(time, 'EEE, MMM do')}
               </p>
               <div className="w-1 h-1 rounded-full bg-brand-primary/40" />
               <p className="text-[10px] font-bold text-brand-text/40 tabular-nums">
                 {format(time, 'HH:mm')}
               </p>
            </div>
          </div>
        </div>

      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="relative group hidden md:block" ref={searchRef}>
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className={cn("w-4 h-4 transition-colors", isSearchFocused ? "text-brand-primary" : "text-brand-text-light")} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search missions..."
            className="w-80 bg-white/50 border border-white/40 rounded-[2rem] py-3.5 pl-12 pr-12 text-sm text-brand-text focus:outline-none focus:ring-8 focus:ring-brand-primary/5 focus:bg-white focus:border-brand-primary/20 transition-all placeholder:text-brand-text-light/50 font-bold shadow-sm"
          />
          <div className="absolute inset-y-0 right-4 flex items-center">
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-brand-bg rounded-xl text-brand-text-light transition-all">
                <X className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-brand-bg/50 px-2 py-1 rounded-lg border border-brand-primary/5">
                <Command className="w-3.5 h-3.5 text-brand-text-light" />
                <span className="text-[10px] text-brand-text-light font-black">K</span>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchFocused && searchQuery.length >= 2 && (
            <div className="absolute top-full mt-4 left-0 w-full bg-white/90 backdrop-blur-3xl border border-white/40 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] overflow-hidden z-50">
              <div className="max-h-[32rem] overflow-y-auto p-4 custom-scrollbar">
                {!hasResults && (
                  <div className="p-12 text-center">
                    <Search className="w-10 h-10 text-brand-bg mx-auto mb-4 opacity-50" />
                    <p className="text-xs text-brand-text-light font-black uppercase tracking-[0.2em]">Void Detected</p>
                  </div>
                )}

                {filteredResults.goals.length > 0 && (
                  <div className="mb-4">
                    <p className="px-4 py-3 text-[10px] font-black text-brand-text-light uppercase tracking-[0.3em]">Objectives</p>
                    {filteredResults.goals.map(goal => (
                      <button 
                        key={goal.id} 
                        onClick={() => { onNavigate('goals'); setIsSearchFocused(false); setSearchQuery(''); }}
                        className="w-full flex items-center gap-4 p-4 hover:bg-white rounded-3xl transition-all group text-left shadow-sm hover:shadow-md border border-transparent hover:border-brand-primary/5 mb-2"
                      >
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner" style={{ backgroundColor: `${goal.color}15`, color: goal.color }}>
                          <Target className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-brand-text group-hover:text-brand-primary transition-colors">{goal.title}</p>
                          <p className="text-[10px] text-brand-text-light font-bold uppercase tracking-wider">Goal • {goal.progress}% Mastery</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {filteredResults.tasks.length > 0 && (
                  <div>
                    <p className="px-4 py-3 text-[10px] font-black text-brand-text-light uppercase tracking-[0.3em]">Missions</p>
                    {filteredResults.tasks.map(task => (
                      <button 
                        key={task.id} 
                        onClick={() => { onNavigate('schedule'); setIsSearchFocused(false); setSearchQuery(''); }}
                        className="w-full flex items-center gap-4 p-4 hover:bg-white rounded-3xl transition-all group text-left shadow-sm hover:shadow-md border border-transparent hover:border-brand-primary/5 mb-2"
                      >
                        <div className="w-10 h-10 rounded-2xl bg-brand-bg border border-brand-primary/5 flex items-center justify-center shrink-0">
                          <CheckCircle2 className={cn("w-5 h-5", task.completed ? "text-brand-green" : "text-brand-text-light")} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-brand-text group-hover:text-brand-primary transition-colors">{task.title}</p>
                          <p className="text-[10px] text-brand-text-light font-bold uppercase tracking-wider">Task • {task.priority} Priority</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={cn(
              "p-4 rounded-[1.5rem] border transition-all relative group shadow-sm",
              isNotifOpen ? "bg-brand-primary border-brand-primary text-white shadow-brand-primary/20 scale-110" : "bg-white/50 border-white/40 hover:bg-white text-brand-text-light hover:shadow-md"
            )}
          >
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 bg-white rounded-full border-2 border-brand-primary shadow-sm animate-pulse" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute top-full mt-4 right-0 w-96 bg-white/90 backdrop-blur-3xl border border-white/40 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] overflow-hidden z-50">
              <div className="p-6 border-b border-brand-bg flex items-center justify-between bg-brand-bg/20">
                <h3 className="text-xs font-black text-brand-text uppercase tracking-[0.3em]">Oracle Updates</h3>
                {unreadCount > 0 && <span className="text-[10px] font-black bg-brand-primary text-white px-3 py-1 rounded-full uppercase tracking-widest">{unreadCount} New</span>}
              </div>
              <div className="max-h-[32rem] overflow-y-auto custom-scrollbar p-2">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center">
                    <Bell className="w-10 h-10 text-brand-bg mx-auto mb-4 opacity-50" />
                    <p className="text-xs text-brand-text-light font-black uppercase tracking-[0.2em]">Silence is Discipline</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map(notif => (
                      <button 
                        key={notif.id}
                        onClick={() => onMarkRead(notif.id)}
                        className={cn(
                          "w-full p-5 flex gap-5 hover:bg-white rounded-[2rem] transition-all text-left relative overflow-hidden border border-transparent hover:border-brand-primary/5",
                          !notif.read && "bg-brand-primary/5"
                        )}
                      >
                        {!notif.read && <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-brand-primary rounded-full" />}
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                          notif.type === 'system' ? "bg-brand-bg text-brand-text-light" :
                          notif.type === 'task' ? "bg-brand-blue/10 text-brand-blue" :
                          notif.type === 'goal' ? "bg-brand-green/10 text-brand-green" :
                          "bg-brand-orange/10 text-brand-orange"
                        )}>
                          {notif.type === 'system' && <Info className="w-6 h-6" />}
                          {notif.type === 'task' && <CheckCircle2 className="w-6 h-6" />}
                          {notif.type === 'goal' && <Target className="w-6 h-6" />}
                          {notif.type === 'habit' && <Flame className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-brand-text mb-1">{notif.title}</p>
                          <p className="text-[11px] text-brand-text-light line-clamp-2 leading-relaxed font-medium">{notif.message}</p>
                          <p className="text-[10px] font-black text-brand-primary/60 uppercase tracking-[0.2em] mt-3">{notif.time}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button 
            onClick={() => onNavigate('profile')}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-orange p-[2px] hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-xl shadow-brand-primary/20"
          >
            <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center overflow-hidden">
               <img 
                src={getAvatarUrl(profile.avatar)} 
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </button>
        </div>
      </div>
    </div>
    </header>
  );
}
