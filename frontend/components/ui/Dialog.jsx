'use client';

import { useEffect, useRef } from 'react';

export function Dialog({ open, onClose, title, children, footer, widthClass = 'max-w-md' }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    function onCancel(e) {
      e.preventDefault();
      onClose?.();
    }
    function onClick(e) {
      if (e.target === d) onClose?.();
    }
    d.addEventListener('cancel', onCancel);
    d.addEventListener('click', onClick);
    return () => {
      d.removeEventListener('cancel', onCancel);
      d.removeEventListener('click', onClick);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={`m-auto p-0 rounded-lg shadow-xl border border-zinc-200 bg-white text-zinc-900 w-full ${widthClass} backdrop:bg-zinc-900/40`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-700 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="p-4">{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-zinc-200 flex justify-end gap-2 bg-zinc-50">
          {footer}
        </div>
      )}
    </dialog>
  );
}
