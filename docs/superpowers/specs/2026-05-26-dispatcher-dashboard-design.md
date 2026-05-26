# Dispatcher Dashboard Design

**Sub-project:** 3 of the Phase 1 plan (the frontend dashboard that consumes the CRUD APIs already built in sub-projects 1 and 2).

**One-line pitch:** A cockpit that turns an incoming order into a courier assignment in two clicks.

---

## 1. Goal

Ship a single-page operational dashboard (`/`) that lets a dispatcher:

1. See every merchant, courier, and order pinned on a map at all times.
2. Assign a pending order to a nearby courier by clicking the order, then clicking a courier in the right rail.
3. Create new orders by clicking on the map to set the delivery location.
4. Advance an order through its status states (`picked_up` → `delivered`, or `cancelled`) from a popover on its map pin.
5. Manage merchants on a separate `/merchants` page with full CRUD.

The frontend consumes only the REST endpoints already shipped in sub-project 2. Real-time, routing, and authentication are explicitly out of scope and handled by later sub-projects.

---

## 2. Scope

### In v1

- Hero map at `/` showing merchants, couriers, and orders as three layers.
- Bottom strip of unassigned (`status='pending'`) order cards.
- Right rail listing all couriers, sorted by status, with distance-sort behavior when an order is selected.
- Spatial assignment flow (click order → map flies + rail re-sorts → click courier → PATCH).
- Order creation modal with click-to-set-pin location picking.
- Order status update popover (picked_up / delivered / cancelled).
- Merchants page at `/merchants` with table + create/edit/delete modals, mini-map for location picking.
- Seed script (`backend/scripts/seed.js`) for realistic demo data.

### Out of v1 (deferred to later sub-projects)

- Couriers CRUD page — couriers are added via the seed script or the existing REST API in v1.
- Real-time courier positions, Redis GEO, Socket.io broadcasts (sub-project 4).
- OSRM route previews on the map (sub-project 5).
- Authentication / login flow (separate future sub-project).
- KPI strip, filters, search, pagination.

### Decision concern (flagged)

Without a couriers CRUD page, new couriers can only be created via the API. The seed script is the official v1 workaround; a real couriers page can be added in a small follow-up if it bothers us in practice.

---

## 3. Information Architecture

```
/                Dispatch dashboard (the cockpit)
/merchants       Merchants table + CRUD
```

Top bar (persistent across both routes):

- **Left:** brand wordmark "Dispatch" (indigo).
- **Center:** nav links — `Dispatch` · `Merchants`. Active link gets an indigo underline.
- **Right:** "+ New order" button (indigo background, only rendered on `/`).

---

## 4. Visual Personality

- **Surfaces:** white (`bg-white`), zinc-50 backgrounds (`bg-zinc-50`).
- **Borders:** `border-zinc-200`, hairline.
- **Accent:** indigo-600 for primary actions, selected states, brand wordmark.
- **Map tiles:** OpenStreetMap raster tiles (the default colorful style — looks like a real map).
- **Merchant pins** → always emerald-500 (no status variation).
- **Courier pins** → color follows status: offline → zinc-400, idle → blue-500, delivering → indigo-600.
- **Order pins** → color follows status: pending → amber-500, assigned → indigo-600, picked_up → amber-600, in_transit → amber-700.
- **Map only renders non-terminal orders.** Orders with status `delivered` or `cancelled` are dropped from the orders layer (they remain in the database but disappear from the cockpit).
- **Status badges** in the couriers rail follow the same status palette as courier pins.
- **Typography:** system stack via Tailwind defaults. Headings use `font-semibold`, never bold. Labels use `text-xs uppercase tracking-wide text-zinc-500`.
- **Spacing:** 8px grid everywhere. Card padding 12px. Section gaps 16px.

---

## 5. Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Dispatch    Dispatch · Merchants            [+ New order]   │  56px top bar
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                          ┌───────────────┐  │
│                                          │ Couriers      │  │
│                                          │ ─ Berkay      │  │  Right rail
│              [ MAP ]                     │ ─ Elif        │  │  320px wide
│                                          │ ─ Can         │  │  Floats over map
│                                          └───────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Unassigned · 3                                              │
│ [ #A12 ]  [ #A11 ]  [ #A09 ]  ──────────────────────►       │  96px bottom strip
└─────────────────────────────────────────────────────────────┘
```

- **Top bar:** 56px tall, full width, white card, `border-b border-zinc-200`.
- **Map:** fills the rest of the viewport behind all overlays.
- **Bottom strip:** 96px tall, full width, white card with `border-t`. Horizontal scroll container holding order cards (110×72px, 8px gap). Label "Unassigned · N" top-left in label style.
- **Right rail:** 320px wide. Top: 8px below the top bar. Bottom: 8px above the bottom strip. White card, `shadow-sm`, `border border-zinc-200`. Internal: "Couriers" label header + rows.
- All overlays use a subtle `bg-white/95 backdrop-blur-sm` so the map is barely visible through them.

---

## 6. Map

### Library

- `react-leaflet@5` + `leaflet@1.9`.
- Tile provider: OSM (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`). Free; needs proper attribution in the map corner — handled by `<TileLayer attribution="© OpenStreetMap contributors" />`.

### SSR safety

Leaflet touches `window` on import. The `<MapContainer>` must be loaded client-only:

```js
// components/map/MapView.jsx
'use client';
import dynamic from 'next/dynamic';

const MapContainer = dynamic(() => import('./MapContainerInner'), { ssr: false });
export default MapContainer;
```

`MapContainerInner.jsx` is the file that imports from `react-leaflet`.

### Layers

- `MerchantsLayer.jsx`, `CouriersLayer.jsx`, `OrdersLayer.jsx` — each takes its array from React Query and renders one `<Marker>` per entity.
- Markers use Leaflet `DivIcon` whose payload is a small `<div>` tree styled by Tailwind classes (8px colored dot + 2px white ring + drop shadow).
- The currently-selected order gets a 24px indigo halo (a sibling `<div>` we animate with CSS `@keyframes pulse`).

### Imperative camera

- `useFlyTo(target)` hook calls `map.flyTo([lat, lng], 14, { duration: 0.6 })` when `selectedOrderId` changes. The hook gets the map instance via `useMap()`.

### Initial view

- Center `[41.0082, 28.9784]` (Istanbul).
- Zoom 12.

---

## 7. Data Layer

### API client

`lib/api.js` exports `apiFetch(path, options)`:

- Always prepends `/api`. Calls go through the Next.js rewrite, which forwards to the Express backend on `http://localhost:3000`.
- Parses JSON. On `!res.ok`, throws `new ApiError({ status, code, message, details })`.
- Components never call `fetch` directly — only through query/mutation hooks that call `apiFetch`.

### TanStack Query setup

- `app/providers.js` is a `'use client'` component exporting `<Providers>`. It instantiates one `QueryClient` and wraps children in `<QueryClientProvider>` plus a custom `<Toaster>`.
- `app/layout.js` imports `<Providers>` and wraps `{children}`.
- Defaults: `staleTime: 30_000`, `refetchOnWindowFocus: true`, `retry: 1`.

### Query keys (centralized in `lib/queryKeys.js`)

```js
export const qk = {
  merchants: { all: () => ['merchants'] },
  couriers:  { all: () => ['couriers'] },
  orders:    { all: () => ['orders'],
               byStatus: (s) => ['orders', { status: s }] },
};
```

### Hooks (`lib/queries/`)

- **Reads:** `useMerchants()`, `useCouriers()`, `useOrders(filters?)`.
- **Writes:** `useCreateOrder()`, `useAssignCourier()`, `useUpdateOrderStatus()`, `useCreateMerchant()`, `useUpdateMerchant()`, `useDeleteMerchant()`.
- Each mutation's `onSuccess` invalidates exactly the queries it affects (e.g. `useAssignCourier` invalidates both `qk.orders.all()` and `qk.couriers.all()`).
- No optimistic updates in v1. Refetch latency on the local network is well under 100ms; we add optimism if it ever feels slow.

---

## 8. Critical Interactions

### 8a. Spatial assignment (the hero flow)

**State** (page-level `useState` in `app/page.js`, not Zustand):

```js
const [selectedOrderId, setSelectedOrderId] = useState(null);
```

**Behavior**

1. User clicks an order card in the unassigned strip → `setSelectedOrderId(order.id)`.
2. `useFlyTo` centers the map on the order's `[delivery_lat, delivery_lng]`.
3. `OrdersLayer` renders a pulsing indigo halo around the selected pin.
4. `CouriersRail` reads `selectedOrderId`, looks up the order, and re-sorts:
   - First section: idle couriers, sorted ascending by haversine distance to the order.
   - Second section: delivering/offline couriers, dimmed (opacity 50%), non-clickable.
5. User clicks an idle courier row → `useAssignCourier.mutate({ orderId, courierId })`.
6. On success: clear `selectedOrderId`, both queries refetch, the order leaves the unassigned strip (its status is now `assigned`), the courier's row reorders to the delivering section.

**Pure logic in `lib/geo.js`** (easy to unit test):

```js
export function haversineKm(a, b) { /* … */ }
export function sortCouriersByDistance(couriers, point) { /* … */ }
```

### 8b. Order creation with click-to-set-pin

**State** (in `app/page.js`):

```js
const [createOpen, setCreateOpen]         = useState(false);
const [pickingLocation, setPickingLocation] = useState(false);
const [pickedLatLng, setPickedLatLng]     = useState(null);
```

**Behavior**

1. User clicks "+ New order" → `setCreateOpen(true)`.
2. Modal renders fields: customer name, address, merchant `<Select>` (from `useMerchants`), and a "Click map to set delivery location" button.
3. Clicking that button → `setPickingLocation(true)`. The modal animates to a 40px banner pinned to the top of the screen ("Click the map to set delivery location · [Cancel]"). The map cursor changes to a crosshair.
4. While `pickingLocation` is true, the map's `whenCreated` callback has wired a `'click'` handler that sets `pickedLatLng` to the click location and `setPickingLocation(false)`. The modal expands back, showing the picked coordinates as a small chip ("📍 41.0082, 28.9784 · Change").
5. On submit: `useCreateOrder.mutate(formValues)`. On success: close modal, orders query refetches, new pin appears.
6. Validation: react-hook-form + zod resolver. Schema is the same shape as `backend/src/schemas/order.schema.js`'s body — duplicated in `components/orders/orderSchema.js`. (Yes, two copies; acceptable trade-off vs. sharing — we keep frontend ignorant of backend file paths.)

### 8c. Status updates

- Clicking an *assigned* order pin opens a Leaflet popup whose content is a small React tree (we use `<Popup>` from react-leaflet).
- The popup shows order ID + customer + three buttons: "Picked up" / "Delivered" / "Cancel order".
- Buttons are disabled for transitions that aren't legal from the current state:
  - From `assigned`: only "Picked up" and "Cancel order" are enabled.
  - From `picked_up`: only "Delivered" and "Cancel order" are enabled.
  - From `delivered` or `cancelled`: all disabled (terminal states).
- **`in_transit` is intentionally not exposed in the v1 UI.** The backend allows the state and we don't want to break that schema, but the dispatcher's workflow goes `assigned → picked_up → delivered` directly. A future Driver app (mobile) is the right place to surface `in_transit`.
- Click → `useUpdateOrderStatus.mutate({ orderId, status })` → popup closes on success, pin color updates after refetch.
- (The backend service already stamps the matching timestamp when status advances; no extra fields needed from the frontend.)

---

## 9. Merchants Page (`/merchants`)

- **Header:** "Merchants" title (`text-2xl font-semibold`) + "+ New merchant" button on the right.
- **Body:** single white card (`max-w-5xl mx-auto`) containing a table:

  | Name | Address | Phone | Status | Actions |
  | --- | --- | --- | --- | --- |
  | Pizza Hub | 5 Demo Street, Kadıköy | +90 500 111 2233 | Active | Edit · Delete |

- **Empty state:** centered text "No merchants yet · Create your first one" with the "+ New merchant" CTA.
- **Create modal:** same form fields as the create-order modal but for a merchant — name, address, phone, latitude, longitude. The lat/lng input uses a **mini-map** (320×240 Leaflet `<MapContainer>` inside the modal) with click-to-set-pin behavior. No need to dismiss the modal because there's no full-screen map competing with it.
- **Edit modal:** identical form, pre-filled from the row. PATCH on submit.
- **Delete:** a confirmation dialog ("Delete Pizza Hub? This cannot be undone."). On confirm: DELETE.
  - If the merchant has orders, the backend returns a Postgres FK violation. Our toast surfaces "Cannot delete: merchant has orders" via the existing ApiError pipeline. (A richer service-layer mapping is a backend follow-up.)

---

## 10. Loading, Empty, Error States

- **Loading:** every fetching region shows its own pulsing skeleton. The map renders even while pins are loading — pins fade in. No full-screen spinner.
- **Empty:**
  - Unassigned strip: small centered text "No pending orders".
  - Couriers rail: "No couriers yet · run `node backend/scripts/seed.js`".
  - Merchants table: see § 9.
- **Error:** TanStack Query errors are caught by a global `onError` callback that pushes a toast. The toast component is a custom 50-line `<Toaster>` — no toast library. ApiError details render as the toast body (e.g. "Phone +90… already registered").

---

## 11. File Structure

```
frontend/
├── app/
│   ├── layout.js                 # root layout, includes <Providers>
│   ├── providers.js              # 'use client' — QueryClientProvider + Toaster
│   ├── globals.css               # Tailwind directives + Leaflet CSS import
│   ├── page.js                   # dispatch dashboard (/)
│   └── merchants/
│       └── page.js               # /merchants
│
├── components/
│   ├── layout/
│   │   └── TopBar.jsx
│   ├── map/
│   │   ├── MapView.jsx           # dynamic-imported wrapper (ssr:false)
│   │   ├── MapContainerInner.jsx # imports from react-leaflet
│   │   ├── MerchantsLayer.jsx
│   │   ├── CouriersLayer.jsx
│   │   ├── OrdersLayer.jsx
│   │   ├── markers.jsx           # DivIcon factories
│   │   └── useFlyTo.js
│   ├── dashboard/
│   │   ├── UnassignedStrip.jsx
│   │   ├── OrderCard.jsx
│   │   ├── CouriersRail.jsx
│   │   ├── CourierRow.jsx
│   │   └── StatusPopup.jsx
│   ├── orders/
│   │   ├── CreateOrderDialog.jsx
│   │   └── orderSchema.js
│   ├── merchants/
│   │   ├── MerchantsTable.jsx
│   │   ├── MerchantDialog.jsx
│   │   ├── MerchantMiniMap.jsx
│   │   └── merchantSchema.js
│   └── ui/
│       ├── Button.jsx
│       ├── Dialog.jsx
│       ├── Input.jsx
│       ├── Select.jsx
│       ├── Badge.jsx
│       └── Toaster.jsx
│
├── lib/
│   ├── api.js                    # apiFetch + ApiError
│   ├── queryKeys.js
│   ├── queries/
│   │   ├── merchants.js
│   │   ├── couriers.js
│   │   └── orders.js
│   └── geo.js                    # haversine + sortCouriersByDistance
│
└── tests/
    └── lib/
        └── geo.test.js           # haversine + sorting
```

(Plus backend addition: `backend/scripts/seed.js` — see § 13.)

---

## 12. Tests

Light. Frontend test coverage in v1 focuses on what would actually break:

- **`lib/geo.js`** unit tests (vitest + node environment): haversine accuracy, sort ordering, stable sort for ties.
- **No component tests in v1** — components churn while UI is being polished and snapshot tests cost more than they catch.
- **No e2e in v1** — Playwright comes in a later sub-project once the UI stabilizes.
- The backend's existing 95-test integration suite covers every API path the dashboard depends on.

---

## 13. Dev Tooling

### Seed script

`backend/scripts/seed.js` — wipes (in the same FK-safe order as the test helper) and inserts:

- **4 merchants** in Istanbul (Kadıköy, Beşiktaş, Şişli, Üsküdar) with realistic addresses and coordinates.
- **5 couriers** with Turkish first names, varied vehicle types (bike / motorcycle / car). All explicitly inserted with `status='idle'` (overriding the schema default of `offline`) so the dashboard rail is immediately useful after seeding.

Idempotent on re-run (DELETE before INSERT). Uses the same `pg` pool as the rest of the backend; honors `DATABASE_URL`.

Invocation:

```powershell
cd backend
node scripts/seed.js
```

### Dev workflow

Two terminals. The repo-root `README.md` gains a "Running locally" section explaining:

```
# Terminal 1
cd backend && npm run dev      # Express on http://localhost:3000

# Terminal 2
cd frontend && npm run dev     # Next.js on http://localhost:3001
```

### Frontend dependencies to add

```
leaflet
react-leaflet
@tanstack/react-query
react-hook-form
@hookform/resolvers
zod
```

No backend dependency additions.

---

## 14. Tech Stack Summary

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, JS) |
| Styling | Tailwind 4 |
| Map | react-leaflet 5 + leaflet 1.9, OSM raster tiles |
| Server state | TanStack Query 5 |
| Client state | Plain `useState` (page-level), no Zustand in v1 |
| Forms | react-hook-form + @hookform/resolvers + zod |
| Toasts | Custom 50-line `<Toaster>` (no lib) |
| Tests | vitest for `lib/geo.js` only |
| Backend access | Next.js `rewrites` proxy in `next.config.mjs` (already in place) |

---

## 15. Acceptance Criteria

The sub-project is **done** when all of these are true:

1. Running `node backend/scripts/seed.js` then `npm run dev` in both packages results in a working dashboard with 4 merchants and 5 couriers visible on the map.
2. Creating a new order via "+ New order" + click-to-set-pin produces a new pending pin on the map and a new card in the bottom strip.
3. Clicking the order card flies the map to it, halos the pin, and re-sorts the couriers rail by distance to the order (idle first, others dimmed below).
4. Clicking a courier row PATCHes the order, removes it from the unassigned strip, and the order pin's color shifts from "pending" to "assigned".
5. Clicking the assigned order's pin opens a popover; "Picked up" advances the order through its states. "Delivered" stamps `delivered_at` on the backend (already implemented; we just observe the pin color change).
6. `/merchants` shows the table; "+ New merchant" creates one with a mini-map click. Edit and delete work. Deleting a merchant that has orders shows a clear toast error.
7. `vitest run` passes the haversine + sorting tests.

---

## 16. Risks / Known Concerns

- **No couriers CRUD page** (deliberate scope cut). Mitigated by `seed.js` + direct API. We add a couriers page if this turns out to be friction.
- **Leaflet + Next.js SSR**: `react-leaflet` will crash on the server. Mitigated by `dynamic({ ssr: false })` wrapper — must be applied consistently or builds break.
- **No optimistic updates**: assignment / status changes wait for the backend round-trip + refetch. On Supabase pooler this is ~200-500ms, which might feel sluggish. If it does, add optimistic mutations as a small follow-up (not a refactor).
- **OSM tile rate limits**: the public OSM tile servers ask you not to hammer them. For a local dev / portfolio demo, we're fine. If we ever embed publicly, swap to a free static-tile CDN (e.g. CartoDB) or self-host.
- **Schema duplication** between `backend/src/schemas/*.schema.js` and `components/*/${resource}Schema.js`. Acceptable for v1; if it ever drifts, we extract to a shared package later.

---

## Next Step

Once this design is approved, hand it to `superpowers:writing-plans` to produce the executable, step-by-step implementation plan.
