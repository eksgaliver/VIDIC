import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'srikaya_theme'

function prefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light'
  return mode
}

function applyToDocument(mode: ThemeMode): ResolvedTheme {
  const resolved = resolve(mode)
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }
  return resolved
}

interface ThemeState {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const mode = readStoredMode()
  const resolved = applyToDocument(mode)

  // Ikuti perubahan sistem hanya saat pengguna tidak memilih tema manual
  if (typeof window !== 'undefined' && window.matchMedia) {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (get().mode === 'system') {
          set({ resolved: applyToDocument('system') })
        }
      })
  }

  return {
    mode,
    resolved,
    setMode: (next) => {
      window.localStorage.setItem(STORAGE_KEY, next)
      set({ mode: next, resolved: applyToDocument(next) })
    },
    toggle: () => {
      get().setMode(get().resolved === 'dark' ? 'light' : 'dark')
    }
  }
})
