---
name: hono-intelligent
description: Expert architectural patterns, type-safe RPC, middleware pipelines, and best practices for Hono.js. Use when developing APIs, microservices, or fullstack web applications with Hono across Node.js, Bun, Cloudflare Workers, or Deno.
---

# Hono Intelligent

Enterprise-grade best practices, type safety, and architectural standards for Hono applications.

## 1. Project Architecture & Routing

- **Modular Route Sub-Apps**:
  Structure endpoints by domain using `new Hono()` and mount them with `app.route('/path', subApp)`:
  ```typescript
  import { Hono } from 'hono'
  import { usersApp } from './routes/users'
  import { authApp } from './routes/auth'

  const app = new Hono()
    .route('/api/users', usersApp)
    .route('/api/auth', authApp)

  export default app
  export type AppType = typeof app
  ```
- **Type-Safe RPC Export**:
  Always export the combined application type (`export type AppType = typeof app`) with chained route definitions to provide end-to-end type safety to client SDKs via `hc<AppType>()`.

## 2. Request Validation with Zod

- Always validate inputs using `@hono/zod-validator` (`zValidator`):
  ```typescript
  import { zValidator } from '@hono/zod-validator'
  import { z } from 'zod'

  const userSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
  })

  usersApp.post('/', zValidator('json', userSchema), async (c) => {
    const validated = c.req.valid('json')
    // validated is fully inferred and typed
    return c.json({ success: true, data: validated }, 201)
  })
  ```
- Handle validation hooks customly when you need structured client error responses:
  ```typescript
  zValidator('json', schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: 'Validation failed', issues: result.error.issues }, 400)
    }
  })
  ```

## 3. Error Handling & HTTP Exceptions

- Use standard `HTTPException` from `hono/http-exception` for consistent status bubbling:
  ```typescript
  import { HTTPException } from 'hono/http-exception'

  if (!user) {
    throw new HTTPException(404, { message: 'User not found' })
  }
  ```
- Register global error boundaries:
  ```typescript
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status)
    }
    console.error('Unhandled server error:', err)
    return c.json({ error: 'Internal Server Error' }, 500)
  })

  app.notFound((c) => {
    return c.json({ error: 'Resource not found' }, 404)
  })
  ```

## 4. Context & Environment Variables

- Declare custom Context types with `new Hono<{ Bindings: Env; Variables: Variables }>()`:
  ```typescript
  type Variables = {
    userId: string
    role: 'admin' | 'user'
  }

  type Bindings = {
    DATABASE_URL: string
    JWT_SECRET: string
  }

  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  ```
- Read env cleanly across all runtimes using `c.env` (for Cloudflare) or `process.env` (for Node/Bun).

## 5. Performance & Middleware Pipeline

- Order middleware deliberately:
  1. `logger()` / `timing()`
  2. `cors()` & security headers (`secureHeaders()`)
  3. Body limits / rate-limiting
  4. Authentication middleware (setting `c.set('userId', ...)`).
  5. Route handlers
- Avoid reading `await c.req.json()` or `await c.req.text()` multiple times; use `c.req.valid()` or store the parsed result.

