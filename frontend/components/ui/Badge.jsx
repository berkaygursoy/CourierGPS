const tones = {
  zinc:    'bg-zinc-100 text-zinc-700',
  blue:    'bg-blue-50 text-blue-700',
  indigo:  'bg-indigo-50 text-indigo-700',
  amber:   'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  red:     'bg-red-50 text-red-700',
};

export function Badge({ tone = 'zinc', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 h-5 rounded-full text-[10px] font-medium uppercase tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
