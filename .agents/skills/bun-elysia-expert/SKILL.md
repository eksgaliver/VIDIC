---
name: bun-elysia-expert
description: Architectural standards and best practices for Bun runtime and ElysiaJS backend framework. Use when building, testing, or configuring ElysiaJS APIs, Eden Treaty RPC, and Bun-native features.
---

# Bun & ElysiaJS Architecture Guidelines

Panduan arsitektur backend berkinerja tinggi menggunakan Bun runtime dan ElysiaJS.

## 1. Prinsip Utama Bun & ElysiaJS

- **Native Bun Performance**:
  - Manfaatkan Bun native APIs (`Bun.serve`, `Bun.file`, `Bun.password`, `Bun.sql` / PostgreSQL).
  - Gunakan `bun test` untuk unit testing cepat tanpa konfigurasi Jest/Vitest tambahan.
- **Type-Safe RPC dengan Eden Treaty**:
  - Selalu export tipe utama aplikasi: `export type App = typeof app;`
  - Konsumsi di client menggunakan `@elysiajs/eden` (`edenTreaty<App>`) untuk komunikasi type-safe tanpa perlu code-generation GraphQL/OpenAPI terpisah.
- **Validasi Skema Terintegrasi (TypeBox / Zod)**:
  - Gunakan `t` dari `elysia` (TypeBox) untuk performa kompilasi tercepat.
  - Atau gunakan Zod bila ingin satu skema terbagi (shared validation) antara server dan client form.

## 2. Struktur Modul & Routing

- Pisahkan rute per domain menggunakan modul plugin:
  ```typescript
  import { Elysia, t } from 'elysia'

  export const usersPlugin = new Elysia({ prefix: '/users' })
    .get('/', () => {
      return [{ id: '1', name: 'John Doe' }]
    })
    .post('/', ({ body }) => {
      return { success: true, data: body }
    }, {
      body: t.Object({
        name: t.String({ minLength: 2 }),
        email: t.String({ format: 'email' })
      })
    })
  ```
- Gabungkan pada `src/index.ts`:
  ```typescript
  import { Elysia } from 'elysia'
  import { cors } from '@elysiajs/cors'
  import { swagger } from '@elysiajs/swagger'
  import { usersPlugin } from './routes/users'

  const app = new Elysia()
    .use(cors())
    .use(swagger())
    .use(usersPlugin)
    .listen(3001)

  console.log(`Server running at ${app.server?.hostname}:${app.server?.port}`)

  export type App = typeof app
  ```

## 3. Penanganan Error & Keamanan

- Tangani exception menggunakan lifecycle hook `onError`:
  ```typescript
  app.onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400
      return { error: 'Validation Error', details: error.validator }
    }
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Resource Not Found' }
    }
    set.status = 500
    return { error: 'Internal Server Error' }
  })
  ```
- Lindungi CORS, rate-limiting, dan header keamanan sebelum mendaftarkan rute publik.

