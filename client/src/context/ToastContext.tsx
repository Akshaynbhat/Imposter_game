import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (!message) return;
    const id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    
    setToasts((prev) => {
      // Avoid duplicate consecutive toasts
      if (prev.length > 0 && prev[prev.length - 1].message === message) {
        return prev;
      }
      return [...prev.slice(-3), { id, message, type }]; // Keep max 4 visible
    });

    setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, [removeToast]);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo }}>
      {children}

      {/* Global Toast Container - Top Center */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -25, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-center justify-between gap-3 w-full px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl ${
                toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-900/30'
                  : toast.type === 'error'
                  ? 'bg-rose-950/90 border-rose-500/50 text-rose-200 shadow-rose-900/30'
                  : 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200 shadow-indigo-900/30'
              }`}
            >
              <div className="flex items-center gap-2.5 font-semibold text-xs sm:text-sm leading-tight">
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
                <span>{toast.message}</span>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
