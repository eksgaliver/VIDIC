import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { authApp } from 'auth-service'
import { shiftingApp } from 'shifting-service'
import { storageApp } from 'storage-service'
import { resolve } from 'node:path'

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001'
const SHIFTING_SERVICE_URL = process.env.SHIFTING_SERVICE_URL || 'http://localhost:3003'
const STORAGE_SERVICE_URL = process.env.STORAGE_SERVICE_URL || 'http://localhost:3002'
const STORAGE_DIR = resolve(import.meta.dir, '../../../storage')

// API Gateway berjalan pada Port 3000
export const gateway = new Elysia()
  .use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  )
  .get('/storage/*', async ({ params, set }) => {
    const filePath = resolve(STORAGE_DIR, params['*'])
    const file = Bun.file(filePath)
    if (await file.exists()) {
      set.headers['Content-Type'] = file.type || 'image/webp'
      set.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
      return file
    }

    // Arahkan ke URL S3 publik jika tidak ada di disk lokal
    const s3Base = (
      process.env.AWS_URL ||
      `${(process.env.AWS_ENDPOINT || 'https://s3.nevaobjects.id').replace(/\/+$/, '')}/${process.env.AWS_BUCKET || 'temankerja'}`
    ).replace(/\/+$/, '')
    const targetUrl = `${s3Base}/${params['*']}`
    return Response.redirect(targetUrl, 302)
  })
  .group('/api', (app) =>
    app
      .get('/health', () => ({
        status: 'online',
        gatewayPort: Number(process.env.GATEWAY_PORT || process.env.PORT || 3000),
        services: {
          auth: AUTH_SERVICE_URL,
          shifting: SHIFTING_SERVICE_URL,
          storage: STORAGE_SERVICE_URL
        },
        timestamp: new Date().toISOString()
      }))
      .use(authApp)
      .use(shiftingApp)
      .use(storageApp)
  )

if (import.meta.main) {
  const port = Number(process.env.GATEWAY_PORT || process.env.PORT || 3000)
  gateway.listen(port)
  console.log(`API Gateway aktif pada http://localhost:${port}/api (Port terpisah dari Auth :${process.env.AUTH_SERVICE_PORT || 3001})`)
}

export type GatewayApp = typeof gateway
