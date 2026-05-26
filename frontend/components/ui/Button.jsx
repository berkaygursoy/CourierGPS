export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center font-mono uppercase tracking-[0.18em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2 cursor-pointer';
  const sizes = {
    sm: 'h-8 px-3 text-[10px]',
    md: 'h-9 px-4 text-[11px]',
    lg: 'h-10 px-5 text-xs',
  };
  const variants = {
    primary:   'bg-signal text-canvas hover:bg-signal-d',
    secondary: 'bg-canvas-2 text-paper border border-rule hover:border-paper/40',
    ghost:     'text-paper hover:bg-canvas-2',
    paper:     'bg-paper text-ink border border-rule-2 hover:bg-paper-2',
    danger:    'bg-signal-d text-paper hover:bg-signal',
  };
  return (
    <button
      type={type}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
