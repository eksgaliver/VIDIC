import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { authService } from 'auth-service'

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001'

// API Gateway berjalan pada Port 3000
export const gateway = new Elysia({ prefix: '/api' })
  .use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  )
  .get('/health', () => ({
    status: 'online',
    gatewayPort: Number(process.env.GATEWAY_PORT || process.env.PORT || 3000),
    services: {
      auth: AUTH_SERVICE_URL
    },
    timestamp: new Date().toISOString()
  }))
  // Hubungkan AuthService ke dalam Gateway untuk type-safety Eden Treaty & routing terpadu
  .use(authService)

if (import.meta.main) {
  const port = Number(process.env.GATEWAY_PORT || process.env.PORT || 3000)
  gateway.listen(port)
  console.log(`API Gateway aktif pada http://localhost:${port}/api (Port terpisah dari Auth :${process.env.AUTH_SERVICE_PORT || 3001})`)
}

export type GatewayApp = typeof gateway
