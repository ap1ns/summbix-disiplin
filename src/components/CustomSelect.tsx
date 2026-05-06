import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface Option {
  id: string;
  title: string;
  color?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
  label?: string;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export default function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  label, 
  className,
  icon,
  disabled 
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.id === value);

  return (
    <div className={cn("relative w-full", className, disabled && "opacity-60 cursor-not-allowed")}>
      {label && <label className="block text-[10px] font-black text-brand-text-light uppercase tracking-widest mb-2 px-1">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-16 bg-white border border-brand-primary/10 rounded-[2rem] px-8 text-sm text-brand-text flex items-center justify-between focus:outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all shadow-sm group hover:border-brand-primary/20 disabled:pointer-events-none"
      >
        <div className="flex items-center gap-4 truncate">
          {icon && <div className="text-brand-text-light group-hover:text-brand-primary transition-colors">{icon}</div>}
          {selectedOption?.color && (
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedOption.color }} />
          )}
          <span className={cn("font-bold transition-colors truncate", !selectedOption && "text-brand-text-light/40")}>
            {selectedOption ? selectedOption.title : placeholder}
          </span>
        </div>
        <ChevronRight className={cn("w-5 h-5 text-brand-text-light transition-transform duration-300 shrink-0", isOpen ? "rotate-90 text-brand-primary" : "group-hover:text-brand-primary")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute left-0 right-0 mt-3 p-2 bg-white border border-brand-primary/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[70] max-h-64 overflow-y-auto custom-scrollbar"
            >
              {options.map((opt, idx) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { onChange(opt.id); setIsOpen(false); }}
                  className={cn(
                    "w-full text-left px-5 py-4 rounded-2xl text-sm font-black transition-all flex items-center justify-between group/opt",
                    idx !== options.length - 1 && "mb-1",
                    value === opt.id ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-brand-text-light hover:bg-brand-bg hover:text-brand-text"
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    {opt.color && <div className={cn("w-2 h-2 rounded-full", value === opt.id ? "bg-white" : "")} style={{ backgroundColor: value === opt.id ? undefined : opt.color }} />}
                    <span className="truncate uppercase tracking-widest text-[11px]">{opt.title}</span>
                  </div>
                  {value === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
