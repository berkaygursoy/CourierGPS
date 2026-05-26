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
      className={`m-auto p-0 border border-rule bg-canvas text-paper w-full ${widthClass} backdrop:bg-canvas/70 backdrop:backdrop-blur-sm`}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-rule">
        <h2 className="font-display italic text-2xl leading-none">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-dim hover:text-paper text-xl leading-none transition-colors cursor-pointer"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="p-5 text-[13px]">{children}</div>
      {footer && (
        <div className="px-5 py-4 border-t border-rule flex justify-end gap-3 bg-canvas-2">
          {footer}
        </div>
      )}
    </dialog>
  );
}
