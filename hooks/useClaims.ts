'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'

export function useClaims(params?: { claimant?: string; status?: string }) {
  return useQuery({
    queryKey: ['claims', params],
    queryFn: () => api.claims(params),
  })
}

export function useClaim(id: number) {
  return useQuery({
    queryKey: ['claim', id],
    queryFn: () => api.claim(id),
    enabled: !!id,
    refetchInterval: 5000,
  })
}

export function useClaimQueue() {
  return useQuery({
    queryKey: ['claimQueue'],
    queryFn: api.claimQueue,
    refetchInterval: 5000,
  })
}
