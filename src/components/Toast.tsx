/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        let bg = 'bg-slate-800 border-slate-700 text-slate-100';
        let Icon = Info;
        let iconColor = 'text-indigo-400';

        if (toast.type === 'success') {
          bg = 'bg-emerald-950/90 border-emerald-700 text-emerald-100';
          Icon = CheckCircle2;
          iconColor = 'text-emerald-400';
        } else if (toast.type === 'warning') {
          bg = 'bg-amber-950/90 border-amber-700 text-amber-100';
          Icon = AlertTriangle;
          iconColor = 'text-amber-400';
        } else if (toast.type === 'error') {
          bg = 'bg-rose-950/90 border-rose-700 text-rose-100';
          Icon = XCircle;
          iconColor = 'text-rose-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-xl backdrop-blur transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${bg}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="text-sm font-medium leading-relaxed flex-1 break-words">
              {toast.message}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
