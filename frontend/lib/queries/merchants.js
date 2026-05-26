import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useMerchants() {
  return useQuery({
    queryKey: qk.merchants.all(),
    queryFn: () => apiFetch('/merchants'),
  });
}
