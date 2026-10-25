'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import { fetcher } from '@/lib/client-utils'
import type { ChatDetails, ChatListItem, Me, UserSearchResult } from '@/lib/types'

export function useMe(initial?: Me) {
  return useSWR<Me>('/api/me', fetcher, { fallbackData: initial, revalidateOnFocus: true })
}

export function useChats() {
  return useSWR<ChatListItem[]>('/api/chats', fetcher, {
    refreshInterval: 2500,
    revalidateOnFocus: true,
    keepPreviousData: true,
  })
}

export const chatKey = (id: number, limit: number) => `/api/chats/${id}?limit=${limit}`

export function useChat(id: number | null, limit: number) {
  return useSWR<ChatDetails>(id ? chatKey(id, limit) : null, fetcher, {
    refreshInterval: 1500,
    revalidateOnFocus: true,
    keepPreviousData: true,
    dedupingInterval: 500,
  })
}

export function useUsers(q: string, enabled = true) {
  return useSWR<UserSearchResult[]>(enabled ? `/api/users?q=${encodeURIComponent(q.trim())}` : null, fetcher, {
    keepPreviousData: true,
  })
}

export function refreshAll() {
  return globalMutate((key) => typeof key === 'string' && key.startsWith('/api/'))
}

export function refreshChats() {
  return globalMutate('/api/chats')
}

export function refreshChat(id: number) {
  return globalMutate((key) => typeof key === 'string' && key.startsWith(`/api/chats/${id}?`))
}
