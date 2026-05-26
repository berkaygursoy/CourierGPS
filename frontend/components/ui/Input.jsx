import { forwardRef } from 'react';

export const Input = forwardRef(function Input({ className = '', error, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`h-9 px-3 font-mono text-[12px] bg-canvas text-paper border placeholder:text-dim focus:outline-none focus:border-signal transition-colors ${
        error ? 'border-signal' : 'border-rule'
      } ${className}`}
      {...props}
    />
  );
});
