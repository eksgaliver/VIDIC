import { treaty } from '@elysiajs/eden'
import type { GatewayApp } from 'gateway'
import { useAuthStore } from '../stores/auth'

// Membaca URL endpoint Gateway dari environment variable
const getBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_URL
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      return window.location.origin
    }
  }
  return window.location.origin
}

const client = treaty<GatewayApp>(getBaseUrl(), {
  headers: () => {
    const token = useAuthStore.getState().token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
})

export const api = client.api
