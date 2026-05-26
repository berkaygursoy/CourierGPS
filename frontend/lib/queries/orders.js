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
