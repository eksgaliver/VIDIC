/** Ambil pesan manusiawi dari body error gateway, tanpa probing per halaman. */
export function messageFromError(value: unknown, fallback: string): string {
  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  if (typeof value === 'string' && value.trim()) return value.trim()
  return fallback
}

interface TreatyLike {
  error?: { value?: unknown } | null
}

export function errorText(res: TreatyLike, fallback: string): string {
  return messageFromError(res.error?.value, fallback)
}
