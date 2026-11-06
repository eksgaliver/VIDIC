---
name: drizzle-intelligent
description: Expert Drizzle ORM patterns, schema modeling, relational queries, migrations with drizzle-kit, and drizzle-zod validation with PostgreSQL in Bun and ElysiaJS. Use when designing databases, schemas, relations, queries, or database migrations with Drizzle.
---

# Drizzle ORM Intelligent

Standar arsitektur, pemodelan skema, optimasi query, dan integrasi validasi tipe menggunakan Drizzle ORM pada PostgreSQL dan Bun.

## 1. Koneksi Database & Driver pada Runtime Bun

Gunakan driver `postgres` (`postgres.js`) yang sangat kompatibel dan berkinerja tinggi bersama Drizzle ORM di Bun:

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/srikaya'

// Konfigurasi connection pool postgres.js
export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
})

export const db = drizzle(client, { schema })
export type Database = typeof db
```

## 2. Pemodelan Skema PostgreSQL & Hubungan Relasional

Definisikan skema secara terpusat dengan integritas referensial eksplisit dan index:

```typescript
// src/db/schema.ts
import { pgTable, text, timestamp, uuid, varchar, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// 1. Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).default('member').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_users_email').on(table.email)
])

// 2. Posts Table
export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_posts_author_id').on(table.authorId),
  index('idx_posts_created_at').on(table.createdAt)
])

// Relasi untuk Drizzle Relational Queries API
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts)
}))

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id]
  })
}))
```

## 3. Integrasi Validasi Otomatis dengan `drizzle-zod`

Gunakan `drizzle-zod` untuk menghasilkan skema validasi Zod dari skema tabel. Skema ini dapat langsung dipakai pada rute ElysiaJS dan formulir React (`react-hook-form`):

```typescript
// src/db/validation.ts
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { users, posts } from './schema'

// Skema Insert dengan custom validation tambahan
export const insertUserSchema = createInsertSchema(users, {
  email: (schema) => schema.email('Alamat surel tidak valid'),
  name: (schema) => schema.min(2, 'Nama minimal 2 karakter')
}).omit({ id: true, createdAt: true, updatedAt: true })

export const selectUserSchema = createSelectSchema(users)

export type InsertUser = z.infer<typeof insertUserSchema>
export type User = z.infer<typeof selectUserSchema>
```

### Integrasi dengan ElysiaJS Rute:
```typescript
import { Elysia } from 'elysia'
import { db } from '../db'
import { users } from '../db/schema'
import { insertUserSchema } from '../db/validation'

export const usersRoute = new Elysia({ prefix: '/users' })
  .post('/', async ({ body, set }) => {
    const [newUser] = await db.insert(users).values(body).returning()
    set.status = 201
    return { success: true, data: newUser }
  }, {
    body: insertUserSchema // Validasi instan dari skema Drizzle
  })
```

## 4. Pola Query: Relational Queries API vs Core Query Builder

- **Relational Queries API (`db.query`)**:
  Ideal untuk membaca data hierarkis dan join terstruktur tanpa boilerplate SQL manual:
  ```typescript
  // Mengambil user beserta daftar posts-nya dalam satu operasi teroptimasi
  const userWithPosts = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, userId),
    with: {
      posts: {
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
        limit: 10
      }
    }
  })
  ```

- **Core Query Builder (`db.select`)**:
  Ideal untuk agregasi, analitik, partial updates, atau query kompleks:
  ```typescript
  import { count, eq } from 'drizzle-orm'

  const stats = await db
    .select({
      authorId: posts.authorId,
      totalPosts: count(posts.id)
    })
    .from(posts)
    .groupBy(posts.authorId)
  ```

## 5. Transaksi Atomik

Selalu bungkus mutasi terkait ke dalam transaksi database:

```typescript
await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values(userData).returning()
  await tx.insert(posts).values({
    authorId: user.id,
    title: 'First Post',
    content: 'Welcome!'
  })
})
```

## 6. Konfigurasi Drizzle Kit & Migrasi

Buat berkas konfigurasi `drizzle.config.ts`:

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/srikaya'
  },
  strict: true,
  verbose: true
})
```

Perintah Drizzle Kit:
- Generate migrasi SQL: `bunx drizzle-kit generate`
- Terapkan migrasi ke database: `bunx drizzle-kit migrate`
- Sinkronisasi langsung (prototyping): `bunx drizzle-kit push`
- Drizzle Studio (inspeksi GUI): `bunx drizzle-kit studio`
