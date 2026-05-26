'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';

const Pin = forwardRef(function Pin(
  { x, y, variant, labelMono, labelSerif, labelMonoDim },
  ref,
) {
  // The order-focus pin gets a vermillion outer ring drawn with box-shadow
  // because layered Tailwind ring utilities don't compose cleanly with the
  // dark canvas border we already need on the dot.
  const dotByVariant = {
    merchant:       'w-2.5 h-2.5 bg-moss border-2 border-canvas',
    'order-focus':  'w-4 h-4 bg-signal border-2 border-canvas',
    courier:        'w-2.5 h-2.5 bg-paper border-2 border-canvas',
    'courier-busy': 'w-2.5 h-2.5 bg-dim opacity-55 border-2 border-canvas',
  }[variant];

  const dotStyle = {
    boxShadow:
      variant === 'order-focus'
        ? '0 0 0 2px var(--color-signal)'
        : '0 0 0 1px var(--color-rule-2)',
  };

  return (
    <span
      ref={ref}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
      style={{ top: `${y}%`, left: `${x}%` }}
    >
      <span className={`block rounded-full ${dotByVariant}`} style={dotStyle} />
      {labelMono && (
        <span className="absolute top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.1em] text-paper bg-canvas border border-rule px-1.5 py-0.5">
          {labelMono}
        </span>
      )}
      {labelSerif && (
        <span className="absolute top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-display italic text-[13px] text-paper bg-canvas border border-rule px-[7px] pt-px pb-[3px]">
          {labelSerif}
        </span>
      )}
      {labelMonoDim && (
        <span className="absolute top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.1em] text-paper/45 bg-canvas border border-rule px-1.5 py-0.5">
          {labelMonoDim}
        </span>
      )}
    </span>
  );
});

/**
 * Static CSS-faked map. Pins are positioned by percentage (mapX/mapY).
 * When the Leaflet integration lands, replace the inner JSX with
 * <MapContainer> while keeping pin / ring / vector-line layers as overlays.
 */
export function MapView({ orders, couriers, merchants, selectedOrderId, coordsLabel }) {
  const selected = orders.find((o) => o.id === selectedOrderId) ?? orders[0];

  const mapRef = useRef(null);
  const orderRef = useRef(null);
  const courierRefs = useRef({});
  const [lines, setLines] = useState([]);

  useEffect(() => {
    // The two idle couriers closest to the selected order get vector-lined to it.
    const nearest = couriers.filter((c) => c.status === 'idle').slice(0, 2);

    function compute() {
      const map = mapRef.current;
      const order = orderRef.current;
      if (!map || !order) return;
      const mapRect = map.getBoundingClientRect();
      const f = order.getBoundingClientRect();
      const x1 = f.left - mapRect.left + f.width / 2;
      const y1 = f.top  - mapRect.top  + f.height / 2;
      const next = nearest
        .map((c) => {
          const el = courierRefs.current[c.id];
          if (!el) return null;
          const t = el.getBoundingClientRect();
          const x2 = t.left - mapRect.left + t.width / 2;
          const y2 = t.top  - mapRect.top  + t.height / 2;
          const dx = x2 - x1, dy = y2 - y1;
          return {
            id: c.id,
            x: x1,
            y: y1,
            len: Math.hypot(dx, dy),
            angle: (Math.atan2(dy, dx) * 180) / Math.PI,
          };
        })
        .filter(Boolean);
      setLines(next);
    }
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [selectedOrderId, couriers]);

  return (
    <div ref={mapRef} className="relative bg-canvas-2 border-r border-rule overflow-hidden">
      {/* Grid backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-rule) 1px, transparent 1px), linear-gradient(90deg, var(--color-rule) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Faint street vectors */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(115deg, transparent 48%, rgba(242,237,227,0.06) 48.4%, rgba(242,237,227,0.06) 49.0%, transparent 49.4%), linear-gradient(75deg, transparent 30%, rgba(242,237,227,0.05) 30.3%, rgba(242,237,227,0.05) 30.8%, transparent 31.1%), radial-gradient(circle at 62% 48%, rgba(232,80,30,0.05), transparent 38%)',
        }}
      />

      {/* Top strip */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3.5 font-mono text-[10px] uppercase tracking-[0.2em] text-dim z-30">
        <span>{coordsLabel}</span>
        <div className="flex gap-5">
          <span>Tile · OSM</span>
          <span>Sector 04 / Kadıköy</span>
          <span>Updated live</span>
        </div>
      </div>

      {/* Focus ring */}
      {selected && (
        <span
          key={selected.id /* re-trigger animation on selection */}
          aria-hidden="true"
          className="ring-in absolute rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none border border-dashed border-signal"
          style={{ top: `${selected.mapY}%`, left: `${selected.mapX}%` }}
        />
      )}

      {/* Vector lines to nearest couriers */}
      {lines.map((l) => (
        <span
          key={`${selectedOrderId}-${l.id}`}
          aria-hidden="true"
          className="line-draw absolute h-px bg-signal"
          style={{
            left: `${l.x}px`,
            top:  `${l.y}px`,
            width: `${l.len}px`,
            transformOrigin: '0 50%',
            transform: `rotate(${l.angle}deg)`,
          }}
        />
      ))}

      {/* Merchant pins */}
      {merchants.map((m) => (
        <Pin
          key={m.id}
          x={m.x}
          y={m.y}
          variant="merchant"
          labelMono={`${m.name.toUpperCase()} · ${m.id.toUpperCase()}`}
        />
      ))}

      {/* Focused order pin */}
      {selected && (
        <Pin
          ref={orderRef}
          x={selected.mapX}
          y={selected.mapY}
          variant="order-focus"
          labelMono={`${selected.id} · ${selected.customer.split(' ')[0]}`}
        />
      )}

      {/* Courier pins */}
      {couriers.map((c) => (
        <Pin
          key={c.id}
          ref={(el) => { courierRefs.current[c.id] = el; }}
          x={c.mapX}
          y={c.mapY}
          variant={c.status === 'idle' ? 'courier' : 'courier-busy'}
          labelSerif={c.status === 'idle' ? c.name.split(' ')[0] : null}
          labelMonoDim={c.status === 'idle' ? null : `${c.name.split(' ')[0]} · ↻`}
        />
      ))}

      {/* Scale */}
      <div className="absolute bottom-4 left-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-dim z-30">
        <span>0</span>
        <span className="relative w-[60px] h-px bg-dim">
          <span className="absolute -top-[3px] left-0 w-px h-[7px] bg-dim" />
          <span className="absolute -top-[3px] right-0 w-px h-[7px] bg-dim" />
        </span>
        <span>500 m</span>
      </div>
    </div>
  );
}
