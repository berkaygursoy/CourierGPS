import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useCouriers() {
  return useQuery({
    queryKey: qk.couriers.all(),
    queryFn: () => apiFetch('/couriers'),
  });
}
