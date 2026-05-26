'use client';

import { useMemo, useState } from 'react';
import { Topbar } from '@/components/dispatch/Topbar';
import { MapView } from '@/components/dispatch/MapView';
import { CourierRail } from '@/components/dispatch/CourierRail';
import { OrderStrip } from '@/components/dispatch/OrderStrip';
import { toast } from '@/components/ui/Toaster';
import {
  STUB_MERCHANTS,
  STUB_COURIERS,
  STUB_ORDERS,
  STUB_OPERATOR,
} from '@/lib/stub-data';

export default function Dashboard() {
  const [orders, setOrders] = useState(STUB_ORDERS);
  const [couriers, setCouriers] = useState(STUB_COURIERS);
  const [selectedOrderId, setSelectedOrderId] = useState(STUB_ORDERS[0].id);

  // Selected order may have been assigned away — fall back to first available.
  const activeOrderId =
    orders.find((o) => o.id === selectedOrderId)?.id ?? orders[0]?.id;

  const kpis = useMemo(() => {
    const idle = couriers.filter((c) => c.status === 'idle').length;
    const inTransit = couriers.filter((c) => c.status === 'delivering').length;
    return {
      pending: orders.length,
      idle,
      inTransit,
      // Static deltas for now — when the backend ships, derive from a 5-min window.
      pendingDelta: 2,
      etaDelta: -1,
      avgRadiusKm: 0.9,
    };
  }, [orders, couriers]);

  function onAssign(courier) {
    if (!activeOrderId) return;

    setOrders((prev) => prev.filter((o) => o.id !== activeOrderId));

    setCouriers((prev) =>
      prev.map((c) =>
        c.id === courier.id
          ? {
              ...c,
              status: 'delivering',
              activeOrder: activeOrderId,
              etaMin: Math.max(3, Math.round(courier.distanceKm * 4)),
              idleFor: undefined,
            }
          : c,
      ),
    );

    // Auto-advance to the next oldest order so the dispatcher keeps moving.
    setSelectedOrderId((current) => {
      const remaining = orders.filter((o) => o.id !== activeOrderId);
      if (current !== activeOrderId) return current;
      return remaining[0]?.id ?? null;
    });

    toast({
      tone: 'success',
      title: `Assigned ${courier.name.split(' ')[0]}`,
      body: `${activeOrderId} dispatched · ETA ${Math.max(3, Math.round(courier.distanceKm * 4))}m`,
    });
  }

  // Empty-state guard — the dispatcher cleared the queue.
  if (!activeOrderId) {
    return (
      <main className="grid grid-rows-[64px_1fr] h-screen" aria-label="Dispatcher control room">
        <Topbar kpis={kpis} operator={STUB_OPERATOR} />
        <div className="grid place-items-center bg-canvas-2 border-t border-rule">
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-dim mb-3">
              Queue
            </div>
            <div className="font-display italic text-[64px] leading-none tracking-[-0.02em] text-paper">
              Empty
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-dim mt-3">
              All orders dispatched · {kpis.inTransit} in transit
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="grid grid-rows-[64px_1fr_152px] h-screen" aria-label="Dispatcher control room">
      <Topbar kpis={kpis} operator={STUB_OPERATOR} />

      <section className="grid grid-cols-[1fr_380px] min-h-0">
        <MapView
          orders={orders}
          couriers={couriers}
          merchants={STUB_MERCHANTS}
          selectedOrderId={activeOrderId}
          coordsLabel={STUB_OPERATOR.coordsLabel}
        />
        <CourierRail
          couriers={couriers}
          selectedOrderId={activeOrderId}
          onAssign={onAssign}
        />
      </section>

      <OrderStrip
        orders={orders}
        selectedId={activeOrderId}
        onSelect={setSelectedOrderId}
      />
    </main>
  );
}
