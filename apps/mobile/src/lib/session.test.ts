import { describe, expect, test } from 'bun:test'
import { QueryClient } from '@tanstack/react-query'
import { CURRENT_USER_KEY, clearSession } from './session'

describe('clearSession', () => {
  test('removes every query but the current user', () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData([CURRENT_USER_KEY], { id: 'a' })
    queryClient.setQueryData(['tasks', 'list', {}], { items: [] })
    queryClient.setQueryData(['notifications', 'inbox'], { pages: [] })

    clearSession(queryClient)

    const remaining = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey[0])
    expect(remaining).toEqual([CURRENT_USER_KEY])
    expect(queryClient.getQueryData<{ id: string }>([CURRENT_USER_KEY])).toEqual({ id: 'a' })
  })

  test('an empty cache is left empty', () => {
    const queryClient = new QueryClient()
    clearSession(queryClient)
    expect(queryClient.getQueryCache().getAll()).toEqual([])
  })
})
