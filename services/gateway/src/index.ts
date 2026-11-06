import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { authService } from 'auth-service'

// Inisialisasi API Gateway terpusat
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
    timestamp: new Date().toISOString()
  }))
  // Hubungkan rute autentikasi ke dalam gateway
  .use(authService)

if (import.meta.main) {
  const port = process.env.PORT || 3000
  gateway.listen(port)
  console.log(`API Gateway aktif pada http://localhost:${port}/api`)
}

export type GatewayApp = typeof gateway

