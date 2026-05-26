'use client';

function CourierRow({ rank, courier, isNearest, onAssign }) {
  const busy = courier.status !== 'idle';
  const idleMinutes = Number(courier.idleFor?.replace('m', ''));

  // Busy rows aren't actionable — render a non-interactive div so the row
  // doesn't show as a focusable/clickable target.
  if (busy) {
    return (
      <div
        aria-disabled="true"
        className="relative grid grid-cols-[28px_1fr_auto] items-center gap-3.5 px-5 py-3.5 border-b border-rule opacity-40 cursor-not-allowed"
      >
        <span className="font-mono text-[10px] text-dim tracking-[0.1em]">
          {String(rank).padStart(2, '0')}
        </span>
        <div>
          <div className="font-display italic text-[22px] leading-[1.1] tracking-[-0.01em] text-paper">
            {courier.name}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim mt-0.5">
            Delivering {courier.activeOrder} · ETA {courier.etaMin}m
          </div>
        </div>
        <div className="font-mono text-[18px] text-paper tracking-[-0.02em] text-right tabular-nums">
          {courier.distanceKm.toFixed(1)}
          <span className="text-[10px] text-dim tracking-[0.15em] uppercase ml-1">km</span>
        </div>
      </div>
    );
  }

  // Idle rows are the action target. The whole row is a real <button> so
  // keyboard, screen-reader, and pointer all converge on one interactive
  // element. The "Assign →" reveal inside is a visual flourish only.
  return (
    <button
      type="button"
      onClick={onAssign}
      aria-label={`Assign ${courier.name}`}
      className="group relative grid grid-cols-[28px_1fr_auto] items-center gap-3.5 px-5 py-3.5 border-b border-rule transition-colors cursor-pointer hover:bg-canvas-2 text-left w-full"
    >
      {isNearest && (
        <span aria-hidden="true" className="absolute left-0 top-0 bottom-0 w-0.5 bg-signal" />
      )}

      <span className="font-mono text-[10px] text-dim tracking-[0.1em]">
        {String(rank).padStart(2, '0')}
      </span>

      <div>
        <div className="font-display italic text-[22px] leading-[1.1] tracking-[-0.01em] text-paper">
          {courier.name}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim mt-0.5">
          {courier.vehicle} ·{' '}
          <span className={idleMinutes > 10 ? 'text-moss' : 'text-signal'}>
            Idle {courier.idleFor}
          </span>
        </div>
      </div>

      <div className="font-mono text-[18px] text-paper tracking-[-0.02em] text-right tabular-nums">
        {courier.distanceKm.toFixed(1)}
        <span className="text-[10px] text-dim tracking-[0.15em] uppercase ml-1">km</span>
      </div>

      <span
        aria-hidden="true"
        className="col-span-3 mt-3 bg-signal text-canvas font-mono text-[11px] uppercase tracking-[0.18em] px-3.5 py-2.5 opacity-0 -translate-x-1.5 transition-[opacity,transform] duration-150 group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100 group-focus-visible:translate-x-0 flex justify-between items-center"
      >
        Assign
        <span className="font-display italic text-base">→</span>
      </span>
    </button>
  );
}

export function CourierRail({ couriers, selectedOrderId, onAssign }) {
  const idleCount = couriers.filter((c) => c.status === 'idle').length;
  const busyCount = couriers.length - idleCount;

  // Sort by distance — the nearest two are highlighted as "nearest".
  const sorted = [...couriers].sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <aside aria-label="Courier list" className="bg-canvas grid grid-rows-[auto_1fr] min-h-0">
      <div className="px-5 pt-5 pb-3.5 border-b border-rule">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-dim mb-1.5">
          {idleCount === 0 ? 'Couriers · queued' : 'Couriers · for order'}
        </div>
        <h2 className="font-display italic text-[30px] leading-none tracking-[-0.01em] text-paper">
          {idleCount === 0 ? (
            <>All in <span className="text-signal">transit</span></>
          ) : (
            <>Nearest to <span className="text-signal">{selectedOrderId}</span></>
          )}
        </h2>
        <div className="mt-2.5 flex gap-3.5 font-mono text-[11px] text-dim">
          <span><b className="text-paper font-medium tabular-nums">{String(idleCount).padStart(2, '0')}</b> idle</span>
          <span><b className="text-paper font-medium tabular-nums">{String(busyCount).padStart(2, '0')}</b> busy</span>
          <span>radius <b className="text-paper font-medium">2.0</b>km</span>
        </div>
        {idleCount === 0 && (
          <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-signal/80">
            Holding — next courier free in ~{Math.min(...couriers.filter((c) => c.etaMin).map((c) => c.etaMin), 99)}m
          </div>
        )}
      </div>

      <div className="overflow-y-auto pb-6">
        {sorted.map((c, i) => (
          <CourierRow
            key={c.id}
            rank={i + 1}
            courier={c}
            isNearest={c.status === 'idle' && i < 2}
            onAssign={() => onAssign?.(c)}
          />
        ))}
      </div>
    </aside>
  );
}
