
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    show: boolean;
    message: string;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ show, message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, onClose, duration]);

    if (!show) return null;

    const bgColors = {
        success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800',
        error: 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/50',
        info: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/50',
        warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/50'
    };

    const iconColors = {
        success: 'text-emerald-600 dark:text-emerald-400',
        error: 'text-rose-600 dark:text-rose-400',
        info: 'text-indigo-600 dark:text-indigo-400',
        warning: 'text-amber-600 dark:text-amber-400'
    };

    const Icons = {
        success: CheckCircle,
        error: AlertCircle,
        info: Info,
        warning: AlertCircle
    };

    const Icon = Icons[type];

    return (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[30000] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`flex items-center gap-3 px-6 py-4 rounded-[1.5rem] border shadow-2xl backdrop-blur-md ${bgColors[type]}`}>
                <Icon size={20} className={iconColors[type]} />
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
                    {message}
                </p>
                <button 
                    onClick={onClose}
                    className="ml-2 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                >
                    <X size={14} className="text-slate-400" />
                </button>
            </div>
        </div>
    );
};
