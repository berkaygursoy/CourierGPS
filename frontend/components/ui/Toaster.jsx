'use client';

import { useEffect, useState } from 'react';

const listeners = new Set();
let nextId = 1;

export function toast({ tone = 'error', title, body }) {
  const id = nextId++;
  const t = { id, tone, title, body };
  listeners.forEach((fn) => fn({ type: 'add', toast: t }));
  setTimeout(() => {
    listeners.forEach((fn) => fn({ type: 'remove', id }));
  }, 5000);
}

const toneStyles = {
  error: 'border-red-200 bg-red-50 text-red-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  info: 'border-zinc-200 bg-white text-zinc-900',
};

export function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const fn = (evt) => {
      if (evt.type === 'add') setToasts((t) => [...t, evt.toast]);
      if (evt.type === 'remove') setToasts((t) => t.filter((x) => x.id !== evt.id));
    };
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  function dismiss(id) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto cursor-pointer rounded-md border shadow-sm px-3 py-2 ${toneStyles[t.tone]}`}
        >
          {t.title && <div className="text-sm font-medium">{t.title}</div>}
          {t.body && <div className="text-xs mt-0.5 opacity-80">{t.body}</div>}
        </div>
      ))}
    </div>
  );
}
