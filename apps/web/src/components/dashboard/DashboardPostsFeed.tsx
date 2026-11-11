import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  HiOutlineChatAlt2,
  HiOutlineExternalLink,
  HiOutlineShare,
  HiOutlineSpeakerphone
} from 'react-icons/hi'
import { useAuthStore } from '@/stores/auth'
import Dialog from '@/components/ui/Dialog'
import { getBaseUrl, resolveLogoUrl } from '@/components/shared/LogoUploader'
import {
  Badge,
  Button,
  DialogBody,
  DialogFooter,
  DialogHeading,
  EmptyState,
  ListSkeleton,
  Notice,
  Panel,
  PanelHeader
} from '@/components/base'
import { POSTS_PATH } from '@/constants/route.constant'
import type { PostItem } from '@/@types/organization'

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'announcement', label: 'Pengumuman Resmi', badgeTone: 'warning' as const },
  { value: 'news', label: 'Berita Internal', badgeTone: 'accent' as const },
  { value: 'operational', label: 'Operasional & Shift', badgeTone: 'success' as const }
]

function getCategoryMeta(category: string) {
  const match = CATEGORY_OPTIONS.find((c) => c.value === category)
  return match || { value: category, label: 'Umum', badgeTone: 'neutral' as const }
}

function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'Baru saja'
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(date.getTime())) return 'Baru saja'

  const now = new Date()
  const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSec < 60) return 'Baru saja'
  const diffInMin = Math.floor(diffInSec / 60)
  if (diffInMin < 60) return `${diffInMin} mnt lalu`
  const diffInHours = Math.floor(diffInMin / 60)
  if (diffInHours < 24) return `${diffInHours} jam lalu`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays === 1) return 'Kemarin'
  if (diffInDays < 7) return `${diffInDays} hari lalu`

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

function getInitials(name?: string | null): string {
  if (!name) return 'SR'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function DashboardPostsFeed() {
  const { user, token } = useAuthStore()
  const [posts, setPosts] = React.useState<PostItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [activeCategory, setActiveCategory] = React.useState('all')
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null)
  const [copiedPostId, setCopiedPostId] = React.useState<string | null>(null)

  const loadPosts = React.useCallback(async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const endpoint = `${getBaseUrl()}/api/posts`
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch(endpoint, { headers })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal memuat feed kabar perusahaan.')
      }

      setPosts(Array.isArray(json.data) ? json.data : [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi ke gateway terganggu.'
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  React.useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleToggleLike = async (postId: string) => {
    if (!token) return

    setPosts((prev) =>
      prev.map((item) => {
        if (item.id === postId) {
          const wasLiked = !!item.isLiked
          return {
            ...item,
            isLiked: !wasLiked,
            likesCount: wasLiked ? Math.max(0, item.likesCount - 1) : item.likesCount + 1
          }
        }
        return item
      })
    )

    try {
      const endpoint = `${getBaseUrl()}/api/posts/${postId}/like`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        await loadPosts()
      }
    } catch {
      await loadPosts()
    }
  }

  const handleCopyShare = (postId: string) => {
    const fullUrl = `${window.location.origin}${POSTS_PATH}#post-${postId}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedPostId(postId)
    window.setTimeout(() => setCopiedPostId(null), 2500)
  }

  const filteredPosts = React.useMemo(() => {
    if (activeCategory === 'all') return posts
    return posts.filter((p) => p.category === activeCategory)
  }, [posts, activeCategory])

  // Menampilkan maksimal 4 postingan utama di dasbor agar halaman tetap ringkas dan cepat
  const displayPosts = React.useMemo(() => {
    return filteredPosts.slice(0, 4)
  }, [filteredPosts])

  return (
    <Panel>
      <PanelHeader
        title="Kabar & Pengumuman"
        description="Publikasi edaran resmi dan linimasa komunikasi internal organisasi."
        meta={isLoading ? undefined : `${posts.length} kiriman`}
        actions={
          <div className="flex items-center gap-2">
            <Link to={POSTS_PATH}>
              <Button size="sm" tone="primary" icon={<HiOutlineSpeakerphone className="h-4 w-4" />}>
                Tulis Postingan
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-3.5 sm:p-5 space-y-4">
        {/* Filter Kategori Singkat */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-3">
          {CATEGORY_OPTIONS.map((opt) => {
            const isActive = activeCategory === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setActiveCategory(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-ink text-surface'
                    : 'bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>

        {errorMsg ? (
          <Notice tone="danger" title="Gagal memuat postingan" onDismiss={() => setErrorMsg(null)}>
            {errorMsg}
          </Notice>
        ) : null}

        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : displayPosts.length === 0 ? (
          <EmptyState
            title="Belum ada kabar atau pengumuman"
            description="Jadilah yang pertama membagikan pengumuman atau informasi operasional untuk tim perusahaan."
            action={
              <Link to={POSTS_PATH}>
                <Button tone="primary" icon={<HiOutlineSpeakerphone className="h-4 w-4" />}>
                  Mulai Tulis Postingan
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3.5">
            {displayPosts.map((post) => {
              const catMeta = getCategoryMeta(post.category)
              const commentCount = post.commentsCount || (post.comments ? post.comments.length : 0)

              return (
                <article
                  key={post.id}
                  className="group rounded-xl border border-line bg-surface hover:border-line-strong transition-all overflow-hidden"
                >
                  {/* Banner Disematkan / Prioritas */}
                  {post.isPinned ? (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-3.5 py-1.5 flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-amber-600 dark:text-amber-400">★</span>
                        <span>Pengumuman Prioritas · Disematkan Manajemen</span>
                      </div>
                      <span className="text-[11px] font-normal opacity-75">Wajib Dibaca</span>
                    </div>
                  ) : null}

                  <div className="p-3.5 sm:p-4 space-y-3">
                    {/* Header Penulis */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Avatar */}
                        <div className="h-9 w-9 shrink-0 rounded-full bg-surface-2 border border-line flex items-center justify-center font-bold text-ink text-xs overflow-hidden">
                          {post.author?.avatarUrl ? (
                            <img
                              src={resolveLogoUrl(post.author.avatarUrl)}
                              alt={post.author.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{getInitials(post.author?.name)}</span>
                          )}
                        </div>

                        {/* Nama & Penanda Waktu */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-[13px] text-ink truncate">
                              {post.author?.name || 'Karyawan'}
                            </span>
                            {(post.author?.role === 'admin' ||
                              post.author?.position?.toLowerCase().includes('hr')) ? (
                              <span
                                className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-blue-600 text-surface text-[9px] font-bold"
                                title="Terverifikasi Manajemen"
                              >
                                ✓
                              </span>
                            ) : null}
                            <span className="text-xs text-ink-3">·</span>
                            <span className="text-xs text-ink-3 font-normal">
                              {formatRelativeTime(post.createdAt)}
                            </span>
                          </div>

                          <div className="text-[11px] text-ink-3 truncate">
                            {post.author?.position || 'Staf'}
                            {post.author?.department?.name ? ` · ${post.author.department.name}` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Badge Kategori */}
                      <Badge tone={catMeta.badgeTone}>
                        {catMeta.label}
                      </Badge>
                    </div>

                    {/* Konten Postingan */}
                    <div className="space-y-1.5">
                      {post.title ? (
                        <h4 className="text-sm sm:text-base font-bold text-ink tracking-tight leading-snug">
                          {post.title}
                        </h4>
                      ) : null}
                      <p className="text-[13px] sm:text-sm text-ink-2 whitespace-pre-wrap leading-relaxed line-clamp-4">
                        {post.content}
                      </p>
                    </div>

                    {/* Lampiran Gambar (Bila ada) */}
                    {post.mediaUrls && post.mediaUrls.length > 0 ? (
                      <div
                        className={`grid gap-2 pt-1 ${
                          post.mediaUrls.length === 1
                            ? 'grid-cols-1'
                            : post.mediaUrls.length === 2
                              ? 'grid-cols-2'
                              : 'grid-cols-3'
                        }`}
                      >
                        {post.mediaUrls.slice(0, 3).map((url, idx) => {
                          const resolved = resolveLogoUrl(url)
                          return (
                            <div
                              key={idx}
                              onClick={() => setPreviewImageUrl(resolved)}
                              className="relative aspect-video overflow-hidden rounded-lg bg-surface-2 border border-line cursor-zoom-in group/img"
                            >
                              <img
                                src={resolved}
                                alt={`Lampiran ${idx + 1}`}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover/img:scale-105"
                              />
                            </div>
                          )
                        })}
                      </div>
                    ) : null}

                    {/* Bar Interaksi Sosial: Suka, Komentar, Bagikan, Buka Detail */}
                    <div className="flex items-center justify-between border-t border-line/60 pt-2.5 text-xs text-ink-3">
                      <div className="flex items-center gap-3 sm:gap-5">
                        {/* Tombol Suka / Like */}
                        <button
                          type="button"
                          onClick={() => handleToggleLike(post.id)}
                          className={`inline-flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                            post.isLiked
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : 'text-ink-2 hover:text-rose-500'
                          }`}
                          title="Suka postingan"
                        >
                          <span className="text-sm">{post.isLiked ? '♥' : '♡'}</span>
                          <span className="tabular">{post.likesCount || 0}</span>
                        </button>

                        {/* Indikator Komentar */}
                        <Link
                          to={POSTS_PATH}
                          hash={`post-${post.id}`}
                          className="inline-flex items-center gap-1 text-ink-2 hover:text-primary transition-colors cursor-pointer"
                          title="Lihat komentar di linimasa"
                        >
                          <HiOutlineChatAlt2 className="h-4 w-4" />
                          <span className="tabular">{commentCount}</span>
                        </Link>

                        {/* Tombol Bagikan / Salin Tautan */}
                        <button
                          type="button"
                          onClick={() => handleCopyShare(post.id)}
                          className="inline-flex items-center gap-1 text-ink-2 hover:text-primary transition-colors cursor-pointer"
                          title="Salin tautan postingan"
                        >
                          <HiOutlineShare className="h-3.5 w-3.5" />
                          <span className="hidden xs:inline">
                            {copiedPostId === post.id ? '✓ Tersalin' : 'Bagikan'}
                          </span>
                        </button>
                      </div>

                      {/* Tautan ke Halaman Utama Postingan */}
                      <Link
                        to={POSTS_PATH}
                        hash={`post-${post.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Buka di linimasa
                        <HiOutlineExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Footer Panel: Navigasi Lengkap ke Linimasa */}
        {posts.length > 0 ? (
          <div className="flex items-center justify-between border-t border-line pt-3 text-xs">
            <span className="text-ink-3">
              Menampilkan {displayPosts.length} dari {filteredPosts.length} kabar internal
            </span>
            <Link
              to={POSTS_PATH}
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              Lihat seluruh kabar & diskusikan →
            </Link>
          </div>
        ) : null}
      </div>

      {/* Modal Dialog Zoom Gambar Terlampir */}
      <Dialog
        isOpen={!!previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
        width={760}
      >
        <DialogHeading title="Pratinjau Foto Lampiran" />
        <DialogBody>
          {previewImageUrl ? (
            <div className="max-h-[75vh] flex items-center justify-center overflow-auto rounded-lg bg-surface-2 p-1">
              <img
                src={previewImageUrl}
                alt="Foto ukuran penuh"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button tone="neutral" onClick={() => setPreviewImageUrl(null)}>
            Tutup Pratinjau
          </Button>
        </DialogFooter>
      </Dialog>
    </Panel>
  )
}

