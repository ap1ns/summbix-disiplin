import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Calendar, Target, BarChart3, History, Timer, ListTodo, Repeat, User, MoreHorizontal, X, Sparkles } from 'lucide-react';
import { AppView } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

export default function Sidebar({ currentView, setView }: SidebarProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'habits', label: 'Habits', icon: Repeat },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'history', label: 'History', icon: History },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const mobileNavPrimary = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'focus', label: 'Focus', icon: Timer, isFocus: true },
    { id: 'habits', label: 'Habits', icon: Repeat },
    { id: 'more', label: 'More', icon: MoreHorizontal, isMore: true },
  ];

  const moreItems = [
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'history', label: 'History', icon: History },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const isMoreActive = moreItems.some(item => currentView === item.id);

  const handleMobileNav = (id: string) => {
    if (id === 'more') {
      setIsMoreOpen(!isMoreOpen);
    } else {
      setView(id as AppView);
      setIsMoreOpen(false);
    }
  };

  return (
    <>
      {/* ===== PREMIUM DESKTOP SIDEBAR ===== */}
      <div className="relative z-50 h-screen items-center pl-6 hidden md:flex">
        <nav className="w-[94px] h-[96vh] bg-white/80 backdrop-blur-3xl rounded-[3.5rem] shadow-[0_20px_80px_rgba(0,0,0,0.08)] flex flex-col py-10 items-center relative overflow-visible border border-white/40">
          
          {/* Logo Area with Neural Pulse */}
          <div className="mb-14 relative z-10">
            <motion.div 
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="w-18 h-18 rounded-[2.2rem] bg-gradient-to-br from-brand-primary to-brand-orange shadow-2xl flex items-center justify-center overflow-hidden p-4 group/logo relative"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
              <img src="/logo_putih.png" alt="Summbix" className="w-full h-full object-contain relative z-10" />
            </motion.div>
            <div className="mt-4 text-[9px] font-black tracking-[0.4em] text-brand-primary/40 uppercase text-center">Summbix</div>
          </div>

          {/* Nav Container */}
          <div className="flex-1 w-full px-4 space-y-3 relative z-10 flex flex-col items-center overflow-y-auto scrollbar-hide py-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <div key={item.id} className="relative group/item">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setView(item.id as AppView)}
                    className={cn(
                      "relative z-10 w-16 h-16 rounded-[1.8rem] flex items-center justify-center transition-colors duration-500",
                      isActive ? "text-white" : "text-brand-text-light hover:text-brand-primary hover:bg-brand-primary/5"
                    )}
                  >
                    <Icon className={cn("w-6 h-6 relative z-20 transition-transform duration-500", isActive && "scale-110")} />
                    
                    {/* Liquid Active Indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="desktop-active-blob"
                        className="absolute inset-0 bg-gradient-to-br from-brand-primary to-brand-orange rounded-[1.8rem] shadow-[0_10px_25px_rgba(227,133,105,0.3)]"
                        transition={{ type: "spring", damping: 18, stiffness: 120 }}
                      >
                        <motion.div 
                          animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.05, 1] }}
                          transition={{ repeat: Infinity, duration: 3 }}
                          className="absolute inset-0 bg-white/20 blur-sm rounded-[1.8rem]" 
                        />
                      </motion.div>
                    )}
                  </motion.button>

                  {/* Tooltip */}
                  <div className="absolute left-[calc(100%+1.5rem)] top-1/2 -translate-y-1/2 opacity-0 -translate-x-4 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-300 pointer-events-none z-50">
                    <div className="bg-brand-text text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 whitespace-nowrap relative">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                      <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-brand-text rotate-45" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Focus Hub */}
          <div className="mt-auto mb-4 relative z-10 pt-6 border-t border-brand-primary/5 w-full flex justify-center">
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setView('focus')}
              className={cn(
                "w-18 h-18 rounded-[2.2rem] flex items-center justify-center transition-all duration-500 border-2 relative group",
                currentView === 'focus'
                  ? "bg-brand-primary text-white border-brand-primary shadow-[0_15px_35px_rgba(227,133,105,0.4)]"
                  : "bg-white border-brand-primary/20 text-brand-primary hover:border-brand-primary shadow-lg"
              )}
            >
              <div className="absolute inset-0 rounded-[2.2rem] bg-gradient-to-br from-brand-primary to-brand-orange opacity-0 group-hover:opacity-10 transition-opacity" />
              <Timer className="w-8 h-8 relative z-10" />
              {currentView === 'focus' && (
                <motion.div 
                  layoutId="focus-ring"
                  className="absolute -inset-1.5 border-2 border-brand-primary/30 rounded-[2.5rem] animate-[ping_3s_infinite]" 
                />
              )}
            </motion.button>
          </div>
        </nav>
      </div>

      {/* ===== ANIMATED MOBILE BOTTOM NAV ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <AnimatePresence>
          {isMoreOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMoreOpen(false)}
                className="fixed inset-0 z-10 bg-brand-text/40 backdrop-blur-md"
              />
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-[100px]"
              >
                <div className="bg-white/90 backdrop-blur-3xl rounded-[2.5rem] border border-white shadow-[0_-20px_60px_rgba(0,0,0,0.15)] overflow-hidden">
                  <div className="p-2 flex justify-center">
                    <div className="w-12 h-1.5 bg-brand-primary/10 rounded-full" />
                  </div>
                  <div className="px-8 pt-2 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-brand-primary" />
                      <h3 className="text-xs font-black text-brand-text uppercase tracking-[0.2em]">Navigation Hub</h3>
                    </div>
                    <button onClick={() => setIsMoreOpen(false)} className="w-10 h-10 flex items-center justify-center bg-brand-bg rounded-full text-brand-text-light hover:text-brand-primary transition-all">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2 p-6 pt-2">
                    {moreItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleMobileNav(item.id)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all",
                            isActive ? "bg-brand-primary/10 text-brand-primary" : "text-brand-text-light hover:bg-brand-bg"
                          )}
                        >
                          <div className={cn("p-3 rounded-xl transition-all", isActive ? "bg-white shadow-md scale-110" : "bg-transparent")}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Floating Dock Bar */}
        <div className="px-4 pb-4">
          <div className="bg-white/80 backdrop-blur-2xl rounded-[2.8rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white h-[84px] relative flex items-center justify-around px-2">
            {mobileNavPrimary.map((item) => {
              const Icon = item.icon;
              const isActive = item.isMore ? isMoreActive : currentView === item.id;
              const isFocus = !!item.isFocus;
              const isMore = !!item.isMore;

              return (
                <button
                  key={item.id}
                  onClick={() => handleMobileNav(item.id)}
                  className="relative flex flex-col items-center justify-center w-14 h-full group"
                >
                  {/* Fluid Background Indicator */}
                  {isActive && !isFocus && (
                    <motion.div
                      layoutId="mobile-active-blob"
                      className="absolute inset-x-1 inset-y-3 bg-brand-primary/10 rounded-[1.8rem]"
                      transition={{ type: "spring", damping: 20, stiffness: 150 }}
                    />
                  )}

                  <div className={cn(
                    "relative z-10 flex flex-col items-center gap-1 transition-all duration-300",
                    isActive && !isFocus ? "scale-110" : "scale-100",
                    isFocus ? "-mt-10" : ""
                  )}>
                    {isFocus ? (
                      <motion.div 
                        whileTap={{ scale: 0.9 }}
                        className={cn(
                          "w-18 h-18 rounded-[2.2rem] flex items-center justify-center border-4 border-white shadow-[0_15px_40px_rgba(227,133,105,0.4)] transition-all",
                          currentView === 'focus' ? "bg-brand-primary text-white" : "bg-white text-brand-primary"
                        )}
                      >
                        <Timer className="w-8 h-8" />
                        {currentView === 'focus' && (
                           <motion.div 
                            layoutId="mobile-focus-glow"
                            className="absolute -inset-1 bg-brand-primary/20 blur-md rounded-full -z-10" 
                           />
                        )}
                      </motion.div>
                    ) : (
                      <>
                        <Icon className={cn(
                          "w-6 h-6 transition-colors duration-300",
                          isActive ? "text-brand-primary" : "text-brand-text-light"
                        )} />
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-wider leading-none",
                          isActive ? "text-brand-primary" : "text-brand-text-light opacity-60"
                        )}>
                          {item.label}
                        </span>
                        {isActive && (
                          <motion.div 
                            layoutId="mobile-dot"
                            className="w-1.5 h-1.5 rounded-full bg-brand-primary absolute -bottom-3" 
                          />
                        )}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
