/**
 * Stub fixtures for the dispatcher dashboard. Match the shape the backend
 * is planned to return so the page can switch to live data by replacing
 * the import without touching component code.
 *
 * Remove once `useOrders` / `useCouriers` / `useMerchants` return data.
 */

export const STUB_KPIS = {
  pending: 7,
  idle: 4,
  inTransit: 13,
  pendingDelta: 2,
  etaDelta: -1,
  avgRadiusKm: 0.9,
};

export const STUB_MERCHANTS = [
  { id: 'm-12', name: 'Pizza Hub',     lat: 41.0082, lng: 29.0282, x: 34, y: 44 },
];

/**
 * `mapX` / `mapY` are percentages (0-100) used to position pins inside
 * the CSS-faked map. When the real Leaflet map is wired up, swap these
 * out for `lat` / `lng`-driven projections.
 */
export const STUB_COURIERS = [
  { id: 'c-1', name: 'Elif Demir',    vehicle: 'Motorcycle', status: 'idle',       idleFor: '3m',  distanceKm: 0.8, mapX: 54, mapY: 42 },
  { id: 'c-2', name: 'Can Yılmaz',    vehicle: 'Bike',       status: 'idle',       idleFor: '8m',  distanceKm: 1.4, mapX: 70, mapY: 56 },
  { id: 'c-3', name: 'Zeynep Kaya',   vehicle: 'Motorcycle', status: 'idle',       idleFor: '14m', distanceKm: 2.1, mapX: 48, mapY: 28 },
  { id: 'c-4', name: 'Berkay Gürsoy', vehicle: 'Motorcycle', status: 'delivering', etaMin: 6,  activeOrder: '#A09', distanceKm: 3.1, mapX: 22, mapY: 20 },
  { id: 'c-5', name: 'Deniz Acar',    vehicle: 'Motorcycle', status: 'delivering', etaMin: 11, activeOrder: '#A07', distanceKm: 3.4, mapX: 28, mapY: 72 },
  { id: 'c-6', name: 'Mert Soylu',    vehicle: 'Bike',       status: 'delivering', etaMin: 14, activeOrder: '#A05', distanceKm: 4.0, mapX: 84, mapY: 18 },
];

export const STUB_ORDERS = [
  { id: '#A12', customer: 'Ali Yıldız',      address: '5 Demo St · Kadıköy',     distanceKm: 1.2, ageSec: 134, mapX: 62, mapY: 48 },
  { id: '#A11', customer: 'Ayşe Korkmaz',    address: '14 Moda Cd · Kadıköy',    distanceKm: 2.0, ageSec: 182, mapX: 76, mapY: 36 },
  { id: '#A09', customer: 'Mehmet Aslan',    address: '2 Bahariye · Kadıköy',    distanceKm: 1.6, ageSec: 252, mapX: 38, mapY: 62 },
  { id: '#A08', customer: 'Selin Öztürk',    address: '9 Söğütlüçeşme',          distanceKm: 0.9, ageSec: 168, mapX: 58, mapY: 32 },
  { id: '#A07', customer: 'Emre Tan',        address: '22 Caferağa',             distanceKm: 2.4, ageSec: 98,  mapX: 80, mapY: 64 },
  { id: '#A06', customer: 'Burcu Eren',      address: '7 Rıhtım Cd',             distanceKm: 1.1, ageSec: 52,  mapX: 44, mapY: 50 },
  { id: '#A05', customer: 'Kerem Polat',     address: '18 Mühürdar',             distanceKm: 3.0, ageSec: 21,  mapX: 90, mapY: 80 },
];

export const STUB_OPERATOR = {
  name: 'Berkay',
  sector: 'Kadıköy · Sector 04',
  coordsLabel: '41°00′28″N · 29°01′58″E · ZOOM 14',
};

export function formatAge(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}
