"use client";

// Lightweight, dependency-free toast system.
//
// Usage in any client component:
//   const { notify } = useToast();
//   notify("success", "Property created.");
//   notify("error", "Failed to sync calendar. Check the URL.");
//
// Mounted once at the app root (see app/layout.tsx), so it is available
// everywhere without extra setup.

import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = { id: number; type: ToastType; message: string };

type ToastContextValue = {
  notify: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  // Fail soft: if the provider is somehow missing, no-op instead of throwing.
  return ctx ?? { notify: () => {} };
}

const TYPE_STYLES: Record<ToastType, string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-800",
  error: "border-rose-300 bg-rose-50 text-rose-800",
  info: "border-slate-300 bg-white text-slate-800",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    // Auto-dismiss after 5 seconds.
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-md ${TYPE_STYLES[toast.type]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
