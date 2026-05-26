const tones = {
  /* On dark surfaces */
  neutral: 'border-rule text-paper',
  signal:  'border-signal text-signal',
  moss:    'border-moss text-moss',
  dim:     'border-rule text-dim',
  /* On paper surfaces */
  ink:     'border-rule-2 text-ink',
};

export function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2 h-5 font-mono text-[10px] uppercase tracking-[0.18em] border ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
