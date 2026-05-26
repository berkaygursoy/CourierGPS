import { forwardRef } from 'react';

export const Select = forwardRef(function Select({ className = '', error, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`h-9 px-3 font-mono text-[12px] bg-canvas text-paper border focus:outline-none focus:border-signal transition-colors ${
        error ? 'border-signal' : 'border-rule'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});
