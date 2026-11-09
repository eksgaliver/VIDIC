/// <reference types="vite/client" />

// Client hanya butuh *tipe* dari gateway (path alias `gateway` di tsconfig),
// tetapi TypeScript ikut membaca sumber services/gateway yang memakai global
// khusus Bun. Deklarasi ini membuat typecheck client berjalan tanpa runtime Bun.
interface ImportMeta {
  readonly main?: boolean
}

declare const process: {
  env: Record<string, string | undefined>
}
