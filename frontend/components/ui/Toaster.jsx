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
  error:   'border-signal text-paper bg-canvas',
  success: 'border-moss text-paper bg-canvas',
  info:    'border-rule text-paper bg-canvas-2',
};

const toneAccent = {
  error:   'bg-signal',
  success: 'bg-moss',
  info:    'bg-dim',
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
    <div className="fixed top-[76px] right-[396px] z-50 flex flex-col gap-2 w-80 pointer-events-none">
      {toasts.slice(-3).map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto cursor-pointer border px-4 py-3 flex gap-3 ${toneStyles[t.tone]}`}
        >
          <span className={`w-[2px] -my-3 -ml-4 mr-1 ${toneAccent[t.tone]}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            {t.title && <div className="font-mono text-[11px] uppercase tracking-[0.18em]">{t.title}</div>}
            {t.body && <div className="text-[12px] mt-1 text-dim">{t.body}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
