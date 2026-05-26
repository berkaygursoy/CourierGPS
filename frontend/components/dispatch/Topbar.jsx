'use client';

import { useEffect, useState } from 'react';

function Kpi({ value, label, delta, deltaTone = 'neutral', urgent }) {
  const deltaColor = {
    up:      'text-signal',
    down:    'text-moss',
    neutral: 'text-paper',
  }[deltaTone];
  return (
    <div className="grid grid-cols-[auto_1fr] items-end gap-3.5 px-5 h-full">
      <span
        className={`font-display italic leading-[0.85] tracking-[-0.02em] pb-2 ${
          urgent ? 'text-signal' : 'text-paper'
        }`}
        style={{ fontSize: '56px' }}
      >
        {String(value).padStart(2, '0')}
      </span>
      <div className="pb-3">
        <span className="block font-mono text-[10px] uppercase tracking-[0.22em] text-dim">
          {label}
        </span>
        {delta && (
          <div className="font-mono text-[11px] text-paper mt-0.5">
            <span className={deltaColor}>{delta.value}</span>
            {delta.suffix && ` ${delta.suffix}`}
          </div>
        )}
      </div>
    </div>
  );
}

export function Topbar({ kpis, operator }) {
  const [clock, setClock] = useState('');

  useEffect(() => {
    function tick() {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const s = String(d.getSeconds()).padStart(2, '0');
      setClock(`${h}:${m}:${s}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="grid grid-cols-[280px_1fr_280px] border-b border-rule bg-canvas">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 border-r border-rule">
        <div
          className="w-7 h-7 grid place-items-center bg-signal text-canvas font-display italic text-[22px] leading-none pb-1"
          aria-hidden="true"
        >
          D
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-paper">
            Dispatch
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
            {operator.sector}
          </div>
        </div>
      </div>

      {/* KPI lockup — the differentiation anchor */}
      <div className="grid grid-cols-[1fr_1px_1fr_1px_1fr] items-center">
        <Kpi
          value={kpis.pending}
          label="Pending"
          urgent
          delta={{ value: `+${kpis.pendingDelta}`, suffix: 'in last 5m' }}
          deltaTone="up"
        />
        <div className="bg-rule h-full" />
        <Kpi
          value={kpis.idle}
          label="Idle Couriers"
          delta={{ value: `avg ${kpis.avgRadiusKm}km` }}
        />
        <div className="bg-rule h-full" />
        <Kpi
          value={kpis.inTransit}
          label="In Transit"
          delta={{ value: `${kpis.etaDelta}m`, suffix: 'avg ETA' }}
          deltaTone="down"
        />
      </div>

      {/* Session */}
      <div className="flex items-center justify-end gap-4 px-5 border-l border-rule">
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-paper">
          <span className="w-2 h-2 rounded-full bg-signal pulse-signal" aria-hidden="true" />
          Live
        </span>
        <span className="font-mono text-[12px] text-paper tracking-[0.06em] tabular-nums">
          {clock || '00:00:00'}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
          OP · {operator.name}
        </span>
      </div>
    </header>
  );
}
