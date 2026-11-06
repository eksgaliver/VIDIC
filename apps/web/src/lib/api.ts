import { treaty } from '@elysiajs/eden'
import type { GatewayApp } from 'gateway'
import { useAuthStore } from '../stores/auth'

// Membaca URL endpoint Gateway dari environment variable
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Di browser: manfaatkan proxy Vite jika URL API menunjuk ke host lokal
    const configured = import.meta.env.VITE_API_URL
    if (configured) {
      try {
        const parsed = new URL(configured)
        return parsed.origin
      } catch {
        return window.location.origin
      }
    }
    return window.location.origin
  }
  return process.env.VITE_API_URL || 'http://localhost:3000'
}

const client = treaty<GatewayApp>(getBaseUrl(), {
  headers: () => {
    const token = useAuthStore.getState().token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
})

export const api = client.api
