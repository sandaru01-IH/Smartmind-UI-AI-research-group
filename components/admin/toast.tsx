'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

type Kind = 'success' | 'error';
interface Toast {
  id: number;
  kind: Kind;
  message: string;
}
const Ctx = createContext<{ push: (message: string, kind?: Kind) => void }>({ push: () => undefined });

export const useToast = () => useContext(Ctx);

/** Toast feedback. Messages are announced politely (errors assertively) and dismiss themselves. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (message: string, kind: Kind = 'success') => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-3), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 4000);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-sharp border bg-surface p-3 shadow-lg ${
              t.kind === 'error' ? 'border-danger' : 'border-line-strong'
            }`}
          >
            {t.kind === 'error' ? (
              <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-danger" />
            ) : (
              <CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-flood-ink" />
            )}
            <p className="flex-1 text-[0.95rem]">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="-m-2 inline-flex h-11 w-11 items-center justify-center text-muted hover:text-fg"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
