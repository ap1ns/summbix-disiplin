import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onAlternative?: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  alternativeLabel?: string;
  type?: 'danger' | 'warning' | 'primary';
}

import Portal from './Portal';

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onAlternative,
  title, 
  message, 
  confirmLabel = 'Confirm', 
  cancelLabel = 'Cancel',
  alternativeLabel,
  type = 'primary'
}: ConfirmationModalProps) {
  const colors = {
    danger: 'bg-brand-red text-white shadow-brand-red/20',
    warning: 'bg-brand-orange text-white shadow-brand-orange/20',
    primary: 'bg-brand-primary text-white shadow-brand-primary/20'
  };

  const iconColors = {
    danger: 'bg-brand-red/10 text-brand-red',
    warning: 'bg-brand-orange/10 text-brand-orange',
    primary: 'bg-brand-primary/10 text-brand-primary'
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-brand-text/60 "
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white border border-brand-primary/10 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden"
            >
              <button onClick={onClose} className="absolute top-6 right-6 p-2 text-brand-text-light hover:text-brand-primary transition-colors">
                <X className="w-5 h-5" />
              </button>

              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6", iconColors[type])}>
                <AlertCircle className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black text-brand-text mb-4 uppercase tracking-tight">{title}</h3>
              <p className="text-sm text-brand-text-light mb-8 font-medium leading-relaxed">
                {message}
              </p>

              <div className="flex flex-col gap-3">
                {onAlternative && alternativeLabel ? (
                  <>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => { onConfirm(); onClose(); }}
                        className={cn("flex-1 py-4 font-black rounded-2xl hover:opacity-90 transition-all shadow-lg uppercase tracking-widest text-xs", colors[type])}
                      >
                        {confirmLabel}
                      </button>
                      <button 
                        onClick={() => { onAlternative(); onClose(); }}
                        className="flex-1 py-4 bg-brand-primary/10 text-brand-primary font-black rounded-2xl hover:bg-brand-primary/20 border border-brand-primary/10 transition-all uppercase tracking-widest text-xs"
                      >
                        {alternativeLabel}
                      </button>
                    </div>
                    <button 
                      onClick={onClose}
                      className="w-full py-4 bg-brand-bg text-brand-text-light font-black rounded-2xl hover:bg-white border border-brand-primary/5 transition-all uppercase tracking-widest text-xs"
                    >
                      {cancelLabel}
                    </button>
                  </>
                ) : (
                  <div className="flex gap-3">
                    <button 
                      onClick={onClose}
                      className="flex-1 py-4 bg-brand-bg text-brand-text-light font-black rounded-2xl hover:bg-white border border-brand-primary/5 transition-all uppercase tracking-widest text-xs"
                    >
                      {cancelLabel}
                    </button>
                    <button 
                      onClick={() => { onConfirm(); onClose(); }}
                      className={cn("flex-1 py-4 font-black rounded-2xl hover:opacity-90 transition-all shadow-lg uppercase tracking-widest text-xs", colors[type])}
                    >
                      {confirmLabel}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

// Helper to use the same cn utility
import { cn } from '../lib/utils';
