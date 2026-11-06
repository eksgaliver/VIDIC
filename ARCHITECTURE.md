# Arsitektur Proyek: Bun + ElysiaJS + React shadcn/ui

Dokumen ini memuat cetak biru teknis dan arsitektur integrasi sistem antara backend Bun + ElysiaJS dengan client React modern.

---

## 1. Topologi Repositori (Monorepo Workspace)

Struktur monorepo menggunakan Bun workspaces untuk memfasilitasi type-sharing secara instan antara server dan client:

```text
d:/srikaya/
├── apps/
│   ├── api/                     # Backend Bun + ElysiaJS
│   │   ├── src/
│   │   │   ├── routes/          # Rute API modular (users, auth, dll.)
│   │   │   ├── db/              # Schema & koneksi database PostgreSQL
│   │   │   ├── middleware/      # Auth, CORS, logger
│   │   │   └── index.ts         # Inisialisasi Elysia & export type App
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                     # Frontend Client (Vite + React 19 + shadcn/ui)
│       ├── src/
│       │   ├── components/
│       │   │   ├── ui/          # Komponen primitif shadcn (Button, Dialog, dll.)
│       │   │   └── common/      # Komponen aplikasi bersama
│       │   ├── lib/
│       │   │   ├── api.ts       # Klien Eden Treaty terikat ke type App
│       │   │   └── utils.ts     # Utilitas styling (cn)
│       │   ├── routes/          # Halaman & TanStack Router
│       │   ├── stores/          # Zustand global UI state
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── package.json
│       ├── tailwind.config.js
│       └── vite.config.ts
│
├── packages/
│   └── shared/                  # Skema validasi bersama (Zod) & types
│       ├── src/
│       │   └── index.ts
│       └── package.json
│
├── .agents/                     # Konfigurasi skill dan rules agent
├── AGENTS.md                    # Aturan global workspace
├── GEMINI.md                    # Aturan mirror Gemini
└── package.json                 # Root monorepo workspace
```

---

## 2. Jembatan Komunikasi: Eden Treaty (Type-Safe RPC)

Salah satu keunggulan utama ElysiaJS adalah kemampuannya menyediakan tipe API langsung ke client tanpa build step terpisah:

- **Pada Backend (`apps/api/src/index.ts`)**:
  ```typescript
  import { Elysia } from 'elysia'
  import { usersPlugin } from './routes/users'

  const app = new Elysia()
    .use(usersPlugin)
    .listen(3001)

  export type App = typeof app
  ```

- **Pada Client (`apps/web/src/lib/api.ts`)**:
  ```typescript
  import { treaty } from '@elysiajs/eden'
  import type { App } from 'api'

  export const api = treaty<App>('localhost:3001')
  ```

- **Penggunaan di Komponen React**:
  ```typescript
  // Autocomplete otomatis, parameter URL otomatis tervalidasi,
  // dan tipe respons sesuai dengan handler Elysia
  const { data, error } = await api.users.get()
  ```

---

## 3. Ekosistem Library React Utama

| Kategori | Library Terpilih | Peran Utama |
|---|---|---|
| UI Component Kit | `shadcn/ui` + `@radix-ui/react-*` | Komponen aksesibel WAI-ARIA, copy-paste architecture |
| Styling Engine | `tailwindcss` + `tailwind-merge` + `cva` | Utility-first styling dan penggabungan class dinamis |
| Ikonografi | `lucide-react` | Koleksi ikon konsisten tanpa bobot bundle besar |
| Routing | `@tanstack/react-router` | Routing berbasis TypeScript dengan full type-safety |
| Server State & Caching | `@tanstack/react-query` | Sinkronisasi data backend, background caching, optimistik update |
| Client State | `zustand` | State UI global minimalis tanpa overhead context provider |
| Formulir & Validasi | `react-hook-form` + `zod` | Pengelolaan form berkinerja tinggi terintegrasi skema validasi |
| Tabel Data Kompleks | `@tanstack/react-table` | Headless table untuk data tabular, filtering, dan sorting |
| Animasi / Interaksi | `motion` | Transisi dan interaksi mikro yang halus |
