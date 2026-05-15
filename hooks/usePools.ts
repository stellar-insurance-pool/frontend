'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

export function usePools() {
  return useQuery({
    queryKey: ['pools'],
    queryFn: api.pools,
  })
}

export function usePool(id: number) {
  return useQuery({
    queryKey: ['pool', id],
    queryFn: () => api.pool(id),
    enabled: !!id,
  })
}

export function usePosition(poolId: number, address: string | null) {
  return useQuery({
    queryKey: ['position', poolId, address],
    queryFn: () => api.position(poolId, address!),
    enabled: !!address,
  })
}
