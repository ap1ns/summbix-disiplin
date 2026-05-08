import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'motion/react';
import { 
  LayoutDashboard, Calendar, Target, BarChart3, History, Timer, 
  ListTodo, Repeat, User, MoreHorizontal, X, Sparkles, Zap,
  Globe, Wallet, Bell, Camera, Youtube, Coins, CircleDollarSign
} from 'lucide-react';
import { AppView } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

/**
 * Magnetic Button Component
 * Makes icons pull towards the cursor for a premium tactile feel
 */
function MagneticButton({ children, onClick, isActive, label }: { children: React.ReactNode, onClick: () => void, isActive: boolean, label?: string, key?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150 };
  const tx = useSpring(mouseX, springConfig);
  const ty = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    mouseX.set(x * 0.4);
    mouseY.set(y * 0.4);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleTap = () => {
    onClick();
    // Subtle haptic vibration simulation
    if (window.navigator.vibrate) {
      window.navigator.vibrate(5);
    }
  };

  return (
    <div className="relative group/mag">
      <motion.button
        style={{ x: tx, y: ty }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleTap}
        whileTap={{ scale: 0.85, rotate: [0, -5, 5, 0] }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
        className={cn(
          "relative z-10 w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all duration-300",
          isActive ? "text-white" : "text-brand-text-light hover:text-brand-primary"
        )}
      >
        <div className="relative z-20">{children}</div>
        
        {isActive && (
          <motion.div
            layoutId="desktop-active-blob"
            className="absolute inset-0 bg-gradient-to-br from-brand-primary via-[#FF9E7D] to-brand-orange rounded-[2rem] shadow-[0_15px_35px_rgba(227,133,105,0.4)]"
            transition={{ type: "spring", damping: 18, stiffness: 120 }}
          >
            <motion.div 
              animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="absolute inset-0 bg-white/20 blur-md rounded-[2rem]" 
            />
          </motion.div>
        )}

        <motion.div 
          className="absolute inset-0 bg-brand-primary/5 rounded-[2rem] opacity-0 group-hover/mag:opacity-100 transition-opacity"
        />
      </motion.button>

      {label && (
        <div className="absolute left-[calc(100%+1.5rem)] top-1/2 -translate-y-1/2 opacity-0 -translate-x-4 group-hover/mag:opacity-100 group-hover/mag:translate-x-0 transition-all duration-300 pointer-events-none z-50">
          <div className="bg-brand-text text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 whitespace-nowrap relative">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
            <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-brand-text rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
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
      {/* ===== HYPER-ANIMATED DESKTOP SIDEBAR ===== */}
      <div className="relative z-50 h-screen items-center pl-6 hidden md:flex">
        <motion.nav 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-[100px] h-[96vh] bg-white/70 backdrop-blur-3xl rounded-[4rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] flex flex-col py-10 items-center relative overflow-visible border border-white/50"
        >
          {/* Neural Network Particles Decoration */}
          <div className="absolute inset-0 overflow-hidden rounded-[4rem] pointer-events-none opacity-20">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 180, 270, 360],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-20 -left-20 w-40 h-40 bg-brand-primary/20 blur-3xl rounded-full" 
            />
          </div>
          
          {/* Logo Area */}
          <div className="mb-14 relative z-10">
            <motion.div 
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              transition={{ duration: 0.5 }}
              onClick={() => setView('dashboard')}
              className="w-18 h-18 rounded-[2.5rem] bg-gradient-to-br from-brand-primary via-[#FF9E7D] to-brand-orange shadow-2xl flex items-center justify-center overflow-hidden p-4 group/logo cursor-pointer"
            >
              <img src="/logo_putih.png" alt="Summbix" className="w-full h-full object-contain relative z-10" />
              <motion.div 
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-white/30"
              />
            </motion.div>
            <div className="mt-4 flex flex-col items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-brand-primary" />
              <div className="text-[8px] font-black tracking-[0.5em] text-brand-primary uppercase">Core</div>
            </div>
          </div>

          {/* Magnetic Nav Items */}
          <div className="flex-1 w-full px-4 space-y-4 relative z-10 flex flex-col items-center overflow-y-auto scrollbar-hide py-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <MagneticButton 
                  key={item.id} 
                  onClick={() => setView(item.id as AppView)} 
                  isActive={isActive}
                  label={item.label}
                >
                  <Icon className={cn("w-6 h-6 transition-all duration-500", isActive ? "scale-110 rotate-0" : "group-hover/mag:rotate-6")} />
                </MagneticButton>
              );
            })}
          </div>

          {/* Focus Engine Hub */}
          <div className="mt-auto mb-4 relative z-10 pt-8 border-t border-brand-primary/10 w-full flex flex-col items-center gap-4">
             <div className="text-[7px] font-black text-brand-text-light/40 uppercase tracking-[0.4em]">Engine</div>
             <motion.button
              whileHover={{ scale: 1.15, rotate: 10 }}
              whileTap={{ scale: 0.85 }}
              onClick={() => setView('focus')}
              className={cn(
                "w-18 h-18 rounded-[2.8rem] flex items-center justify-center transition-all duration-700 relative group overflow-hidden",
                currentView === 'focus'
                  ? "bg-brand-text text-white shadow-[0_20px_45px_rgba(0,0,0,0.3)]"
                  : "bg-white border-2 border-brand-primary/20 text-brand-primary hover:border-brand-primary shadow-xl"
              )}
            >
              <Timer className="w-8 h-8 relative z-10" />
              <motion.div 
                animate={currentView === 'focus' ? { opacity: [0.1, 0.3, 0.1] } : { opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-brand-primary"
              />
              
              {/* Particle System for Focus Button */}
              <AnimatePresence>
                {currentView === 'focus' && (
                  <>
                    <motion.div 
                      layoutId="focus-ring-ext"
                      className="absolute -inset-2 border border-brand-primary/30 rounded-[3rem] animate-[ping_4s_infinite]" 
                    />
                    {[...Array(4)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          y: [-20, -60],
                          x: [(i - 1.5) * 15, (i - 1.5) * 25],
                          opacity: [0, 1, 0],
                          scale: [0, 1, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                        className="absolute w-1 h-1 bg-brand-primary rounded-full blur-[1px]"
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.nav>
      </div>

      {/* ===== THEMED HEXAGONAL MOBILE DOCK ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pb-6">
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
                initial={{ y: '110%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '110%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-24 left-4 right-4 z-20"
              >
                <div className="bg-white/95 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[2.5rem] overflow-hidden p-6">
                  <div className="flex items-center justify-between mb-6 px-2">
                    <h3 className="text-xs font-black text-brand-primary uppercase tracking-[0.2em]">Modules</h3>
                    <button onClick={() => setIsMoreOpen(false)} className="text-brand-text-light hover:text-brand-primary">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {moreItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleMobileNav(item.id)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-3xl transition-all",
                            isActive ? "bg-brand-primary/10 text-brand-primary" : "text-brand-text-light hover:bg-brand-bg"
                          )}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white h-[85px] flex items-center justify-around relative px-2">
          {mobileNavPrimary.map((item) => {
            const Icon = item.icon;
            const isActive = item.isMore ? isMoreActive : currentView === item.id;
            const isFocus = !!item.isFocus;

            if (isFocus) {
              return (
                <div key={item.id} className="relative -mt-10">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setView('focus')}
                    className="w-[75px] h-[85px] flex items-center justify-center relative z-20"
                    style={{
                      filter: 'drop-shadow(0 12px 20px rgba(255, 142, 158, 0.4))'
                    }}
                  >
                    <div 
                      className={cn(
                        "absolute inset-0 transition-colors duration-500",
                        currentView === 'focus' ? "bg-brand-text" : "bg-brand-primary"
                      )}
                      style={{
                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                      }}
                    />
                    <Timer className="w-8 h-8 text-white relative z-10" />
                    {currentView === 'focus' && (
                      <motion.div 
                        layoutId="mobile-focus-glow"
                        animate={{ opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-white/20"
                        style={{
                          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                        }}
                      />
                    )}
                  </motion.button>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleMobileNav(item.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center w-14 h-full transition-all duration-300",
                  isActive ? "text-brand-primary" : "text-brand-text-light opacity-60"
                )}
              >
                <Icon className={cn("w-6 h-6 mb-1 transition-transform", isActive && "scale-110 -translate-y-1")} />
                <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="mobile-dot"
                    className="absolute bottom-3 w-1 h-1 rounded-full bg-brand-primary"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
