# Project Guidelines & Rules

## 1. Typography & Formatting Rules (Strict)
- **Do not use emojis** in any typography, UI components, headings, buttons, copy, documentation, or responses.
- **Use Unicode typographic symbols** where appropriate:
  - Navigation / Links: `→`, `←`, `↑`, `↓`
  - Delimiters / Bullets: `•`, `·`, `|`, `—`, `–`
  - Status / Verification: `✓`, `✕`, `○`, `●`, `■`, `□`
  - Sections / Hierarchy: `§`, `¶`, `*`, `†`
  - Math & Logic: `+`, `−`, `×`, `÷`, `±`, `≈`, `≠`, `≤`, `≥`

## 2. Anti-Slop & Design Quality Floors
- Adhere to the **Anti-Slop** filter and **Impeccable** design standards.
- Ground all designs in concrete subject matter. No generic warm-cream/terracotta cliches, SaaS card kits, or generic template chrome.
- Eliminate filler phrases, throat-clearing, binary contrasts, and faux-insights.
- Write direct, human, active voice copy.

## 3. Technology Stack Best Practices
- **Bun & ElysiaJS**: Native Bun performance, modular plugin routing, type-safe RPC via Eden Treaty (`treaty<App>()`), Zod/TypeBox validation, explicit `onError` handling.
- **Drizzle ORM & PostgreSQL**:
  - Drizzle ORM as the primary database layer (replacing Prisma).
  - PostgreSQL with explicit foreign key cascades (`onDelete: 'cascade'`).
  - Indexed foreign keys and compound indexes ordered (equality → range → sort).
  - Schema-to-Zod generation via `drizzle-zod` for zero-overhead validation across backend routes and client forms.
  - Relational queries (`db.query`) for nested reads; core builder (`db.select`) for analytics/aggregations.
  - Zero-downtime migrations managed via `drizzle-kit`.
- **Next.js & React**:
  - Modern React 19 primitives (`useActionState`, `useOptimistic`, `use()`), pure render cycles, clean state derivation without redundant `useEffect`.
  - Client state with Zustand, server state synchronization with TanStack Query.
  - UI components built on shadcn/ui and Radix UI primitives.

## 4. Context & Token Preservation
- Follow the **Memory Saver** and **Token Saver** skills.
- Perform surgical edits via targeted line changes rather than rewrites.
- Fetch current library documentation via Context7 (`npx ctx7@latest docs <libraryId> "<query>"`) when working with external APIs and libraries.

## 5. Service & Route Registry (Wajib Dipatuhi)

Setiap halaman atau endpoint baru WAJIB didaftarkan. Tidak ada pengecualian.

### Frontend — setiap halaman baru wajib masuk ke:
- `apps/web/src/constants/route.constant.ts` — konstanta path
- `apps/web/src/configs/navigation.config.ts` — item navigasi sidebar
- `apps/web/src/router.ts` — route tree TanStack Router

### Backend — setiap route/endpoint baru wajib masuk ke:
- File route terkait di `services/<service>/src/routes/`
- Di-mount via `.use()` di `services/<service>/src/index.ts`
- Didokumentasikan di `UPDATES.md` pada section yang relevan

### Aturan Isolasi Service (Strict):
- **DILARANG** melakukan `fetch()` langsung dari web client ke URL eksternal (domain selain gateway).
- Semua request ke API pihak ketiga WAJIB diproksikan melalui `services/gateway` atau `services/auth`.
- Gunakan `${getBaseUrl()}/api/...` untuk semua request dari frontend.
- Pelanggaran: `fetch('https://external-api.com/...')` di dalam komponen React manapun.

### Daftar Halaman Aktif (diperbarui tiap sesi):
| Path | File | Akses |
|------|------|-------|
| `/` | `dashboard.tsx` | Admin & Member |
| `/attendance` | `attendance.tsx` | Admin & Member |
| `/kpi` | `kpi.tsx` | Admin & Member |
| `/posts` | `posts.tsx` | Admin & Member |
| `/employees` | `employees.tsx` | Admin |
| `/departments` | `departments.tsx` | Admin |
| `/shifts` | `shifts.tsx` | Admin |
| `/companies` | `companies.tsx` | Admin |
| `/sub-users` | `sub-users.tsx` | Admin |
| `/profile` | `profile.tsx` | Admin & Member |

### Daftar Endpoint Aktif (diperbarui tiap sesi):
| Service | Prefix | Deskripsi |
|---------|--------|-----------|
| auth | `/api/auth/*` | Autentikasi, profil, biodata, mail |
| auth | `/api/companies/*` | CRUD perusahaan & lokasi |
| auth | `/api/departments/*` | CRUD departemen |
| auth | `/api/employees/*` | CRUD karyawan |
| auth | `/api/kpi/*` | Periode, item, penilaian, tugas KPI |
| auth | `/api/posts/*` | CRUD postingan internal |
| auth | `/api/subusers/*` | Sub-akun admin |
| auth | `/api/upload/*` | Upload file ke S3 |
| auth | `/api/utilities/*` | Proxy API eksternal (holiday, geocoding) |
| shifting | `/api/attendance/*` | Presensi, shift, laporan |
| storage | `/api/storage/*` | Penyimpanan file lokal |
| gateway | `/api/health` | Health check gateway |

