---
name: nextjs-intelligent
description: Modern Next.js 14/15 App Router architecture, Server Components, Server Actions, streaming, and performance optimization. Use when building, refactoring, or optimizing Next.js web applications.
---

# Next.js Intelligent

High-performance standards and architectural patterns for modern Next.js (App Router).

## 1. Component Boundaries: Server vs Client

- **Server Components by Default**:
  Keep data-fetching, database access, sensitive credentials, and heavy rendering on the server.
- **Client Components Leaf-Only**:
  Only add `'use client'` when components need:
  - Event listeners (`onClick`, `onChange`).
  - React state or effects (`useState`, `useEffect`, `useRef`).
  - Browser APIs (`localStorage`, `window`, `navigator`).
  - Custom client hooks.
- **Passing Server Content to Client**:
  Pass Server Components as `children` or props into Client Components rather than importing them directly inside client files, preserving server execution.

## 2. Data Fetching & Caching

- Use `fetch` with granular cache tags:
  ```typescript
  const res = await fetch('https://api.example.com/items', {
    next: { tags: ['items'], revalidate: 3600 }
  })
  ```
- Use `revalidateTag('items')` or `revalidatePath('/dashboard')` inside Server Actions for instant, surgical cache updates.
- In Next.js 15: `fetch` requests, `GET` route handlers, and client navigations are no longer cached by default. Be explicit about caching requirements (`cache: 'force-cache'`).

## 3. Server Actions & Mutations

- Colocate Server Actions or place them in `actions.ts` with `'use server'`:
  ```typescript
  'use server'

  import { z } from 'zod'
  import { revalidateTag } from 'next/cache'

  const schema = z.object({ title: z.string().min(1) })

  export async function createItem(prevState: any, formData: FormData) {
    const parsed = schema.safeParse({ title: formData.get('title') })
    if (!parsed.success) {
      return { error: 'Invalid input' }
    }
    // Database operation...
    revalidateTag('items')
    return { success: true }
  }
  ```
- Pair with React's `useActionState` and `useFormStatus` on the client for loading states and error handling without external form libraries.

## 4. Streaming & Progressive UI

- Structure pages with granular `<Suspense fallback={<Skeleton />}>` around slow async components.
- Avoid letting slow third-party API calls block the initial page render.
- Use `loading.tsx` only for route-level fallback; use inline `<Suspense>` for component-level streaming.

## 5. Security & Invariants

- Never export secrets or sensitive environment variables with `NEXT_PUBLIC_` prefix.
- Enforce session and authorization checks inside every Server Action; never assume an action is private just because its calling UI is hidden.
- Validate incoming params and searchParams properly (in Next.js 15, `params` and `searchParams` are Promises: `const { id } = await params`).

