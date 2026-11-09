import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: ['./src/db/schema.ts', '../shifting/src/db/schema.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/srikaya_auth'
  },
  strict: true,
  verbose: true
})

