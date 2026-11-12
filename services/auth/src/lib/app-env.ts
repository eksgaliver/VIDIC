import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * Nama aplikasi tunggal untuk seluruh proyek.
 *
 * Sumbernya `apps/web/.env` (env Vite), bukan `.env` di root, supaya teks yang
 * tampil di antarmuka web dan nama yang dipakai layanan Bun tidak pernah
 * berbeda. Kunci yang dibaca hanya `VITE_APP_NAME`; nilai lain di berkas itu
 * tetap milik klien.
 */
function readWebEnv(): Record<string, string> {
  const envPath = fileURLToPath(new URL('../../../../apps/web/.env', import.meta.url))
  if (!existsSync(envPath)) return {}

  const values: Record<string, string> = {}
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '')

    if (key) values[key] = value
  }

  return values
}

export const webEnv = readWebEnv()

export const appName =
  webEnv.VITE_APP_NAME || process.env.VITE_APP_NAME || process.env.APP_NAME || 'Srikaya Enterprise'