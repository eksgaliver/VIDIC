import { create } from 'zustand'
import type { UserDTO } from 'shared-types'

interface AuthState {
  token: string | null
  user: UserDTO | null
  isAuthenticated: boolean
  setAuth: (token: string, user: UserDTO) => void
  updateUser: (user: UserDTO) => void
  logout: () => void
}

const STORAGE_KEY = 'srikaya_auth_session'
const LAST_EMAIL_KEY = 'srikaya_last_email'

export function getLastLoginEmail(): string {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

// Membaca sesi awal dari localStorage
function getInitialState(): { token: string | null; user: UserDTO | null } {
  if (typeof window === 'undefined') return { token: null, user: null }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { token: null, user: null }
    const parsed = JSON.parse(raw)
    return { token: parsed.token || null, user: parsed.user || null }
  } catch {
    return { token: null, user: null }
  }
}

const initial = getInitialState()

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initial.token,
  user: initial.user,
  isAuthenticated: !!initial.token,
  setAuth: (token: string, user: UserDTO) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }))
      localStorage.setItem(LAST_EMAIL_KEY, user.email)
    } catch {
      // Ignored
    }
    set({ token, user, isAuthenticated: true })
  },
  updateUser: (user: UserDTO) => {
    const token = get().token
    if (!token) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }))
      localStorage.setItem(LAST_EMAIL_KEY, user.email)
    } catch {
      // Ignored
    }
    set({ user })
  },
  logout: () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignored
    }
    set({ token: null, user: null, isAuthenticated: false })
  }
}))

