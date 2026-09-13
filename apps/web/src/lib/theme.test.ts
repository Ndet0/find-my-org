import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
// The DOM must exist before `theme.ts` loads; see test/setup.ts.
import '../../test/setup'
import { act, cleanup, renderHook } from '@testing-library/react'

/**
 * `theme.ts` reads `window.matchMedia` once at import and keeps the result,
 * so the stub below has to be in place before the module loads — hence the
 * `await import()` rather than a static import. Bun shares one module cache
 * across the test process, so this file must stay the only importer of
 * `theme.ts`; a second importer would inherit this stub.
 */
const mql = {
  matches: false,
  media: '(prefers-color-scheme: dark)',
  listeners: [] as Array<() => void>,
  addEventListener(_type: string, listener: () => void) {
    this.listeners.push(listener)
  },
  removeEventListener() {},
}

window.matchMedia = () => mql as unknown as MediaQueryList

const { applyTheme, readTheme, resolveTheme, setTheme, THEME_STORAGE_KEY, THEMES, useTheme } =
  await import('./theme')

const root = document.documentElement

/** Flips the emulated OS preference and fires the media query's change event. */
function osPrefersDark(dark: boolean) {
  mql.matches = dark
  for (const listener of mql.listeners) listener()
}

beforeEach(() => {
  localStorage.clear()
  mql.matches = false
  root.className = ''
  root.style.colorScheme = ''
})

afterEach(cleanup)

test('the key and the union are the ones mobile shares', () => {
  expect(THEME_STORAGE_KEY).toBe('opsflow.theme')
  expect(THEMES).toEqual(['light', 'dark', 'system'])
})

describe('readTheme', () => {
  test('is system when nothing is stored, and ignores a value it does not know', () => {
    expect(readTheme()).toBe('system')
    localStorage.setItem(THEME_STORAGE_KEY, 'blue')
    expect(readTheme()).toBe('system')
  })

  test('returns a stored preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(readTheme()).toBe('dark')
  })
})

describe('resolveTheme', () => {
  test('passes an explicit choice through and resolves system from the OS', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme('system')).toBe('light')
    mql.matches = true
    expect(resolveTheme('system')).toBe('dark')
  })
})

describe('applyTheme', () => {
  test('sets the class and the colour scheme together', () => {
    applyTheme('dark')
    expect(root.classList.contains('dark')).toBe(true)
    expect(root.style.colorScheme).toBe('dark')

    applyTheme('light')
    expect(root.classList.contains('dark')).toBe(false)
    expect(root.style.colorScheme).toBe('light')

    mql.matches = true
    applyTheme('system')
    expect(root.classList.contains('dark')).toBe(true)
    expect(root.style.colorScheme).toBe('dark')
  })
})

describe('setTheme', () => {
  test('stores an explicit choice and applies it', () => {
    setTheme('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(root.classList.contains('dark')).toBe(true)
  })

  test('system stores nothing and follows the OS', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    setTheme('system')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(root.classList.contains('dark')).toBe(false)
  })

  test('a system session follows a live OS switch', () => {
    setTheme('system')
    osPrefersDark(true)
    expect(root.classList.contains('dark')).toBe(true)
    osPrefersDark(false)
    expect(root.classList.contains('dark')).toBe(false)
  })

  test('an explicit choice ignores the OS', () => {
    setTheme('light')
    osPrefersDark(true)
    expect(root.classList.contains('dark')).toBe(false)
  })

  test('with storage disabled the choice still applies for the session', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage disabled')
      },
    })

    try {
      expect(readTheme()).toBe('system')
      expect(() => setTheme('dark')).not.toThrow()
      expect(root.classList.contains('dark')).toBe(true)
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    }
  })
})

describe('useTheme', () => {
  test('reports the stored choice and what it resolves to, and re-renders on change', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('system')
    expect(result.current.resolved).toBe('light')

    act(() => result.current.setTheme('dark'))
    expect(result.current.theme).toBe('dark')
    expect(result.current.resolved).toBe('dark')

    act(() => result.current.setTheme('system'))
    act(() => osPrefersDark(true))
    expect(result.current.theme).toBe('system')
    expect(result.current.resolved).toBe('dark')
  })
})
