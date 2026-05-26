import { forwardRef } from 'react';

export const Select = forwardRef(function Select({ className = '', error, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={`h-9 px-3 text-sm rounded-md border bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
        error ? 'border-red-400' : 'border-zinc-200'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});
