'use client';

import { formatAge } from '@/lib/stub-data';

function OrderCard({ order, selected, onSelect }) {
  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={`flex-shrink-0 w-[252px] px-5 py-4.5 border-r grid grid-rows-[auto_1fr_auto] gap-2.5 cursor-pointer transition-colors ${
        selected
          ? 'bg-ink text-paper border-rule'
          : 'bg-paper text-ink border-rule-2 hover:bg-paper-2'
      }`}
      style={{ paddingTop: '18px', paddingBottom: '18px' }}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center font-mono text-[12px] tracking-[0.16em]">
          <span
            className={`inline-block w-1.5 h-1.5 mr-1.5 ${
              selected ? 'bg-signal' : 'bg-signal'
            }`}
            aria-hidden="true"
          />
          <span className={selected ? 'text-signal' : 'text-dim-2'}>{order.id}</span>
        </span>
        <span className={`font-mono text-[11px] tracking-[0.06em] tabular-nums ${
          selected ? 'text-dim' : 'text-dim-2'
        }`}>
          {formatAge(order.ageSec)}
        </span>
      </div>

      <div className="font-display italic text-[24px] leading-[1.1] tracking-[-0.01em]">
        {order.customer}
      </div>

      <div className={`flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] ${
        selected ? 'text-dim' : 'text-dim-2'
      }`}>
        <span>{order.address}</span>
        <span>{order.distanceKm} km</span>
      </div>
    </article>
  );
}

export function OrderStrip({ orders, selectedId, onSelect }) {
  const oldest = orders.reduce((a, b) => (a.ageSec > b.ageSec ? a : b), orders[0]);

  return (
    <section
      aria-label="Unassigned orders"
      className="bg-paper text-ink border-t border-rule grid grid-cols-[220px_1fr] min-h-0"
    >
      <div className="px-5 pt-5 pb-4 border-r border-rule-2 flex flex-col justify-between">
        <div>
          <div className="flex items-baseline gap-3">
            <span
              className="font-display italic text-signal leading-[0.8] tracking-[-0.02em] tabular-nums"
              style={{ fontSize: '52px' }}
            >
              {String(orders.length).padStart(2, '0')}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-dim-2 leading-tight">
              Unassigned<br />orders
            </span>
          </div>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-dim-2">
          Oldest <b className="text-ink font-medium tabular-nums">{formatAge(oldest.ageSec)}</b>
        </div>
      </div>

      <div className="flex overflow-x-auto">
        {orders.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            selected={o.id === selectedId}
            onSelect={() => onSelect?.(o.id)}
          />
        ))}
      </div>
    </section>
  );
}
