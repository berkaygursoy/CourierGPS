'use client';

function CourierRow({ rank, courier, isNearest, onAssign }) {
  const busy = courier.status !== 'idle';

  return (
    <div
      role="button"
      tabIndex={busy ? -1 : 0}
      aria-disabled={busy}
      aria-label={busy ? undefined : `Assign ${courier.name}`}
      onClick={busy ? undefined : onAssign}
      onKeyDown={(e) => {
        if (busy) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAssign?.();
        }
      }}
      className={`group relative grid grid-cols-[28px_1fr_auto] items-center gap-3.5 px-5 py-3.5 border-b border-rule transition-colors ${
        busy ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-canvas-2'
      }`}
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
          {busy ? (
            <>Delivering {courier.activeOrder} · ETA {courier.etaMin}m</>
          ) : (
            <>
              {courier.vehicle} ·{' '}
              <span className={Number(courier.idleFor?.replace('m', '')) > 10 ? 'text-moss' : 'text-signal'}>
                Idle {courier.idleFor}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="font-mono text-[18px] text-paper tracking-[-0.02em] text-right tabular-nums">
        {courier.distanceKm.toFixed(1)}
        <span className="text-[10px] text-dim tracking-[0.15em] uppercase ml-1">km</span>
      </div>

      {!busy && (
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => { e.stopPropagation(); onAssign?.(); }}
          className="col-span-3 mt-3 bg-signal hover:bg-signal-d text-canvas font-mono text-[11px] uppercase tracking-[0.18em] px-3.5 py-2.5 cursor-pointer opacity-0 -translate-x-1.5 transition-[opacity,transform] duration-150 group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:translate-x-0 flex justify-between items-center"
        >
          Assign
          <span className="font-display italic text-base">→</span>
        </button>
      )}
    </div>
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
          Couriers · for order
        </div>
        <h2 className="font-display italic text-[30px] leading-none tracking-[-0.01em] text-paper">
          Nearest to <span className="text-signal">{selectedOrderId}</span>
        </h2>
        <div className="mt-2.5 flex gap-3.5 font-mono text-[11px] text-dim">
          <span><b className="text-paper font-medium tabular-nums">{String(idleCount).padStart(2, '0')}</b> idle</span>
          <span><b className="text-paper font-medium tabular-nums">{String(busyCount).padStart(2, '0')}</b> busy</span>
          <span>radius <b className="text-paper font-medium">2.0</b>km</span>
        </div>
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
