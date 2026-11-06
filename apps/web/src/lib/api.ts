import { treaty } from '@elysiajs/eden'
import type { GatewayApp } from 'gateway'
import { useAuthStore } from '../stores/auth'

const client = treaty<GatewayApp>(
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  {
    headers: () => {
      const token = useAuthStore.getState().token
      return token ? { Authorization: `Bearer ${token}` } : {}
    }
  }
)

export const api = client.api
