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

