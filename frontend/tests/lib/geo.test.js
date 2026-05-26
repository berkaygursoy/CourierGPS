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
