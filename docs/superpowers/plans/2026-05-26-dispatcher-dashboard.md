# Dispatcher Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 sub-project 3 dispatcher dashboard — a Next.js cockpit at `/` and `/merchants` that consumes the CRUD APIs from sub-project 2, with a hero map, spatial courier assignment, click-to-set-pin order creation, and status updates.

**Architecture:** Three thin layers. **API client** (`lib/api.js`) wraps `fetch` and parses backend errors. **TanStack Query hooks** (`lib/queries/*`) own server-state caching and invalidation. **Components** are dumb wrt. fetching — they pull data from query hooks and render. Page-level `useState` carries the small amount of cross-component UI state (`selectedOrderId`, modal flags). The map uses `react-leaflet` loaded via `next/dynamic({ ssr: false })` to bypass Leaflet's `window` access on import.

**Tech Stack:** Next.js 16 (App Router, JS), React 19, Tailwind 4, react-leaflet 5 + leaflet 1.9, @tanstack/react-query 5, react-hook-form + @hookform/resolvers + zod, vitest (for one geo unit test).

**Working directory:** `d:\Projeler\kuryeTakip` (Windows + PowerShell). All bash blocks are PowerShell-compatible. LF→CRLF git warnings are normal — ignore.

**Prereqs:**
- Sub-project 2 complete (commit `4147870` or later — backend has `/api/merchants`, `/api/couriers`, `/api/orders` and `npm test` passes).
- Frontend scaffold present (commit `8da69ed` — Next.js 16 + Tailwind 4, port 3001, `next.config.mjs` rewrites `/api/*` to `BACKEND_URL`).
- `backend/.env` populated with Supabase + Upstash URLs.

**Design spec:** `docs/superpowers/specs/2026-05-26-dispatcher-dashboard-design.md`.

---

## Conventions Used Throughout

| Convention | Decision |
|---|---|
| Backend run | Terminal 1: `cd backend; npm run dev` (port 3000). |
| Frontend run | Terminal 2: `cd frontend; npm run dev` (port 3001). |
| Visual verification | "Open http://localhost:3001, X should be visible/work" — explicit after each UI task. |
| Commit cadence | Once per task (sometimes per phase within a big task). |
| File paths | Absolute, e.g. `d:\Projeler\kuryeTakip\frontend\app\page.js`. |
| Frontend tests | Only `lib/geo.js` has unit tests (vitest). Components are visually verified. |
| Imports | Use `@/` alias (e.g. `@/lib/api`) — configured by Next via `jsconfig.json`. |
| Tailwind | Tailwind 4 with the `@tailwindcss/postcss` plugin. No `tailwind.config.js` needed (uses CSS-first config in `globals.css`). |
| `'use client'` | Every component that uses hooks, browser APIs, or interactive event handlers gets `'use client'` at the top. |

---

## File Structure

This sub-project adds **27 frontend files**, **1 backend script**, and modifies a few existing files.

```
backend/
└── scripts/
    └── seed.js                          # NEW: demo data seeder

frontend/
├── app/
│   ├── layout.js                        # MODIFY: wrap with <Providers>
│   ├── providers.js                     # NEW: QueryClientProvider + Toaster
│   ├── globals.css                      # MODIFY: keep tailwind, drop demo styles, import leaflet css
│   ├── page.js                          # MODIFY: replace demo content with dashboard
│   └── merchants/
│       └── page.js                      # NEW: /merchants route
├── components/
│   ├── layout/
│   │   └── TopBar.jsx                   # NEW
│   ├── map/
│   │   ├── MapView.jsx                  # NEW: dynamic({ ssr:false }) wrapper
│   │   ├── MapContainerInner.jsx        # NEW: actual react-leaflet usage
│   │   ├── MerchantsLayer.jsx           # NEW
│   │   ├── CouriersLayer.jsx            # NEW
│   │   ├── OrdersLayer.jsx              # NEW
│   │   ├── markers.jsx                  # NEW: DivIcon factories
│   │   └── useFlyTo.js                  # NEW
│   ├── dashboard/
│   │   ├── UnassignedStrip.jsx          # NEW
│   │   ├── OrderCard.jsx                # NEW
│   │   ├── CouriersRail.jsx             # NEW
│   │   ├── CourierRow.jsx               # NEW
│   │   └── StatusPopup.jsx              # NEW
│   ├── orders/
│   │   ├── CreateOrderDialog.jsx        # NEW
│   │   └── orderSchema.js               # NEW
│   ├── merchants/
│   │   ├── MerchantsTable.jsx           # NEW
│   │   ├── MerchantDialog.jsx           # NEW
│   │   ├── MerchantMiniMap.jsx          # NEW
│   │   ├── DeleteConfirmDialog.jsx      # NEW
│   │   └── merchantSchema.js            # NEW
│   └── ui/
│       ├── Button.jsx                   # NEW
│       ├── Dialog.jsx                   # NEW
│       ├── Input.jsx                    # NEW
│       ├── Select.jsx                   # NEW
│       ├── Badge.jsx                    # NEW
│       └── Toaster.jsx                  # NEW
├── lib/
│   ├── api.js                           # NEW: apiFetch + ApiError
│   ├── queryKeys.js                     # NEW: qk namespaces
│   ├── geo.js                           # NEW: haversine + sortCouriersByDistance
│   └── queries/
│       ├── merchants.js                 # NEW
│       ├── couriers.js                  # NEW
│       └── orders.js                    # NEW
├── tests/
│   └── lib/
│       └── geo.test.js                  # NEW: vitest unit tests
├── vitest.config.js                     # NEW
├── jsconfig.json                        # MODIFY: ensure @/ alias is set (it is by default)
└── package.json                         # MODIFY: add deps + test script
```

---

## Task 1: Install frontend dependencies

**Files:**
- Modify: `d:\Projeler\kuryeTakip\frontend\package.json`

- [ ] **Step 1: Install runtime deps**

```powershell
cd "d:/Projeler/kuryeTakip/frontend"; npm install leaflet@^1.9.4 react-leaflet@^5.0.0 @tanstack/react-query@^5.62.0 react-hook-form@^7.54.0 @hookform/resolvers@^3.10.0 zod@^3.25.0
```

Expected: `added N packages` without errors.

- [ ] **Step 2: Install dev deps for tests**

```powershell
npm install --save-dev vitest@^2.1.0
```

Expected: `added N packages`.

- [ ] **Step 3: Add test script to `package.json`**

Modify `frontend/package.json` — replace the `scripts` block with:

```json
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "eslint",
    "test": "vitest run"
  },
```

- [ ] **Step 4: Verify install**

```powershell
npm ls leaflet react-leaflet @tanstack/react-query react-hook-form zod vitest 2>$null
```

Expected: tree shows each package at the requested version, no UNMET DEPENDENCY lines.

- [ ] **Step 5: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/package.json frontend/package-lock.json; git commit -m "feat(frontend): add deps (leaflet, react-leaflet, tanstack/react-query, rhf, zod, vitest)"
```

---

## Task 2: vitest config + geo utilities (the only unit test layer)

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\vitest.config.js`
- Create: `d:\Projeler\kuryeTakip\frontend\lib\geo.js`
- Create: `d:\Projeler\kuryeTakip\frontend\tests\lib\geo.test.js`

- [ ] **Step 1: Create vitest config**

Path: `d:\Projeler\kuryeTakip\frontend\vitest.config.js`

```js
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

- [ ] **Step 2: Write failing test**

Path: `d:\Projeler\kuryeTakip\frontend\tests\lib\geo.test.js`

```js
import { describe, test, expect } from 'vitest';
import { haversineKm, sortCouriersByDistance } from '@/lib/geo';

describe('haversineKm', () => {
  test('returns 0 for identical points', () => {
    expect(haversineKm({ lat: 41.0, lng: 28.9 }, { lat: 41.0, lng: 28.9 })).toBe(0);
  });

  test('Istanbul Kadikoy to Besiktas is ~3-5 km', () => {
    const kadikoy = { lat: 40.9923, lng: 29.0244 };
    const besiktas = { lat: 41.0420, lng: 29.0094 };
    const d = haversineKm(kadikoy, besiktas);
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(7);
  });

  test('antipodes are ~20015 km', () => {
    const d = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    expect(d).toBeGreaterThan(20000);
    expect(d).toBeLessThan(20040);
  });
});

describe('sortCouriersByDistance', () => {
  const point = { lat: 41.0, lng: 29.0 };
  const c1 = { id: 'c1', name: 'Far',   latitude: 41.5, longitude: 29.0 };
  const c2 = { id: 'c2', name: 'Close', latitude: 41.01, longitude: 29.0 };
  const c3 = { id: 'c3', name: 'Mid',   latitude: 41.1, longitude: 29.0 };

  test('orders by ascending distance', () => {
    const sorted = sortCouriersByDistance([c1, c2, c3], point);
    expect(sorted.map((c) => c.id)).toEqual(['c2', 'c3', 'c1']);
  });

  test('annotates each courier with distanceKm', () => {
    const sorted = sortCouriersByDistance([c1, c2], point);
    expect(sorted[0]).toHaveProperty('distanceKm');
    expect(sorted[0].distanceKm).toBeLessThan(sorted[1].distanceKm);
  });

  test('does not mutate input array', () => {
    const input = [c1, c2, c3];
    const original = [...input];
    sortCouriersByDistance(input, point);
    expect(input).toEqual(original);
  });

  test('handles empty input', () => {
    expect(sortCouriersByDistance([], point)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```powershell
cd "d:/Projeler/kuryeTakip/frontend"; npm test
```

Expected: FAIL — `Cannot find module '@/lib/geo'`.

- [ ] **Step 4: Implement `lib/geo.js`**

Path: `d:\Projeler\kuryeTakip\frontend\lib\geo.js`

```js
const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(x));
}

export function sortCouriersByDistance(couriers, point) {
  return couriers
    .map((c) => ({
      ...c,
      distanceKm: haversineKm(
        { lat: c.latitude ?? 0, lng: c.longitude ?? 0 },
        point,
      ),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
```

- [ ] **Step 5: Run test to verify pass**

```powershell
npm test
```

Expected: PASS (7/7).

- [ ] **Step 6: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/vitest.config.js frontend/lib/geo.js frontend/tests/lib/geo.test.js; git commit -m "feat(frontend): add geo utils (haversine + sortCouriersByDistance) with vitest"
```

---

## Task 3: API client (`lib/api.js`)

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\lib\api.js`

No unit test — exercised by every query hook later. Errors are visible immediately on first network failure.

- [ ] **Step 1: Implement**

Path: `d:\Projeler\kuryeTakip\frontend\lib\api.js`

```js
export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  // 204 No Content has an empty body — bypass JSON parsing.
  if (res.status === 204) return null;

  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const err = body?.error ?? {};
    throw new ApiError({
      status: res.status,
      code: err.code ?? 'UNKNOWN',
      message: err.message ?? res.statusText,
      details: err.details,
    });
  }

  return body;
}
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/lib/api.js; git commit -m "feat(frontend): add apiFetch + ApiError"
```

---

## Task 4: Query keys

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\lib\queryKeys.js`

- [ ] **Step 1: Implement**

Path: `d:\Projeler\kuryeTakip\frontend\lib\queryKeys.js`

```js
export const qk = {
  merchants: {
    all: () => ['merchants'],
  },
  couriers: {
    all: () => ['couriers'],
  },
  orders: {
    all: () => ['orders'],
    byStatus: (status) => ['orders', { status }],
  },
};
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/lib/queryKeys.js; git commit -m "feat(frontend): add centralized query key namespaces"
```

---

## Task 5: TanStack Query provider + root layout

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\app\providers.js`
- Modify: `d:\Projeler\kuryeTakip\frontend\app\layout.js`

- [ ] **Step 1: Create `providers.js`**

Path: `d:\Projeler\kuryeTakip\frontend\app\providers.js`

```jsx
'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/Toaster';

export function Providers({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Read the existing `layout.js`**

```powershell
type "d:/Projeler/kuryeTakip/frontend/app/layout.js"
```

- [ ] **Step 3: Replace `layout.js`**

Path: `d:\Projeler\kuryeTakip\frontend\app\layout.js`

```jsx
import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Dispatch',
  description: 'Courier dispatch dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="h-screen bg-zinc-50 text-zinc-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Commit (no visible result yet — Toaster doesn't exist; that's the next task)**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/app/providers.js frontend/app/layout.js; git commit -m "feat(frontend): add tanstack query provider and wrap root layout"
```

---

## Task 6: UI primitives — Button, Input, Select, Badge

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\ui\Button.jsx`
- Create: `d:\Projeler\kuryeTakip\frontend\components\ui\Input.jsx`
- Create: `d:\Projeler\kuryeTakip\frontend\components\ui\Select.jsx`
- Create: `d:\Projeler\kuryeTakip\frontend\components\ui\Badge.jsx`

These are thin styled wrappers — no logic. Build them first so later components can compose them.

- [ ] **Step 1: Button**

Path: `d:\Projeler\kuryeTakip\frontend\components\ui\Button.jsx`

```jsx
export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-5 text-sm',
  };
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50',
    ghost: 'text-zinc-700 hover:bg-zinc-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button
      type={type}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Input**

Path: `d:\Projeler\kuryeTakip\frontend\components\ui\Input.jsx`

```jsx
import { forwardRef } from 'react';

export const Input = forwardRef(function Input({ className = '', error, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={`h-9 px-3 text-sm rounded-md border bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${
        error ? 'border-red-400' : 'border-zinc-200'
      } ${className}`}
      {...props}
    />
  );
});
```

- [ ] **Step 3: Select**

Path: `d:\Projeler\kuryeTakip\frontend\components\ui\Select.jsx`

```jsx
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
```

- [ ] **Step 4: Badge**

Path: `d:\Projeler\kuryeTakip\frontend\components\ui\Badge.jsx`

```jsx
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
```

- [ ] **Step 5: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/ui/Button.jsx frontend/components/ui/Input.jsx frontend/components/ui/Select.jsx frontend/components/ui/Badge.jsx; git commit -m "feat(frontend): add Button, Input, Select, Badge ui primitives"
```

---

## Task 7: Toaster

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\ui\Toaster.jsx`

A simple global toast system. Custom (no library) per spec §10. Uses a module-scoped event bus.

- [ ] **Step 1: Implement**

Path: `d:\Projeler\kuryeTakip\frontend\components\ui\Toaster.jsx`

```jsx
'use client';

import { useEffect, useState } from 'react';

const listeners = new Set();
let nextId = 1;

export function toast({ tone = 'error', title, body }) {
  const id = nextId++;
  const t = { id, tone, title, body };
  listeners.forEach((fn) => fn({ type: 'add', toast: t }));
  setTimeout(() => {
    listeners.forEach((fn) => fn({ type: 'remove', id }));
  }, 5000);
}

const toneStyles = {
  error: 'border-red-200 bg-red-50 text-red-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  info: 'border-zinc-200 bg-white text-zinc-900',
};

export function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const fn = (evt) => {
      if (evt.type === 'add') setToasts((t) => [...t, evt.toast]);
      if (evt.type === 'remove') setToasts((t) => t.filter((x) => x.id !== evt.id));
    };
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  function dismiss(id) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto cursor-pointer rounded-md border shadow-sm px-3 py-2 ${toneStyles[t.tone]}`}
        >
          {t.title && <div className="text-sm font-medium">{t.title}</div>}
          {t.body && <div className="text-xs mt-0.5 opacity-80">{t.body}</div>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/ui/Toaster.jsx; git commit -m "feat(frontend): add Toaster + toast() event bus (custom, no lib)"
```

---

## Task 8: Dialog primitive

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\ui\Dialog.jsx`

A thin shell over the native `<dialog>` element. Handles ESC + backdrop click + focus management.

- [ ] **Step 1: Implement**

Path: `d:\Projeler\kuryeTakip\frontend\components\ui\Dialog.jsx`

```jsx
'use client';

import { useEffect, useRef } from 'react';

export function Dialog({ open, onClose, title, children, footer, widthClass = 'max-w-md' }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    function onCancel(e) {
      e.preventDefault();
      onClose?.();
    }
    function onClick(e) {
      if (e.target === d) onClose?.();
    }
    d.addEventListener('cancel', onCancel);
    d.addEventListener('click', onClick);
    return () => {
      d.removeEventListener('cancel', onCancel);
      d.removeEventListener('click', onClick);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={`m-auto p-0 rounded-lg shadow-xl border border-zinc-200 bg-white text-zinc-900 w-full ${widthClass} backdrop:bg-zinc-900/40`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-700 text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="p-4">{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-zinc-200 flex justify-end gap-2 bg-zinc-50">
          {footer}
        </div>
      )}
    </dialog>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/ui/Dialog.jsx; git commit -m "feat(frontend): add Dialog wrapper over native <dialog>"
```

---

## Task 9: Resource query hooks (reads)

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\lib\queries\merchants.js`
- Create: `d:\Projeler\kuryeTakip\frontend\lib\queries\couriers.js`
- Create: `d:\Projeler\kuryeTakip\frontend\lib\queries\orders.js`

This task adds reads + the file scaffold for mutations. Mutations come in Task 10 to keep diffs reviewable.

- [ ] **Step 1: Merchants**

Path: `d:\Projeler\kuryeTakip\frontend\lib\queries\merchants.js`

```js
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useMerchants() {
  return useQuery({
    queryKey: qk.merchants.all(),
    queryFn: () => apiFetch('/merchants'),
  });
}
```

- [ ] **Step 2: Couriers**

Path: `d:\Projeler\kuryeTakip\frontend\lib\queries\couriers.js`

```js
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useCouriers() {
  return useQuery({
    queryKey: qk.couriers.all(),
    queryFn: () => apiFetch('/couriers'),
  });
}
```

- [ ] **Step 3: Orders**

Path: `d:\Projeler\kuryeTakip\frontend\lib\queries\orders.js`

```js
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useOrders(filters) {
  const queryString =
    filters?.status ? `?status=${encodeURIComponent(filters.status)}` : '';
  return useQuery({
    queryKey: filters?.status ? qk.orders.byStatus(filters.status) : qk.orders.all(),
    queryFn: () => apiFetch(`/orders${queryString}`),
  });
}
```

- [ ] **Step 4: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/lib/queries/merchants.js frontend/lib/queries/couriers.js frontend/lib/queries/orders.js; git commit -m "feat(frontend): add tanstack query read hooks (useMerchants, useCouriers, useOrders)"
```

---

## Task 10: Resource mutation hooks (writes)

**Files:**
- Modify: `d:\Projeler\kuryeTakip\frontend\lib\queries\merchants.js`
- Modify: `d:\Projeler\kuryeTakip\frontend\lib\queries\couriers.js` (no mutations in v1 — leave as-is)
- Modify: `d:\Projeler\kuryeTakip\frontend\lib\queries\orders.js`

- [ ] **Step 1: Add merchant mutations**

Append to `frontend/lib/queries/merchants.js`:

```js
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      apiFetch('/merchants', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.merchants.all() }),
  });
}

export function useUpdateMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) =>
      apiFetch(`/merchants/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.merchants.all() }),
  });
}

export function useDeleteMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiFetch(`/merchants/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.merchants.all() }),
  });
}
```

Final `frontend/lib/queries/merchants.js`:

```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useMerchants() {
  return useQuery({
    queryKey: qk.merchants.all(),
    queryFn: () => apiFetch('/merchants'),
  });
}

export function useCreateMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      apiFetch('/merchants', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.merchants.all() }),
  });
}

export function useUpdateMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) =>
      apiFetch(`/merchants/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.merchants.all() }),
  });
}

export function useDeleteMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiFetch(`/merchants/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.merchants.all() }),
  });
}
```

- [ ] **Step 2: Add order mutations**

Replace `frontend/lib/queries/orders.js` entirely:

```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useOrders(filters) {
  const queryString =
    filters?.status ? `?status=${encodeURIComponent(filters.status)}` : '';
  return useQuery({
    queryKey: filters?.status ? qk.orders.byStatus(filters.status) : qk.orders.all(),
    queryFn: () => apiFetch(`/orders${queryString}`),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      apiFetch('/orders', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orders.all() }),
  });
}

export function useAssignCourier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, courierId }) =>
      apiFetch(`/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ courier_id: courierId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.orders.all() });
      qc.invalidateQueries({ queryKey: qk.couriers.all() });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }) =>
      apiFetch(`/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.orders.all() });
      qc.invalidateQueries({ queryKey: qk.couriers.all() });
    },
  });
}
```

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/lib/queries/merchants.js frontend/lib/queries/orders.js; git commit -m "feat(frontend): add mutation hooks (create/update/delete merchant, create order, assign, status)"
```

---

## Task 11: Backend seed script

**Files:**
- Create: `d:\Projeler\kuryeTakip\backend\scripts\seed.js`

- [ ] **Step 1: Implement**

Path: `d:\Projeler\kuryeTakip\backend\scripts\seed.js`

```js
require('dotenv').config();

const { getPool, closePool } = require('../src/config/database');
const { closeRedis } = require('../src/config/redis');
const logger = require('../src/utils/logger');

const MERCHANTS = [
  { name: 'Kadikoy Pizza',  address: 'Bagdat Cad. 12, Kadikoy',       latitude: 40.9923, longitude: 29.0244, phone: '+902161112233' },
  { name: 'Besiktas Burger', address: 'Ortabahce Cad. 5, Besiktas',    latitude: 41.0420, longitude: 29.0094, phone: '+902122223344' },
  { name: 'Sisli Doner',     address: 'Halaskargazi Cad. 80, Sisli',   latitude: 41.0589, longitude: 28.9876, phone: '+902123334455' },
  { name: 'Uskudar Kebap',   address: 'Hakimiyet-i Milliye Cad. 22, Uskudar', latitude: 41.0235, longitude: 29.0152, phone: '+902164445566' },
];

const COURIERS = [
  { name: 'Mehmet Yilmaz',  phone: '+905551112233', vehicle_type: 'motorcycle', status: 'idle' },
  { name: 'Ayse Demir',     phone: '+905552223344', vehicle_type: 'bike',       status: 'idle' },
  { name: 'Ali Kaya',       phone: '+905553334455', vehicle_type: 'motorcycle', status: 'idle' },
  { name: 'Elif Celik',     phone: '+905554445566', vehicle_type: 'car',        status: 'idle' },
  { name: 'Can Aydin',      phone: '+905555556677', vehicle_type: 'bike',       status: 'idle' },
];

async function seed() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // FK-safe wipe order
    await client.query('DELETE FROM location_snapshots');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM couriers');
    await client.query('DELETE FROM merchants');

    for (const m of MERCHANTS) {
      await client.query(
        `INSERT INTO merchants (name, address, latitude, longitude, phone)
         VALUES ($1, $2, $3, $4, $5)`,
        [m.name, m.address, m.latitude, m.longitude, m.phone],
      );
    }
    for (const c of COURIERS) {
      await client.query(
        `INSERT INTO couriers (name, phone, vehicle_type, status)
         VALUES ($1, $2, $3, $4)`,
        [c.name, c.phone, c.vehicle_type, c.status],
      );
    }
    await client.query('COMMIT');
    logger.info('Seed complete', { merchants: MERCHANTS.length, couriers: COURIERS.length });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

seed()
  .then(async () => {
    await closePool();
    await closeRedis();
    process.exit(0);
  })
  .catch(async (err) => {
    logger.error('Seed failed', { error: err.message, stack: err.stack });
    await closePool().catch(() => {});
    await closeRedis().catch(() => {});
    process.exit(1);
  });
```

- [ ] **Step 2: Run it**

```powershell
cd "d:/Projeler/kuryeTakip/backend"; node scripts/seed.js
```

Expected: prints a `info Seed complete` log line and exits 0. The Supabase DB now has 4 merchants and 5 couriers.

- [ ] **Step 3: Re-run to verify idempotency**

```powershell
node scripts/seed.js
```

Expected: same output. No duplicate-key errors (DELETE before INSERT).

- [ ] **Step 4: Verify via the API**

```powershell
cd "d:/Projeler/kuryeTakip/backend"; npm start
```

Wait for `Server listening`. In another window:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/merchants | Select-Object -First 2
Invoke-RestMethod -Uri http://localhost:3000/api/couriers | Select-Object -First 2
```

Expected: 4 merchants, 5 couriers visible. Stop the server (Ctrl+C in its window).

- [ ] **Step 5: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add backend/scripts/seed.js; git commit -m "feat(backend): add seed script with 4 merchants + 5 couriers (istanbul)"
```

---

## Task 12: Top bar component

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\layout\TopBar.jsx`

- [ ] **Step 1: Implement**

Path: `d:\Projeler\kuryeTakip\frontend\components\layout\TopBar.jsx`

```jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function TopBar({ children }) {
  const path = usePathname();
  const links = [
    { href: '/', label: 'Dispatch' },
    { href: '/merchants', label: 'Merchants' },
  ];
  return (
    <header className="h-14 bg-white border-b border-zinc-200 px-6 flex items-center gap-8">
      <Link href="/" className="text-indigo-600 font-semibold tracking-tight text-base">
        Dispatch
      </Link>
      <nav className="flex items-center gap-6">
        {links.map((l) => {
          const active = path === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm h-14 flex items-center border-b-2 ${
                active ? 'border-indigo-600 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/layout/TopBar.jsx; git commit -m "feat(frontend): add TopBar with brand + Dispatch/Merchants nav"
```

---

## Task 13: Globals CSS + Leaflet styles

**Files:**
- Modify: `d:\Projeler\kuryeTakip\frontend\app\globals.css`

The default `globals.css` from create-next-app has Tailwind directive + demo theme styles. Drop the demo, keep Tailwind, add a Leaflet stylesheet import.

- [ ] **Step 1: Read current `globals.css`**

```powershell
type "d:/Projeler/kuryeTakip/frontend/app/globals.css"
```

- [ ] **Step 2: Replace with**

Path: `d:\Projeler\kuryeTakip\frontend\app\globals.css`

```css
@import "tailwindcss";
@import "leaflet/dist/leaflet.css";

html, body, #__next {
  height: 100%;
}
```

- [ ] **Step 3: Verify build still works**

```powershell
cd "d:/Projeler/kuryeTakip/frontend"; npm run dev
```

Open http://localhost:3001 — page should load (still shows old demo content from `app/page.js`; that's next). Stop the dev server.

- [ ] **Step 4: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/app/globals.css; git commit -m "feat(frontend): import tailwind + leaflet css, drop demo theme"
```

---

## Task 14: Marker DivIcon factories

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\map\markers.jsx`

- [ ] **Step 1: Implement**

Path: `d:\Projeler\kuryeTakip\frontend\components\map\markers.jsx`

```jsx
import L from 'leaflet';

function dotHtml({ color, ring = 'white', halo = false }) {
  const haloLayer = halo
    ? `<span style="position:absolute;inset:-8px;border-radius:9999px;background:rgba(99,102,241,0.25);animation:dot-pulse 1.2s ease-out infinite"></span>`
    : '';
  return `
    <span style="position:relative;display:inline-block;width:10px;height:10px;">
      ${haloLayer}
      <span style="position:absolute;inset:0;border-radius:9999px;background:${color};box-shadow:0 0 0 2px ${ring},0 1px 2px rgba(0,0,0,0.3);"></span>
    </span>
  `;
}

const COURIER_COLOR = { offline: '#a1a1aa', idle: '#3b82f6', delivering: '#4f46e5' };
const ORDER_COLOR = {
  pending:    '#f59e0b',
  assigned:   '#4f46e5',
  picked_up:  '#d97706',
  in_transit: '#b45309',
};

function buildIcon(html) {
  return L.divIcon({
    html,
    className: 'dispatch-marker', // unstyled — divIcon adds its own default we override
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export function merchantIcon() {
  return buildIcon(dotHtml({ color: '#10b981' }));
}

export function courierIcon(status) {
  return buildIcon(dotHtml({ color: COURIER_COLOR[status] ?? '#a1a1aa' }));
}

export function orderIcon(status, { selected = false } = {}) {
  return buildIcon(dotHtml({ color: ORDER_COLOR[status] ?? '#f59e0b', halo: selected }));
}
```

Note: we use inline `style` strings inside `L.divIcon` HTML because Leaflet manipulates the DOM directly and Tailwind class injection isn't reliable inside DivIcon payloads.

- [ ] **Step 2: Add halo animation to globals.css**

Append to `frontend/app/globals.css`:

```css
@keyframes dot-pulse {
  0%   { transform: scale(0.9); opacity: 0.7; }
  100% { transform: scale(1.6); opacity: 0; }
}

.dispatch-marker { background: transparent !important; border: 0 !important; }
```

Final `globals.css`:

```css
@import "tailwindcss";
@import "leaflet/dist/leaflet.css";

html, body, #__next {
  height: 100%;
}

@keyframes dot-pulse {
  0%   { transform: scale(0.9); opacity: 0.7; }
  100% { transform: scale(1.6); opacity: 0; }
}

.dispatch-marker { background: transparent !important; border: 0 !important; }
```

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/map/markers.jsx frontend/app/globals.css; git commit -m "feat(frontend): add marker DivIcon factories + dot-pulse animation"
```

---

## Task 15: useFlyTo hook

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\map\useFlyTo.js`

- [ ] **Step 1: Implement**

Path: `d:\Projeler\kuryeTakip\frontend\components\map\useFlyTo.js`

```js
'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export function useFlyTo(target, { zoom = 14 } = {}) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], zoom, { duration: 0.6 });
  }, [target?.lat, target?.lng, zoom, map]);
}
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/map/useFlyTo.js; git commit -m "feat(frontend): add useFlyTo hook"
```

---

## Task 16: Map layers — Merchants, Couriers, Orders

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\map\MerchantsLayer.jsx`
- Create: `d:\Projeler\kuryeTakip\frontend\components\map\CouriersLayer.jsx`
- Create: `d:\Projeler\kuryeTakip\frontend\components\map\OrdersLayer.jsx`

- [ ] **Step 1: MerchantsLayer**

Path: `d:\Projeler\kuryeTakip\frontend\components\map\MerchantsLayer.jsx`

```jsx
import { LayerGroup, Marker, Tooltip } from 'react-leaflet';
import { useMerchants } from '@/lib/queries/merchants';
import { merchantIcon } from './markers';

export function MerchantsLayer() {
  const { data: merchants = [] } = useMerchants();
  return (
    <LayerGroup>
      {merchants.map((m) => (
        <Marker key={m.id} position={[m.latitude, m.longitude]} icon={merchantIcon()}>
          <Tooltip direction="top" offset={[0, -8]}>{m.name}</Tooltip>
        </Marker>
      ))}
    </LayerGroup>
  );
}
```

- [ ] **Step 2: CouriersLayer**

Path: `d:\Projeler\kuryeTakip\frontend\components\map\CouriersLayer.jsx`

For v1 we don't have live courier positions. Courier rows in the rail show status only; on the map we plot couriers using their merchant's location as a stand-in is wrong. **Decision:** in v1 we do not render couriers on the map (we have no lat/lng for them). Sub-project 4 (real-time) will populate Redis GEO. This file is a stub that renders nothing, so the layer list in `MapContainerInner` stays uniform.

Path: `d:\Projeler\kuryeTakip\frontend\components\map\CouriersLayer.jsx`

```jsx
import { LayerGroup } from 'react-leaflet';

export function CouriersLayer() {
  // Couriers have no persisted position in v1. They appear in the right rail only.
  // Real-time Redis-GEO-fed positions arrive in sub-project 4.
  return <LayerGroup />;
}
```

- [ ] **Step 3: OrdersLayer**

Path: `d:\Projeler\kuryeTakip\frontend\components\map\OrdersLayer.jsx`

```jsx
'use client';

import { LayerGroup, Marker } from 'react-leaflet';
import { useOrders } from '@/lib/queries/orders';
import { orderIcon } from './markers';

const VISIBLE_STATUSES = new Set(['pending', 'assigned', 'picked_up', 'in_transit']);

export function OrdersLayer({ selectedOrderId, onSelectOrder }) {
  const { data: orders = [] } = useOrders();
  const visible = orders.filter((o) => VISIBLE_STATUSES.has(o.status));

  return (
    <LayerGroup>
      {visible.map((o) => (
        <Marker
          key={o.id}
          position={[o.delivery_lat, o.delivery_lng]}
          icon={orderIcon(o.status, { selected: o.id === selectedOrderId })}
          eventHandlers={{
            click: () => onSelectOrder?.(o.id),
          }}
        />
      ))}
    </LayerGroup>
  );
}
```

- [ ] **Step 4: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/map/MerchantsLayer.jsx frontend/components/map/CouriersLayer.jsx frontend/components/map/OrdersLayer.jsx; git commit -m "feat(frontend): add merchants/couriers/orders map layers"
```

---

## Task 17: MapContainerInner + MapView wrapper

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\map\MapContainerInner.jsx`
- Create: `d:\Projeler\kuryeTakip\frontend\components\map\MapView.jsx`

- [ ] **Step 1: MapContainerInner**

Path: `d:\Projeler\kuryeTakip\frontend\components\map\MapContainerInner.jsx`

```jsx
'use client';

import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { MerchantsLayer } from './MerchantsLayer';
import { CouriersLayer } from './CouriersLayer';
import { OrdersLayer } from './OrdersLayer';
import { useFlyTo } from './useFlyTo';

function FlyController({ flyTarget }) {
  useFlyTo(flyTarget);
  return null;
}

function ClickHandler({ onMapClick, enabled }) {
  useMapEvents({
    click(e) {
      if (enabled) onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

const ISTANBUL = [41.0082, 28.9784];

export default function MapContainerInner({
  flyTarget,
  selectedOrderId,
  onSelectOrder,
  onMapClick,
  clickEnabled = false,
}) {
  return (
    <MapContainer
      center={ISTANBUL}
      zoom={12}
      className="h-full w-full"
      attributionControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MerchantsLayer />
      <CouriersLayer />
      <OrdersLayer selectedOrderId={selectedOrderId} onSelectOrder={onSelectOrder} />
      <FlyController flyTarget={flyTarget} />
      <ClickHandler onMapClick={onMapClick} enabled={clickEnabled} />
    </MapContainer>
  );
}
```

- [ ] **Step 2: MapView (the dynamic wrapper)**

Path: `d:\Projeler\kuryeTakip\frontend\components\map\MapView.jsx`

```jsx
'use client';

import dynamic from 'next/dynamic';

const MapContainerInner = dynamic(() => import('./MapContainerInner'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-zinc-100 text-sm text-zinc-500">
      Loading map&hellip;
    </div>
  ),
});

export function MapView(props) {
  return <MapContainerInner {...props} />;
}
```

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/map/MapContainerInner.jsx frontend/components/map/MapView.jsx; git commit -m "feat(frontend): add MapView dynamic wrapper + MapContainerInner with OSM tiles"
```

---

## Task 18: Dashboard page skeleton (map only)

**Files:**
- Modify: `d:\Projeler\kuryeTakip\frontend\app\page.js`

Replace the demo content with a hero-map dashboard. Bottom strip + right rail come in following tasks.

- [ ] **Step 1: Replace `page.js`**

Path: `d:\Projeler\kuryeTakip\frontend\app\page.js`

```jsx
'use client';

import { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { MapView } from '@/components/map/MapView';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);

  return (
    <div className="h-screen flex flex-col">
      <TopBar>
        <Button variant="primary" size="sm">+ New order</Button>
      </TopBar>
      <main className="flex-1 relative">
        <MapView
          selectedOrderId={selectedOrderId}
          onSelectOrder={setSelectedOrderId}
          flyTarget={flyTarget}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify the dev servers**

Terminal 1:
```powershell
cd "d:/Projeler/kuryeTakip/backend"; npm run dev
```

Terminal 2:
```powershell
cd "d:/Projeler/kuryeTakip/frontend"; npm run dev
```

Open http://localhost:3001. Expected:
- Top bar shows "Dispatch" wordmark, "Dispatch / Merchants" nav, "+ New order" button.
- The body fills with an OSM map centered on Istanbul.
- 4 emerald pins (merchants) visible.
- 0 order pins (none seeded).

Leave dev servers running for subsequent tasks (they hot-reload).

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/app/page.js; git commit -m "feat(frontend): wire DashboardPage with top bar + hero map"
```

---

## Task 19: Unassigned-orders bottom strip

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\dashboard\OrderCard.jsx`
- Create: `d:\Projeler\kuryeTakip\frontend\components\dashboard\UnassignedStrip.jsx`
- Modify: `d:\Projeler\kuryeTakip\frontend\app\page.js`

- [ ] **Step 1: OrderCard**

Path: `d:\Projeler\kuryeTakip\frontend\components\dashboard\OrderCard.jsx`

```jsx
'use client';

export function OrderCard({ order, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 w-[140px] h-[72px] rounded-md border text-left p-2 transition-colors ${
        selected
          ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200'
          : 'bg-zinc-50 border-zinc-200 hover:bg-white border-l-2 border-l-indigo-500'
      }`}
    >
      <div className="text-xs font-semibold text-zinc-900">#{order.id.slice(0, 6)}</div>
      <div className="text-xs text-zinc-700 truncate">{order.customer_name}</div>
      <div className="text-[10px] text-zinc-500 truncate">{order.delivery_address}</div>
    </button>
  );
}
```

- [ ] **Step 2: UnassignedStrip**

Path: `d:\Projeler\kuryeTakip\frontend\components\dashboard\UnassignedStrip.jsx`

```jsx
'use client';

import { useOrders } from '@/lib/queries/orders';
import { OrderCard } from './OrderCard';

export function UnassignedStrip({ selectedOrderId, onSelectOrder }) {
  const { data: orders = [], isLoading } = useOrders();
  const pending = orders.filter((o) => o.status === 'pending');

  return (
    <div className="h-24 bg-white border-t border-zinc-200 px-4 py-2">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-1">
        Unassigned &middot; {pending.length}
      </div>
      {isLoading ? (
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-[140px] h-[52px] rounded-md bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="text-xs text-zinc-400 mt-3 text-center">No pending orders</div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {pending.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              selected={o.id === selectedOrderId}
              onClick={() => onSelectOrder(o.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire into the page**

Replace `frontend/app/page.js`:

```jsx
'use client';

import { useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { MapView } from '@/components/map/MapView';
import { UnassignedStrip } from '@/components/dashboard/UnassignedStrip';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);

  function handleSelectOrder(id) {
    setSelectedOrderId(id);
  }

  return (
    <div className="h-screen flex flex-col">
      <TopBar>
        <Button variant="primary" size="sm">+ New order</Button>
      </TopBar>
      <main className="flex-1 relative">
        <MapView
          selectedOrderId={selectedOrderId}
          onSelectOrder={handleSelectOrder}
          flyTarget={flyTarget}
        />
      </main>
      <UnassignedStrip
        selectedOrderId={selectedOrderId}
        onSelectOrder={handleSelectOrder}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Refresh http://localhost:3001. Expected:
- Bottom strip visible with "Unassigned · 0" and "No pending orders" message (seed didn't create any orders).

- [ ] **Step 5: Create a test pending order via the API**

```powershell
$merchant = (Invoke-RestMethod http://localhost:3000/api/merchants | Select-Object -First 1)
$body = "{`"merchant_id`":`"$($merchant.id)`",`"customer_name`":`"Smoke Test`",`"delivery_address`":`"Test Address`",`"delivery_lat`":41.0,`"delivery_lng`":29.0}"
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/orders -ContentType 'application/json' -Body $body
```

Refresh the dashboard. Expected:
- Bottom strip shows "Unassigned · 1" and one card.
- An amber pin appears at [41.0, 29.0].
- Clicking the card or pin sets it as selected (card gets indigo highlight; pin gets halo).

- [ ] **Step 6: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/dashboard/OrderCard.jsx frontend/components/dashboard/UnassignedStrip.jsx frontend/app/page.js; git commit -m "feat(frontend): add unassigned orders bottom strip with selection"
```

---

## Task 20: Couriers right rail

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\dashboard\CourierRow.jsx`
- Create: `d:\Projeler\kuryeTakip\frontend\components\dashboard\CouriersRail.jsx`
- Modify: `d:\Projeler\kuryeTakip\frontend\app\page.js`

- [ ] **Step 1: CourierRow**

Path: `d:\Projeler\kuryeTakip\frontend\components\dashboard\CourierRow.jsx`

```jsx
'use client';

import { Badge } from '@/components/ui/Badge';

const STATUS_TONE = { offline: 'zinc', idle: 'blue', delivering: 'indigo' };

export function CourierRow({ courier, dimmed, distanceKm, onClick }) {
  const tone = STATUS_TONE[courier.status] ?? 'zinc';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={dimmed}
      className={`w-full text-left flex items-center justify-between px-2 py-1.5 rounded-md mb-1 ${
        dimmed
          ? 'opacity-50 cursor-not-allowed bg-transparent'
          : 'bg-zinc-50 hover:bg-indigo-50'
      }`}
    >
      <div className="min-w-0">
        <div className="text-xs font-medium text-zinc-900 truncate">{courier.name}</div>
        <div className="text-[10px] text-zinc-500">{courier.vehicle_type ?? 'unknown'}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {typeof distanceKm === 'number' && (
          <span className="text-[10px] text-indigo-600 font-semibold">
            {distanceKm.toFixed(1)} km
          </span>
        )}
        <Badge tone={tone}>{courier.status}</Badge>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: CouriersRail**

Path: `d:\Projeler\kuryeTakip\frontend\components\dashboard\CouriersRail.jsx`

```jsx
'use client';

import { useCouriers } from '@/lib/queries/couriers';
import { useOrders } from '@/lib/queries/orders';
import { useAssignCourier } from '@/lib/queries/orders';
import { sortCouriersByDistance } from '@/lib/geo';
import { toast } from '@/components/ui/Toaster';
import { CourierRow } from './CourierRow';

export function CouriersRail({ selectedOrderId, onAssigned }) {
  const { data: couriers = [], isLoading } = useCouriers();
  const { data: orders = [] } = useOrders();
  const assign = useAssignCourier();

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  // Partition + sort
  let idleList = couriers.filter((c) => c.status === 'idle');
  const otherList = couriers.filter((c) => c.status !== 'idle');

  let withDistance = false;
  if (selectedOrder) {
    idleList = sortCouriersByDistance(idleList, {
      lat: selectedOrder.delivery_lat,
      lng: selectedOrder.delivery_lng,
    });
    withDistance = true;
  }

  function handleAssign(courierId) {
    if (!selectedOrderId) {
      toast({ tone: 'info', title: 'Select an order first' });
      return;
    }
    assign.mutate(
      { orderId: selectedOrderId, courierId },
      {
        onSuccess: () => {
          toast({ tone: 'success', title: 'Courier assigned' });
          onAssigned?.();
        },
        onError: (err) => {
          toast({ tone: 'error', title: 'Assignment failed', body: err.message });
        },
      },
    );
  }

  return (
    <aside className="absolute top-2 right-2 bottom-2 w-80 bg-white/95 backdrop-blur-sm border border-zinc-200 rounded-lg shadow-sm p-3 overflow-auto z-[400]">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-2">
        {selectedOrder
          ? `Couriers · sorted by distance to #${selectedOrder.id.slice(0, 6)}`
          : `Couriers`}
      </div>

      {isLoading && (
        <div className="space-y-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded-md bg-zinc-100 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && couriers.length === 0 && (
        <div className="text-xs text-zinc-500 leading-relaxed mt-3">
          No couriers yet. Run:
          <code className="block mt-1 text-[10px] bg-zinc-100 px-2 py-1 rounded">
            node backend/scripts/seed.js
          </code>
        </div>
      )}

      {idleList.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-wide text-zinc-400 mt-1 mb-1">Idle</div>
          {idleList.map((c) => (
            <CourierRow
              key={c.id}
              courier={c}
              distanceKm={withDistance ? c.distanceKm : undefined}
              onClick={() => handleAssign(c.id)}
            />
          ))}
        </>
      )}

      {otherList.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-wide text-zinc-400 mt-3 mb-1">Other</div>
          {otherList.map((c) => (
            <CourierRow key={c.id} courier={c} dimmed />
          ))}
        </>
      )}
    </aside>
  );
}
```

- [ ] **Step 3: Wire into the page**

Replace `frontend/app/page.js`:

```jsx
'use client';

import { useState } from 'react';
import { useOrders } from '@/lib/queries/orders';
import { TopBar } from '@/components/layout/TopBar';
import { MapView } from '@/components/map/MapView';
import { UnassignedStrip } from '@/components/dashboard/UnassignedStrip';
import { CouriersRail } from '@/components/dashboard/CouriersRail';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const { data: orders = [] } = useOrders();

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const flyTarget = selectedOrder
    ? { lat: selectedOrder.delivery_lat, lng: selectedOrder.delivery_lng }
    : null;

  return (
    <div className="h-screen flex flex-col">
      <TopBar>
        <Button variant="primary" size="sm">+ New order</Button>
      </TopBar>
      <main className="flex-1 relative">
        <MapView
          selectedOrderId={selectedOrderId}
          onSelectOrder={setSelectedOrderId}
          flyTarget={flyTarget}
        />
        <CouriersRail
          selectedOrderId={selectedOrderId}
          onAssigned={() => setSelectedOrderId(null)}
        />
      </main>
      <UnassignedStrip
        selectedOrderId={selectedOrderId}
        onSelectOrder={setSelectedOrderId}
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify the assignment flow end-to-end**

Refresh http://localhost:3001. Expected:
- Right rail shows 5 couriers under "Idle".
- Click the unassigned order card → map flies to the order pin (halo pulses), rail header changes to "Couriers · sorted by distance to #…", each idle row shows a distance.
- Click any idle courier row → "Courier assigned" toast appears, the order leaves the unassigned strip, its pin color flips from amber → indigo (because status is now `assigned`), the assigned courier's row moves to the "Other" section as `delivering`.

- [ ] **Step 5: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/dashboard/CourierRow.jsx frontend/components/dashboard/CouriersRail.jsx frontend/app/page.js; git commit -m "feat(frontend): add couriers right rail with spatial assignment"
```

---

## Task 21: Order schema + CreateOrderDialog (no map pin yet)

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\orders\orderSchema.js`
- Create: `d:\Projeler\kuryeTakip\frontend\components\orders\CreateOrderDialog.jsx`

This task ships the modal with **numeric lat/lng inputs**. The next task replaces those inputs with map-click picking.

- [ ] **Step 1: Zod schema (mirrors backend body)**

Path: `d:\Projeler\kuryeTakip\frontend\components\orders\orderSchema.js`

The lat/lng aren't part of the RHF schema — they come from `pickedLatLng` (page-level state) and we validate them at submit time, so the user can't accidentally submit lat=0/lng=0.

```js
import { z } from 'zod';

export const orderFormSchema = z.object({
  merchant_id: z.string().uuid({ message: 'Select a merchant' }),
  customer_name: z.string().min(1, 'Required').max(255),
  delivery_address: z.string().min(1, 'Required'),
});
```

- [ ] **Step 2: Dialog**

Path: `d:\Projeler\kuryeTakip\frontend\components\orders\CreateOrderDialog.jsx`

```jsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useMerchants } from '@/lib/queries/merchants';
import { useCreateOrder } from '@/lib/queries/orders';
import { toast } from '@/components/ui/Toaster';
import { orderFormSchema } from './orderSchema';

export function CreateOrderDialog({ open, onClose, pickedLatLng, onPickLocation }) {
  const { data: merchants = [] } = useMerchants();
  const create = useCreateOrder();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      merchant_id: '',
      customer_name: '',
      delivery_address: '',
    },
  });

  // Reset the form whenever the dialog opens fresh (no merchant selected)
  useEffect(() => {
    if (open) {
      reset({ merchant_id: '', customer_name: '', delivery_address: '' });
    }
  }, [open, reset]);

  function onSubmit(values) {
    if (!pickedLatLng) {
      toast({ tone: 'error', title: 'Pick a delivery location on the map first' });
      return;
    }
    create.mutate(
      {
        ...values,
        delivery_lat: pickedLatLng.lat,
        delivery_lng: pickedLatLng.lng,
      },
      {
        onSuccess: () => {
          toast({ tone: 'success', title: 'Order created' });
          onClose();
        },
        onError: (err) => {
          toast({ tone: 'error', title: 'Create failed', body: err.message });
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New order"
      widthClass="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create order'}
          </Button>
        </>
      }
    >
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="text-xs font-medium text-zinc-700 block mb-1">Merchant</label>
          <Select {...register('merchant_id')} error={!!errors.merchant_id} className="w-full">
            <option value="">Select a merchant&hellip;</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
          {errors.merchant_id && (
            <p className="text-[10px] text-red-600 mt-1">{errors.merchant_id.message}</p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 block mb-1">Customer name</label>
          <Input {...register('customer_name')} error={!!errors.customer_name} className="w-full" />
          {errors.customer_name && (
            <p className="text-[10px] text-red-600 mt-1">{errors.customer_name.message}</p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 block mb-1">Delivery address</label>
          <Input {...register('delivery_address')} error={!!errors.delivery_address} className="w-full" />
          {errors.delivery_address && (
            <p className="text-[10px] text-red-600 mt-1">{errors.delivery_address.message}</p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 block mb-1">Delivery location</label>
          {pickedLatLng ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-600">
                📍 {pickedLatLng.lat.toFixed(4)}, {pickedLatLng.lng.toFixed(4)}
              </span>
              <Button variant="ghost" size="sm" onClick={onPickLocation}>Change</Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={onPickLocation}>
              Click map to set location
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/orders/orderSchema.js frontend/components/orders/CreateOrderDialog.jsx; git commit -m "feat(frontend): add CreateOrderDialog (form, no map-pick yet)"
```

---

## Task 22: Wire CreateOrderDialog + click-to-set-pin into the dashboard

**Files:**
- Modify: `d:\Projeler\kuryeTakip\frontend\app\page.js`

- [ ] **Step 1: Wire it all together**

Replace `frontend/app/page.js`:

```jsx
'use client';

import { useState } from 'react';
import { useOrders } from '@/lib/queries/orders';
import { TopBar } from '@/components/layout/TopBar';
import { MapView } from '@/components/map/MapView';
import { UnassignedStrip } from '@/components/dashboard/UnassignedStrip';
import { CouriersRail } from '@/components/dashboard/CouriersRail';
import { CreateOrderDialog } from '@/components/orders/CreateOrderDialog';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [pickedLatLng, setPickedLatLng] = useState(null);

  const { data: orders = [] } = useOrders();
  const selectedOrder = orders.find((o) => o.id === selectedOrderId);
  const flyTarget = selectedOrder
    ? { lat: selectedOrder.delivery_lat, lng: selectedOrder.delivery_lng }
    : null;

  function openCreate() {
    setPickedLatLng(null);
    setCreateOpen(true);
  }

  function startPicking() {
    setCreateOpen(false);
    setPickingLocation(true);
  }

  function handleMapClick(latlng) {
    if (!pickingLocation) return;
    setPickedLatLng(latlng);
    setPickingLocation(false);
    setCreateOpen(true);
  }

  function cancelPicking() {
    setPickingLocation(false);
    setCreateOpen(true);
  }

  return (
    <div className="h-screen flex flex-col">
      <TopBar>
        <Button variant="primary" size="sm" onClick={openCreate}>+ New order</Button>
      </TopBar>
      <main className="flex-1 relative">
        <MapView
          selectedOrderId={selectedOrderId}
          onSelectOrder={setSelectedOrderId}
          flyTarget={flyTarget}
          onMapClick={handleMapClick}
          clickEnabled={pickingLocation}
        />
        {!pickingLocation && (
          <CouriersRail
            selectedOrderId={selectedOrderId}
            onAssigned={() => setSelectedOrderId(null)}
          />
        )}
        {pickingLocation && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-4 py-2 rounded-md shadow-md z-[500] flex items-center gap-3">
            Click anywhere on the map to set the delivery location
            <button onClick={cancelPicking} className="underline hover:text-indigo-100">Cancel</button>
          </div>
        )}
      </main>
      <UnassignedStrip
        selectedOrderId={selectedOrderId}
        onSelectOrder={setSelectedOrderId}
      />

      <CreateOrderDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        pickedLatLng={pickedLatLng}
        onPickLocation={startPicking}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Refresh http://localhost:3001:
- Click "+ New order" → modal opens.
- Pick a merchant, type customer name + address.
- Click "Click map to set location" → modal closes, indigo banner at top says "Click anywhere on the map…", cursor is crosshair-ish (default).
- Click a spot on the map → modal re-opens, coordinates shown as "📍 lat, lng".
- Click "Create order" → toast "Order created", modal closes, new amber pin appears, new card in the bottom strip.
- "Cancel" in the banner returns to the modal without setting a location.

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/app/page.js; git commit -m "feat(frontend): wire click-to-set-pin order creation flow"
```

---

## Task 23: Order status updates via map popover

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\dashboard\StatusPopup.jsx`
- Modify: `d:\Projeler\kuryeTakip\frontend\components\map\OrdersLayer.jsx`

- [ ] **Step 1: StatusPopup**

Path: `d:\Projeler\kuryeTakip\frontend\components\dashboard\StatusPopup.jsx`

```jsx
'use client';

import { useUpdateOrderStatus } from '@/lib/queries/orders';
import { toast } from '@/components/ui/Toaster';
import { Button } from '@/components/ui/Button';

const ALLOWED = {
  assigned:  ['picked_up', 'cancelled'],
  picked_up: ['delivered', 'cancelled'],
};

export function StatusPopup({ order, onDone }) {
  const update = useUpdateOrderStatus();
  const next = ALLOWED[order.status] ?? [];
  const terminal = next.length === 0;

  function go(status) {
    update.mutate(
      { orderId: order.id, status },
      {
        onSuccess: () => {
          toast({ tone: 'success', title: `Order ${status}` });
          onDone?.();
        },
        onError: (err) => {
          toast({ tone: 'error', title: 'Status update failed', body: err.message });
        },
      },
    );
  }

  return (
    <div className="text-xs min-w-[180px]">
      <div className="font-semibold text-zinc-900">#{order.id.slice(0, 6)}</div>
      <div className="text-zinc-700">{order.customer_name}</div>
      <div className="text-[10px] text-zinc-500 mb-2">Status: {order.status}</div>
      {terminal ? (
        <div className="text-[10px] text-zinc-500">Terminal state &mdash; no actions.</div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {next.includes('picked_up') && (
            <Button size="sm" onClick={() => go('picked_up')}>Picked up</Button>
          )}
          {next.includes('delivered') && (
            <Button size="sm" onClick={() => go('delivered')}>Delivered</Button>
          )}
          {next.includes('cancelled') && (
            <Button size="sm" variant="danger" onClick={() => go('cancelled')}>Cancel</Button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update OrdersLayer to render Popup**

Replace `frontend/components/map/OrdersLayer.jsx`:

```jsx
'use client';

import { LayerGroup, Marker, Popup } from 'react-leaflet';
import { useOrders } from '@/lib/queries/orders';
import { orderIcon } from './markers';
import { StatusPopup } from '@/components/dashboard/StatusPopup';

const VISIBLE_STATUSES = new Set(['pending', 'assigned', 'picked_up', 'in_transit']);

export function OrdersLayer({ selectedOrderId, onSelectOrder }) {
  const { data: orders = [] } = useOrders();
  const visible = orders.filter((o) => VISIBLE_STATUSES.has(o.status));

  return (
    <LayerGroup>
      {visible.map((o) => (
        <Marker
          key={o.id}
          position={[o.delivery_lat, o.delivery_lng]}
          icon={orderIcon(o.status, { selected: o.id === selectedOrderId })}
          eventHandlers={{ click: () => onSelectOrder?.(o.id) }}
        >
          {o.status !== 'pending' && (
            <Popup>
              <StatusPopup order={o} />
            </Popup>
          )}
        </Marker>
      ))}
    </LayerGroup>
  );
}
```

Note: pending orders don't get a popup (they have no actions until assigned). Their click just selects them for assignment.

- [ ] **Step 3: Verify**

Refresh http://localhost:3001. Assign an order to a courier first. Then:
- Click the assigned order's pin (indigo) → Leaflet popup opens with "Picked up" and "Cancel" buttons.
- Click "Picked up" → toast "Order picked_up", pin color shifts to amber (status `picked_up`).
- Click the pin again → popup now shows "Delivered" and "Cancel" only.
- Click "Delivered" → toast "Order delivered", pin disappears from the map (terminal status).

- [ ] **Step 4: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/dashboard/StatusPopup.jsx frontend/components/map/OrdersLayer.jsx; git commit -m "feat(frontend): add status update popover on assigned order pins"
```

---

## Task 24: Merchant schema + MerchantMiniMap

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\merchants\merchantSchema.js`
- Create: `d:\Projeler\kuryeTakip\frontend\components\merchants\MerchantMiniMap.jsx`

- [ ] **Step 1: Zod schema**

Path: `d:\Projeler\kuryeTakip\frontend\components\merchants\merchantSchema.js`

```js
import { z } from 'zod';

export const merchantCreateSchema = z.object({
  name: z.string().min(1, 'Required').max(255),
  address: z.string().min(1, 'Required'),
  phone: z.string().max(20).optional().or(z.literal('')),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
});
```

- [ ] **Step 2: MerchantMiniMap**

Path: `d:\Projeler\kuryeTakip\frontend\components\merchants\MerchantMiniMap.jsx`

The mini-map is its own dynamic-imported wrapper because it must not SSR (Leaflet).

Step 2a — create the inner component:

Path: `d:\Projeler\kuryeTakip\frontend\components\merchants\MerchantMiniMapInner.jsx`

```jsx
'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { merchantIcon } from '@/components/map/markers';

const ISTANBUL = [41.0082, 28.9784];

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MerchantMiniMapInner({ value, onChange }) {
  const center = value ? [value.lat, value.lng] : ISTANBUL;
  return (
    <MapContainer center={center} zoom={value ? 14 : 11} className="h-60 w-full rounded-md">
      <TileLayer
        attribution='&copy; OSM'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onChange} />
      {value && <Marker position={[value.lat, value.lng]} icon={merchantIcon()} />}
    </MapContainer>
  );
}
```

Step 2b — create the dynamic wrapper:

Path: `d:\Projeler\kuryeTakip\frontend\components\merchants\MerchantMiniMap.jsx`

```jsx
'use client';

import dynamic from 'next/dynamic';

const MerchantMiniMapInner = dynamic(() => import('./MerchantMiniMapInner'), {
  ssr: false,
  loading: () => <div className="h-60 w-full rounded-md bg-zinc-100 animate-pulse" />,
});

export function MerchantMiniMap(props) {
  return <MerchantMiniMapInner {...props} />;
}
```

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/merchants/merchantSchema.js frontend/components/merchants/MerchantMiniMap.jsx frontend/components/merchants/MerchantMiniMapInner.jsx; git commit -m "feat(frontend): add merchant schema + click-to-set MerchantMiniMap"
```

---

## Task 25: MerchantDialog (create + edit)

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\merchants\MerchantDialog.jsx`

- [ ] **Step 1: Implement**

Path: `d:\Projeler\kuryeTakip\frontend\components\merchants\MerchantDialog.jsx`

```jsx
'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateMerchant, useUpdateMerchant } from '@/lib/queries/merchants';
import { toast } from '@/components/ui/Toaster';
import { merchantCreateSchema } from './merchantSchema';
import { MerchantMiniMap } from './MerchantMiniMap';

export function MerchantDialog({ open, onClose, merchant }) {
  const isEdit = !!merchant;
  const create = useCreateMerchant();
  const update = useUpdateMerchant();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(merchantCreateSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      latitude: 0,
      longitude: 0,
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        isEdit
          ? {
              name: merchant.name,
              address: merchant.address,
              phone: merchant.phone ?? '',
              latitude: merchant.latitude,
              longitude: merchant.longitude,
            }
          : {
              name: '',
              address: '',
              phone: '',
              latitude: 0,
              longitude: 0,
            },
      );
    }
  }, [open, isEdit, merchant, reset]);

  function onSubmit(values) {
    const body = { ...values, phone: values.phone || undefined };
    if (isEdit) {
      update.mutate(
        { id: merchant.id, patch: body },
        {
          onSuccess: () => {
            toast({ tone: 'success', title: 'Merchant updated' });
            onClose();
          },
          onError: (err) => toast({ tone: 'error', title: 'Update failed', body: err.message }),
        },
      );
    } else {
      create.mutate(body, {
        onSuccess: () => {
          toast({ tone: 'success', title: 'Merchant created' });
          onClose();
        },
        onError: (err) => toast({ tone: 'error', title: 'Create failed', body: err.message }),
      });
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit merchant' : 'New merchant'}
      widthClass="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create merchant'}
          </Button>
        </>
      }
    >
      <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="text-xs font-medium text-zinc-700 block mb-1">Name</label>
          <Input {...register('name')} error={!!errors.name} className="w-full" />
          {errors.name && <p className="text-[10px] text-red-600 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 block mb-1">Address</label>
          <Input {...register('address')} error={!!errors.address} className="w-full" />
          {errors.address && <p className="text-[10px] text-red-600 mt-1">{errors.address.message}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 block mb-1">Phone (optional)</label>
          <Input {...register('phone')} error={!!errors.phone} className="w-full" />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-700 block mb-1">Location</label>
          <Controller
            name="latitude"
            control={control}
            render={({ field: latField }) => (
              <Controller
                name="longitude"
                control={control}
                render={({ field: lngField }) => {
                  const value =
                    latField.value && lngField.value
                      ? { lat: latField.value, lng: lngField.value }
                      : null;
                  return (
                    <>
                      <MerchantMiniMap
                        value={value}
                        onChange={(p) => {
                          latField.onChange(p.lat);
                          lngField.onChange(p.lng);
                        }}
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">
                        {value
                          ? `📍 ${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}`
                          : 'Click the map to set the merchant location'}
                      </p>
                    </>
                  );
                }}
              />
            )}
          />
          {(errors.latitude || errors.longitude) && (
            <p className="text-[10px] text-red-600 mt-1">Location is required</p>
          )}
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/merchants/MerchantDialog.jsx; git commit -m "feat(frontend): add MerchantDialog (create + edit) with mini-map location pick"
```

---

## Task 26: DeleteConfirmDialog

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\merchants\DeleteConfirmDialog.jsx`

- [ ] **Step 1: Implement**

Path: `d:\Projeler\kuryeTakip\frontend\components\merchants\DeleteConfirmDialog.jsx`

```jsx
'use client';

import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

export function DeleteConfirmDialog({ open, onClose, onConfirm, name, isPending }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete merchant"
      widthClass="max-w-sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-zinc-700">
        Delete <span className="font-semibold">{name}</span>? This cannot be undone.
      </p>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/merchants/DeleteConfirmDialog.jsx; git commit -m "feat(frontend): add DeleteConfirmDialog for merchants"
```

---

## Task 27: MerchantsTable

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\components\merchants\MerchantsTable.jsx`

- [ ] **Step 1: Implement**

Path: `d:\Projeler\kuryeTakip\frontend\components\merchants\MerchantsTable.jsx`

```jsx
'use client';

import { useState } from 'react';
import { useMerchants, useDeleteMerchant } from '@/lib/queries/merchants';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MerchantDialog } from './MerchantDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { toast } from '@/components/ui/Toaster';

export function MerchantsTable() {
  const { data: merchants = [], isLoading } = useMerchants();
  const del = useDeleteMerchant();

  const [editing, setEditing] = useState(null); // merchant object or null
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);

  function confirmDelete() {
    if (!deleting) return;
    del.mutate(deleting.id, {
      onSuccess: () => {
        toast({ tone: 'success', title: 'Merchant deleted' });
        setDeleting(null);
      },
      onError: (err) => {
        const friendly =
          err.code === 'INTERNAL_ERROR' || /foreign key/i.test(err.message)
            ? 'Cannot delete: merchant has orders'
            : err.message;
        toast({ tone: 'error', title: 'Delete failed', body: friendly });
        setDeleting(null);
      },
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Merchants</h1>
        <Button onClick={() => setCreating(true)}>+ New merchant</Button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-sm text-zinc-500">Loading&hellip;</div>
        ) : merchants.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-zinc-600 mb-3">No merchants yet</p>
            <Button onClick={() => setCreating(true)}>Create your first one</Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2 font-semibold">Name</th>
                <th className="px-4 py-2 font-semibold">Address</th>
                <th className="px-4 py-2 font-semibold">Phone</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((m) => (
                <tr key={m.id} className="border-t border-zinc-100">
                  <td className="px-4 py-2 font-medium text-zinc-900">{m.name}</td>
                  <td className="px-4 py-2 text-zinc-700 truncate max-w-xs">{m.address}</td>
                  <td className="px-4 py-2 text-zinc-700">{m.phone ?? '—'}</td>
                  <td className="px-4 py-2">
                    <Badge tone={m.is_active ? 'emerald' : 'zinc'}>
                      {m.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(m)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleting(m)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <MerchantDialog
        open={creating}
        onClose={() => setCreating(false)}
        merchant={null}
      />
      <MerchantDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        merchant={editing}
      />
      <DeleteConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        name={deleting?.name ?? ''}
        isPending={del.isPending}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/components/merchants/MerchantsTable.jsx; git commit -m "feat(frontend): add MerchantsTable with create/edit/delete"
```

---

## Task 28: /merchants page

**Files:**
- Create: `d:\Projeler\kuryeTakip\frontend\app\merchants\page.js`

- [ ] **Step 1: Implement**

Path: `d:\Projeler\kuryeTakip\frontend\app\merchants\page.js`

```jsx
'use client';

import { TopBar } from '@/components/layout/TopBar';
import { MerchantsTable } from '@/components/merchants/MerchantsTable';

export default function MerchantsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className="flex-1">
        <MerchantsTable />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Open http://localhost:3001/merchants. Expected:
- Top bar with "Merchants" nav active (indigo underline).
- Table with 4 merchants (from seed) showing name, address, phone, Active badge, Edit/Delete buttons.
- Click "+ New merchant" → dialog with form + mini-map. Click the map to set location → marker appears at the click. Submit → toast + new row.
- Click "Edit" on a row → dialog pre-filled. Change name → save → toast + row updates.
- Click "Delete" → confirmation → confirm → toast + row gone.
- Try deleting a merchant that has orders → error toast "Cannot delete: merchant has orders".

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add frontend/app/merchants/page.js; git commit -m "feat(frontend): add /merchants page wired to MerchantsTable"
```

---

## Task 29: README running-locally section

**Files:**
- Modify: `d:\Projeler\kuryeTakip\README.md`

- [ ] **Step 1: Check current state**

```powershell
type "d:/Projeler/kuryeTakip/README.md"
```

If the file doesn't exist yet, create it. Otherwise modify.

- [ ] **Step 2: Write/update**

Path: `d:\Projeler\kuryeTakip\README.md`

```markdown
# kuryeTakip

Real-time courier tracking — portfolio project.

## Running locally

Prereqs: Node 20+, a Supabase Postgres connection string in `backend/.env`, and an Upstash Redis URL in the same file.

### One-time

```powershell
cd backend; npm install
cd ../frontend; npm install
```

Seed demo data (4 Istanbul merchants + 5 couriers):

```powershell
cd backend; node scripts/seed.js
```

### Dev servers (two terminals)

Terminal 1 (Express on http://localhost:3000):
```powershell
cd backend; npm run dev
```

Terminal 2 (Next.js on http://localhost:3001):
```powershell
cd frontend; npm run dev
```

Open http://localhost:3001 — the dashboard.

### Tests

- Backend: `cd backend; npm test` (95 tests, ~5 minutes against the Supabase pooler)
- Frontend: `cd frontend; npm test` (7 unit tests, instant)
```

- [ ] **Step 3: Commit**

```powershell
cd "d:/Projeler/kuryeTakip"; git add README.md; git commit -m "docs: add running-locally instructions"
```

---

## Task 30: Final manual smoke test + tag

- [ ] **Step 1: Stop any running dev servers, re-seed, and restart**

```powershell
# In each running dev terminal: Ctrl+C
cd "d:/Projeler/kuryeTakip/backend"; node scripts/seed.js
cd "d:/Projeler/kuryeTakip/backend"; npm run dev
# In another terminal:
cd "d:/Projeler/kuryeTakip/frontend"; npm run dev
```

- [ ] **Step 2: Run through the acceptance checklist**

Open http://localhost:3001 and verify every item from spec § 15:

1. 4 merchant pins (emerald) + map of Istanbul.
2. "+ New order" → modal → "Click map to set location" → click map → pin shown → submit → new amber pin + new card in bottom strip.
3. Click the amber card → map flies to it, pin halos, rail re-titles to "Couriers · sorted by distance to #…", rows show distances.
4. Click an idle courier → toast "Courier assigned", card leaves the strip, pin flips to indigo.
5. Click the indigo pin → popup → "Picked up" → toast → pin flips to amber. Click again → "Delivered" → pin disappears.
6. Navigate to /merchants → table → create/edit/delete a merchant.
7. Try deleting a merchant that has orders → error toast about FK.

- [ ] **Step 3: Run all tests**

```powershell
cd "d:/Projeler/kuryeTakip/frontend"; npm test
cd "d:/Projeler/kuryeTakip/backend"; npm test
```

Expected: frontend 7/7 (geo), backend 95/95.

- [ ] **Step 4: Stop dev servers (Ctrl+C in each)**

- [ ] **Step 5: Tag the milestone**

```powershell
cd "d:/Projeler/kuryeTakip"; git tag -a sub-project-3-complete -m "Sub-Project 3: Dispatcher Dashboard (Next.js, CRUD-only)"
```

---

## Acceptance Criteria

This sub-project is **done** when all of these are true:

1. `node backend/scripts/seed.js` succeeds and is idempotent.
2. `npm run dev` in both packages starts cleanly. The dashboard at http://localhost:3001 shows 4 merchant pins on an OSM map of Istanbul.
3. "+ New order" → modal → click-to-set-pin → submit → new pending pin + new strip card.
4. Click an unassigned card → map flies, halo, rail re-sorts by distance.
5. Click an idle courier row → order is assigned (PATCH succeeds, toast shown, pin re-colors, courier shifts to "Other"/dimmed).
6. Click an assigned order pin → popup with status buttons; "Picked up" and "Delivered" advance status; pin disappears at terminal states.
7. /merchants table renders 4 rows. CRUD (create with mini-map, edit, delete) all work. Deleting a merchant with orders shows an FK-related toast error.
8. `cd frontend; npm test` passes 7/7.
9. `cd backend; npm test` still passes 95/95 (no regressions).
10. Tag `sub-project-3-complete` exists.

---

## What's NOT in this sub-project (handled later)

- Real-time courier positions (Redis GEO + WebSocket) → **Sub-Project 4**.
- OSRM route previews on the map → **Sub-Project 5**.
- Authentication / login → future sub-project.
- Couriers CRUD page (we seed instead).
- KPI counts, search, filters, pagination — future polish.

---

## Next Step

After this plan completes and you've tagged `sub-project-3-complete`, return to `superpowers:writing-plans` and we'll write **Sub-Project 4: Location Ingestion Hot Path** (Redis GEOADD + HSET + PUBLISH, async snapshot batch writer, rate-limited `POST /api/couriers/:id/location` endpoint, then WebSocket bridge to push positions to the dashboard).
