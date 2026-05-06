import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Calendar, Target, BarChart3, History, Timer, Zap, ChevronRight, ListTodo, Repeat, User } from 'lucide-react';
import { AppView } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

export default function Sidebar({ currentView, setView }: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'habits', label: 'Habits', icon: Repeat },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'history', label: 'History', icon: History },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="relative z-50 h-screen flex items-center pl-6">
      {/* The Floating Precision Blade */}
      <nav className={cn(
        "w-[92px] h-[92vh] bg-brand-primary/95 backdrop-blur-2xl rounded-[3rem] shadow-[20px_0_60px_rgba(227,133,105,0.2)] flex flex-col py-10 items-center relative overflow-visible"
      )}>
        {/* Animated Background Grain/Shine */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-[3rem]" />
        
        {/* Logo Section - PERFECTLY CENTERED */}
        <div className="mb-12 relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center transition-transform hover:rotate-12 duration-500">
            <Zap className="w-7 h-7 text-brand-primary fill-current" />
          </div>
          <div className="mt-3 text-[10px] font-black tracking-[0.2em] text-white/40 uppercase">Summbix</div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 w-full px-4 space-y-6 relative z-10 flex flex-col items-center">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <div
                key={item.id}
                className="relative group/item outline-none"
              >
                <button
                  onClick={() => setView(item.id as AppView)}
                  className={cn(
                    "relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                    isActive 
                      ? "bg-white text-brand-primary shadow-lg scale-110" 
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon className="w-6 h-6" />
                </button>
                
                {/* Floating Label (Appears on Hover with 3s delay) */}
                <div className="absolute left-[calc(100%+1.5rem)] top-1/2 -translate-y-1/2 opacity-0 -translate-x-4 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300 delay-0 group-hover/item:delay-[3000ms] pointer-events-none z-50">
                  <div className="bg-white text-brand-primary px-4 py-2 rounded-xl shadow-2xl border border-brand-primary/5 whitespace-nowrap relative">
                    <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                    {/* Tooltip Arrow */}
                    <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-white rotate-45" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Focus Action */}
        <div className="mt-auto relative z-10">
          <div className="group/focus relative">
            <button
              onClick={() => setView('focus')}
              className={cn(
                "w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all duration-500",
                "bg-white/10 hover:bg-white hover:shadow-2xl hover:scale-110 group"
              )}
            >
              <Timer className="w-7 h-7 text-white group-hover:text-brand-primary transition-colors" />
            </button>
            
            {/* Floating Label with 3s delay */}
            <div className="absolute left-[calc(100%+1.5rem)] top-1/2 -translate-y-1/2 opacity-0 -translate-x-4 group-hover/focus:opacity-100 group-hover/focus:translate-x-0 transition-all duration-300 delay-0 group-hover/focus:delay-[3000ms] pointer-events-none z-50">
              <div className="bg-brand-primary text-white px-5 py-2.5 rounded-xl shadow-2xl border border-white/20 whitespace-nowrap relative">
                <span className="text-xs font-black uppercase tracking-widest">Deep Focus</span>
                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-brand-primary rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
