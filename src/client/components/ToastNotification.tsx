'use client';

import { useGameStore } from '../store/gameStore';

export function ToastNotification() {
  const toasts = useGameStore((state) => state.toasts);
  const removeToast = useGameStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((toast) => {
        let borderCol = 'border-blue-500/40 bg-zinc-900/90 text-blue-200';
        let icon = 'ℹ️';

        if (toast.type === 'success') {
          borderCol = 'border-emerald-500/40 bg-zinc-900/90 text-emerald-200';
          icon = '✅';
        } else if (toast.type === 'error') {
          borderCol = 'border-red-500/40 bg-zinc-900/90 text-red-200';
          icon = '⚠️';
        }

        return (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto select-none p-3.5 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center gap-3 text-xs transition-all animate-in slide-in-from-right-8 duration-200 cursor-pointer ${borderCol}`}
          >
            <span className="text-base">{icon}</span>
            <span className="flex-1 font-medium">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
