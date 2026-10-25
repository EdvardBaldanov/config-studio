import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X, LucideIcon } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};

// Global singleton bridge so non-React code (e.g. plugin manager) can trigger toasts directly
let globalToastHandler: ((msg: string, type: ToastType, title?: string) => void) | null = null;

export const showGlobalToast = (message: string, type: ToastType = 'info', title?: string) => {
  if (globalToastHandler) {
    globalToastHandler(message, type, title);
  } else {
    console.log(`[Toast ${type}]:`, message);
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-4), { id, message, type, title }]);
  }, []);

  const success = useCallback((msg: string, title?: string) => toast(msg, 'success', title), [toast]);
  const error = useCallback((msg: string, title?: string) => toast(msg, 'error', title), [toast]);
  const warning = useCallback((msg: string, title?: string) => toast(msg, 'warning', title), [toast]);
  const info = useCallback((msg: string, title?: string) => toast(msg, 'info', title), [toast]);

  // Connect global handler
  globalToastHandler = toast;

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const toastConfig: Record<
  ToastType,
  {
    icon: LucideIcon;
    bg: string;
    border: string;
    iconColor: string;
    textColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-950/90 dark:bg-[#0c1e17]/95',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    textColor: 'text-emerald-200',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-rose-950/90 dark:bg-[#200f13]/95',
    border: 'border-rose-500/30',
    iconColor: 'text-rose-400',
    textColor: 'text-rose-200',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-950/90 dark:bg-[#23180c]/95',
    border: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    textColor: 'text-amber-200',
  },
  info: {
    icon: Info,
    bg: 'bg-gray-900/95 dark:bg-[#161b22]/95',
    border: 'border-base-border',
    iconColor: 'text-accent',
    textColor: 'text-gray-200',
  },
};

export const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastCard: React.FC<{
  item: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ item, onDismiss }) => {
  const cfg = toastConfig[item.type];
  const Icon = cfg.icon;
  const timerRef = useRef<any>(null);

  const startTimer = () => {
    timerRef.current = setTimeout(() => {
      onDismiss(item.id);
    }, item.duration || 3500);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  React.useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [item.id]);

  return (
    <div
      onMouseEnter={stopTimer}
      onMouseLeave={startTimer}
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200 ${cfg.bg} ${cfg.border}`}
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${cfg.iconColor}`} />
      <div className="flex-1 min-w-0 pr-1">
        {item.title && (
          <h5 className="text-xs font-bold text-white mb-0.5">{item.title}</h5>
        )}
        <p className={`text-xs leading-relaxed ${cfg.textColor}`}>{item.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
};
