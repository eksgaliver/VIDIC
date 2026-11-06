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
- **Hono**: Modular route architecture (`app.route()`), type-safe RPC client (`hc<AppType>()`), Zod validation with `@hono/zod-validator`, explicit `HTTPException`.
- **Next.js (App Router)**: Server Components by default, Client Components at leaf nodes with `'use client'`, Server Actions with `'use server'`, granular Suspense boundaries, strict cache invalidation (`revalidateTag`).
- **React**: Modern React 19 primitives (`useActionState`, `useOptimistic`, `use()`), pure render cycles, clean state derivation without redundant `useEffect`.
- **PostgreSQL**: UUIDv7 / Identity keys, explicit foreign key cascades, indexed foreign keys, compound indexes ordered (equality → range → sort), partial indexes, `EXPLAIN (ANALYZE, BUFFERS)` for slow queries.

## 4. Context & Token Preservation
- Follow the **Memory Saver** and **Token Saver** skills.
- Perform surgical edits via targeted line changes rather than rewrites.
- Fetch current library documentation via Context7 (`npx ctx7@latest docs <libraryId> "<query>"`) when working with external APIs and libraries.

