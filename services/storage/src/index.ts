import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { storageRoutes } from './routes/storage'

export * from './services/StorageService'
export * from './routes/storage'

export const storageApp = new Elysia()
  .use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    })
  )
  .use(storageRoutes)

if (import.meta.main) {
  const port = Number(process.env.STORAGE_SERVICE_PORT || process.env.PORT || 3002)
  storageApp.listen(port)
  console.log(`Layanan Storage Service berjalan aktif pada port ${port}`)
}

export type StorageApp = typeof storageApp

