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
        "w-[88px] h-[94vh] bg-brand-primary/95 backdrop-blur-2xl rounded-[3.5rem] shadow-[25px_0_70px_rgba(227,133,105,0.25)] flex flex-col py-12 items-center relative overflow-visible border border-white/10"
      )}>
        {/* Animated Background Grain/Shine */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none rounded-[3.5rem]" />
        
        {/* Logo Section */}
        <div className="mb-14 relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-[2rem] bg-white shadow-2xl flex items-center justify-center transition-all hover:scale-110 hover:rotate-6 duration-500 overflow-hidden p-3 group/logo">
            <img src="/logo_hitam.png" alt="Summbix Logo" className="w-full h-full object-contain group-hover/logo:scale-110 transition-transform" />
          </div>
          <div className="mt-4 text-[9px] font-black tracking-[0.3em] text-white/50 uppercase">Summbix</div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 w-full px-4 space-y-4 relative z-10 flex flex-col items-center">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <div
                key={item.id}
                className="relative group/item"
              >
                <button
                  onClick={() => setView(item.id as AppView)}
                  className={cn(
                    "relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-400 overflow-hidden",
                    isActive 
                      ? "bg-white text-brand-primary shadow-[0_10px_25px_rgba(0,0,0,0.1)] scale-110" 
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon className={cn("w-6 h-6 transition-transform duration-500", isActive ? "scale-110" : "group-hover/item:scale-110")} />
                  {isActive && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute inset-0 bg-white"
                      style={{ zIndex: -1 }}
                    />
                  )}
                </button>
                
                {/* Side Indicator Line for Active */}
                {isActive && (
                  <motion.div 
                    layoutId="side-indicator"
                    className="absolute -right-5 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                  />
                )}
                
                {/* Tooltip Label */}
                <div className="absolute left-[calc(100%+1.5rem)] top-1/2 -translate-y-1/2 opacity-0 -translate-x-4 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300 pointer-events-none z-50">
                  <div className="bg-white text-brand-primary px-4 py-2.5 rounded-xl shadow-2xl border border-brand-primary/5 whitespace-nowrap relative">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                    <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-white rotate-45" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Focus Action */}
        <div className="mt-auto mb-8 relative z-10">
          <div className="group/focus relative">
            <button
              onClick={() => setView('focus')}
              className={cn(
                "w-16 h-16 rounded-[2.2rem] flex items-center justify-center transition-all duration-500 border-2",
                currentView === 'focus' 
                  ? "bg-white text-brand-primary border-white shadow-2xl scale-110"
                  : "bg-white/10 border-white/10 text-white hover:bg-white hover:text-brand-primary hover:border-white hover:shadow-2xl hover:scale-110"
              )}
            >
              <Timer className="w-7 h-7" />
            </button>
            
            {/* Tooltip for Focus */}
            <div className="absolute left-[calc(100%+1.5rem)] top-1/2 -translate-y-1/2 opacity-0 -translate-x-4 group-hover/focus:opacity-100 group-hover/focus:translate-x-0 transition-all duration-300 pointer-events-none z-50">
              <div className="bg-brand-primary text-white px-5 py-3 rounded-xl shadow-2xl border border-white/20 whitespace-nowrap relative">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Deep Focus</span>
                <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-brand-primary rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
