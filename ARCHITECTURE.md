# Arsitektur Proyek: Bun (Backend) + Node.js (Client) + React shadcn/ui

Dokumen ini memuat cetak biru teknis dan arsitektur integrasi sistem dengan pemisahan runtime:
- **Backend Runtime**: Bun (ElysiaJS, Drizzle ORM, native cryptographic hashing, high-throughput HTTP).
- **Client Runtime**: Node.js v24+ / npm (Vite, React 19, TanStack Router, Tailwind CSS, shadcn/ui).

---

## 1. Topologi Repositori & Pemisahan Runtime

Struktur repositori memisahkan runtime backend dan client secara independen:

```text
d:/srikaya/
├── apps/
│   └── web/                     # Client Runtime: Node.js (npm / pnpm)
│       ├── src/
│       │   ├── components/ui/   # Komponen primitif shadcn (Button, Card, Input)
│       │   ├── lib/
│       │   │   ├── api.ts       # Klien Eden Treaty terikat ke type GatewayApp
│       │   │   └── utils.ts     # Utilitas styling (cn)
│       │   ├── routes/          # TanStack Router (login, dashboard, root)
│       │   ├── stores/          # Zustand auth & UI state
│       │   ├── router.ts        # Konfigurasi router pohon rute
│       │   └── main.tsx
│       ├── package.json         # Dependensi Node.js client terisolasi
│       ├── tailwind.config.js
│       ├── tsconfig.json        # Path mapping ke kontrak tipe backend
│       └── vite.config.ts
│
├── services/                    # Backend Runtime: Bun
│   ├── gateway/                 # ElysiaJS API Gateway (Port 3000)
│   │   ├── src/index.ts         # Inisialisasi Gateway & export type GatewayApp
│   │   └── package.json
│   │
│   └── auth/                    # Layanan Autentikasi (Port 3001)
│       ├── src/
│       │   ├── db/              # Drizzle ORM & skema PostgreSQL
│       │   └── index.ts         # Sub-app Elysia auth
│       └── package.json
│
├── packages/
│   └── shared-types/            # Skema validasi bersama (Zod) & types
│       └── src/index.ts
│
├── AGENTS.md                    # Aturan global workspace
├── GEMINI.md                    # Aturan mirror Gemini
├── MICROSERVICES.md             # Cetak biru klaster microservices
└── package.json                 # Skrip pengendali Bun & Node.js
```

---

## 2. Jembatan Komunikasi: Eden Treaty (Type-Safe RPC)

Meskipun client berjalan di runtime Node.js dan backend di Bun, kontrak tipe data tetap tersinkronisasi 100%:

- **Pada Backend (`services/gateway/src/index.ts`)**:
  ```typescript
  import { Elysia } from 'elysia'
  import { authService } from 'auth-service'

  export const gateway = new Elysia({ prefix: '/api' })
    .use(authService)

  export type GatewayApp = typeof gateway
  ```

- **Pada Client (`apps/web/tsconfig.json`)**:
  Path alias TypeScript memetakan tipe `GatewayApp` langsung dari berkas gateway tanpa memerlukan ketergantungan paket monorepo khusus:
  ```json
  {
    "compilerOptions": {
      "paths": {
        "@/*": ["src/*"],
        "gateway": ["../../services/gateway/src/index.ts"],
        "shared-types": ["../../packages/shared-types/src/index.ts"]
      }
    }
  }
  ```

- **Pada Client (`apps/web/src/lib/api.ts`)**:
  ```typescript
  import { treaty } from '@elysiajs/eden'
  import type { GatewayApp } from 'gateway'

  const client = treaty<GatewayApp>('http://localhost:3000')
  export const api = client.api
  ```

---

## 3. Skrip Menjalankan Proyek

Root `package.json` memisahkan perintah berdasarkan runtime masing-masing:

```json
{
  "scripts": {
    "backend:gateway": "bun run --cwd services/gateway src/index.ts",
    "backend:auth": "bun run --cwd services/auth src/index.ts",
    "client:install": "npm --prefix apps/web install",
    "client:dev": "npm --prefix apps/web run dev",
    "client:build": "npm --prefix apps/web run build"
  }
}
```
