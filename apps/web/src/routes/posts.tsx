import * as React from 'react'
import { createRoute } from '@tanstack/react-router'
import {
  HiOutlineChatAlt2,
  HiOutlineCheck,
  HiOutlineEye,
  HiOutlinePaperAirplane,
  HiOutlinePhotograph,
  HiOutlineSearch,
  HiOutlineShare,
  HiOutlineSparkles,
  HiOutlineSpeakerphone,
  HiOutlineTrash,
  HiOutlineUpload,
  HiOutlineX,
} from 'react-icons/hi'
import { authenticatedRoute } from './_authenticated'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import Dialog from '@/components/ui/Dialog'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { getBaseUrl, resolveLogoUrl } from '@/components/shared/LogoUploader'
import {
  Badge,
  Button,
  DialogBody,
  DialogFooter,
  DialogHeading,
  EmptyState,
  Notice,
  PageHeader,
  Panel,
} from '@/components/base'
import { POSTS_PATH } from '@/constants/route.constant'
import type { PostCommentItem, PostItem } from '@/@types/organization'

export const postsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: POSTS_PATH,
  component: PostsPage,
})

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Semua Postingan' },
  { value: 'announcement', label: 'Pengumuman Resmi', badgeTone: 'warning' as const },
  { value: 'news', label: 'Berita Internal', badgeTone: 'accent' as const },
  { value: 'operational', label: 'Operasional & Shift', badgeTone: 'success' as const },
  { value: 'achievement', label: 'Prestasi Tim', badgeTone: 'neutral' as const },
  { value: 'general', label: 'Umum & Diskusi', badgeTone: 'neutral' as const },
]

function getCategoryMeta(category: string) {
  const match = CATEGORY_OPTIONS.find((c) => c.value === category)
  return match || { value: category, label: 'Umum', badgeTone: 'neutral' as const }
}

function formatRelativeTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return 'Baru saja'
  const date = new Date(dateInput)
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
    year: 'numeric',
  })
}

function getInitials(name?: string | null): string {
  if (!name) return 'SR'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function PostsPage() {
  const { user, token } = useAuthStore()

  // State Daftar Postingan & Filter
  const [posts, setPosts] = React.useState<PostItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)
  const [activeCategory, setActiveCategory] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState<string>('')

  // State Composer Postingan Baru
  const [isComposerOpen, setIsComposerOpen] = React.useState(false)
  const [composerTitle, setComposerTitle] = React.useState('')
  const [composerContent, setComposerContent] = React.useState('')
  const [composerCategory, setComposerCategory] = React.useState('announcement')
  const [composerIsPinned, setComposerIsPinned] = React.useState(false)
  const [composerMediaUrls, setComposerMediaUrls] = React.useState<string[]>([])
  const [imageUrlInput, setImageUrlInput] = React.useState('')
  const [isAddingImageUrl, setIsAddingImageUrl] = React.useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // State Komentar & Modal
  const [expandedComments, setExpandedComments] = React.useState<Record<string, boolean>>({})
  const [commentInputs, setCommentInputs] = React.useState<Record<string, string>>({})
  const [submittingCommentId, setSubmittingCommentId] = React.useState<string | null>(null)
  const [deleteTargetPost, setDeleteTargetPost] = React.useState<PostItem | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null)
  const [copiedPostId, setCopiedPostId] = React.useState<string | null>(null)

  // Izin khusus untuk pin pengumuman (admin atau peran HR)
  const canPinPosts = React.useMemo(() => {
    if (!user) return false
    if (user.role === 'admin') return true
    return false
  }, [user])

  // Muat Postingan dari Backend
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
        throw new Error(json.message || 'Gagal memuat feed postingan.')
      }

      setPosts(json.data || [])
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

  // Otomatis bersihkan pesan notifikasi sukses setelah 4 detik
  React.useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  // Handler Unggah Berkas Media
  const handleUploadMedia = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Format berkas tidak didukung. Harap pilih gambar JPG, PNG, atau WEBP.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Ukuran gambar maksimal adalah 10 MB.')
      return
    }

    setIsUploadingMedia(true)
    setErrorMsg(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const endpoint = `${getBaseUrl()}/api/upload/posts`
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal mengunggah foto lampiran.')
      }

      const uploadedUrl = data.url || data.data?.url
      if (uploadedUrl) {
        setComposerMediaUrls((prev) => [...prev, uploadedUrl])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kendala saat memproses unggahan.'
      setErrorMsg(msg)
    } finally {
      setIsUploadingMedia(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Handler Tambah URL Gambar
  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim()
    if (!trimmed) return
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
      setErrorMsg('Tautan gambar harus diawali dengan http:// atau https://')
      return
    }
    setComposerMediaUrls((prev) => [...prev, trimmed])
    setImageUrlInput('')
    setIsAddingImageUrl(false)
  }

  // Handler Hapus Media Terlampir
  const handleRemoveMedia = (index: number) => {
    setComposerMediaUrls((prev) => prev.filter((_, i) => i !== index))
  }

  // Handler Publikasi Postingan
  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!composerContent.trim()) {
      setErrorMsg('Isi konten postingan tidak boleh kosong.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const endpoint = `${getBaseUrl()}/api/posts`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: composerTitle.trim() || undefined,
          content: composerContent.trim(),
          category: composerCategory,
          mediaUrls: composerMediaUrls,
          isPinned: canPinPosts ? composerIsPinned : false,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal mempublikasikan postingan.')
      }

      setSuccessMsg('Postingan berita berhasil dipublikasikan ke linimasa.')
      setComposerTitle('')
      setComposerContent('')
      setComposerCategory('announcement')
      setComposerIsPinned(false)
      setComposerMediaUrls([])
      setIsComposerOpen(false)

      // Segarkan daftar postingan
      await loadPosts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim postingan.'
      setErrorMsg(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handler Toggle Like
  const handleToggleLike = async (postId: string) => {
    if (!token) {
      setErrorMsg('Silakan masuk untuk menyukai postingan.')
      return
    }

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((item) => {
        if (item.id === postId) {
          const wasLiked = !!item.isLiked
          return {
            ...item,
            isLiked: !wasLiked,
            likesCount: wasLiked ? Math.max(0, item.likesCount - 1) : item.likesCount + 1,
          }
        }
        return item
      })
    )

    try {
      const endpoint = `${getBaseUrl()}/api/posts/${postId}/like`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        // Rollback jika gagal
        await loadPosts()
      }
    } catch {
      await loadPosts()
    }
  }

  // Handler Kirim Komentar
  const handleSendComment = async (postId: string) => {
    const text = (commentInputs[postId] || '').trim()
    if (!text) return
    if (!token) {
      setErrorMsg('Silakan masuk untuk berkomentar.')
      return
    }

    setSubmittingCommentId(postId)

    try {
      const endpoint = `${getBaseUrl()}/api/posts/${postId}/comments`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: text }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal mengirim komentar.')
      }

      const newComment: PostCommentItem = json.data

      // Perbarui state lokal
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            const comments = post.comments || []
            return {
              ...post,
              commentsCount: post.commentsCount + 1,
              comments: [...comments, newComment],
            }
          }
          return post
        })
      )

      // Kosongkan form komentar & buka thread jika belum terbuka
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
      setExpandedComments((prev) => ({ ...prev, [postId]: true }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Komentar tidak dapat dikirim.'
      setErrorMsg(msg)
    } finally {
      setSubmittingCommentId(null)
    }
  }

  // Handler Konfirmasi Hapus Postingan
  const handleConfirmDelete = async () => {
    if (!deleteTargetPost) return
    setIsDeleting(true)

    try {
      const endpoint = `${getBaseUrl()}/api/posts/${deleteTargetPost.id}`
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal menghapus postingan.')
      }

      setPosts((prev) => prev.filter((p) => p.id !== deleteTargetPost.id))
      setDeleteTargetPost(null)
      setSuccessMsg('Postingan berhasil dihapus dari linimasa.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Postingan gagal dihapus.'
      setErrorMsg(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handler Salin Tautan Postingan
  const handleCopyLink = (postId: string) => {
    const url = `${window.location.origin}${POSTS_PATH}#post-${postId}`
    navigator.clipboard.writeText(url)
    setCopiedPostId(postId)
    setTimeout(() => setCopiedPostId(null), 2500)
  }

  // Filter Postingan berdasarkan Kategori & Pencarian
  const filteredPosts = React.useMemo(() => {
    let result = posts

    if (activeCategory !== 'all') {
      result = result.filter((p) => p.category === activeCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.author?.name?.toLowerCase().includes(q) ||
          p.author?.position?.toLowerCase().includes(q)
      )
    }

    return result
  }, [posts, activeCategory, searchQuery])

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header Halaman */}
      <PageHeader
        title="Postingan & Pengumuman"
        description="Linimasa resmi kabar internal perusahaan, edaran operasional, jadwal kerja, dan apresiasi tim."
        actions={
          <Button
            tone="primary"
            onClick={() => setIsComposerOpen((prev) => !prev)}
            className="flex items-center gap-1.5"
          >
            {isComposerOpen ? (
              <>
                <HiOutlineX className="h-4 w-4" />
                <span>Tutup Form</span>
              </>
            ) : (
              <>
                <HiOutlineSpeakerphone className="h-4 w-4" />
                <span>Buat Postingan Baru</span>
              </>
            )}
          </Button>
        }
      />

      {/* Notifikasi Status */}
      {errorMsg && (
        <Notice
          tone="danger"
          title="Perhatian"
          onDismiss={() => setErrorMsg(null)}
        >
          {errorMsg}
        </Notice>
      )}

      {successMsg && (
        <Notice
          tone="success"
          title="Berhasil"
          onDismiss={() => setSuccessMsg(null)}
        >
          {successMsg}
        </Notice>
      )}

      {/* Kotak Komposer Postingan Bergaya Modern X / Twitter */}
      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-sm transition-all duration-200">
        <div className="flex items-start gap-3.5">
          {/* Avatar Penulis */}
          <div className="flex-shrink-0 h-11 w-11 rounded-full bg-surface-2 border border-line flex items-center justify-center font-bold text-ink text-sm shadow-inner">
            {user?.avatarUrl ? (
              <img
                src={resolveLogoUrl(user.avatarUrl)}
                alt={user.name || 'User'}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span>{getInitials(user?.name)}</span>
            )}
          </div>

          {/* Kolom Teks & Konten */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-ink">
                {user?.name || 'Karyawan'}
                <span className="ml-2 font-normal text-xs text-ink-muted">
                  {user?.role === 'admin' ? 'Administrator' : 'Staf Anggota'}
                </span>
              </div>
              <span className="text-xs text-ink-muted">Publikasi Linimasa</span>
            </div>

            <form onSubmit={handleSubmitPost} className="space-y-3">
              {/* Judul Pengumuman Opsional */}
              <input
                type="text"
                placeholder="Judul Berita / Pengumuman (Opsional)..."
                value={composerTitle}
                onChange={(e) => setComposerTitle(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink font-semibold placeholder:font-normal placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-ink"
              />

              {/* Textarea Konten Utama */}
              <textarea
                rows={isComposerOpen ? 4 : 2}
                placeholder="Ada berita, jadwal operasional, atau edaran penting apa hari ini?"
                value={composerContent}
                onChange={(e) => setComposerContent(e.target.value)}
                onFocus={() => setIsComposerOpen(true)}
                className="w-full rounded-lg border border-line bg-surface p-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-ink resize-y leading-relaxed"
              />

              {/* Pratinjau Gambar Terlampir */}
              {composerMediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {composerMediaUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border border-line bg-surface-2 h-24 w-32 shadow-sm"
                    >
                      <img
                        src={resolveLogoUrl(url)}
                        alt={`Lampiran ${idx + 1}`}
                        className="h-full w-full object-cover cursor-pointer"
                        onClick={() => setPreviewImageUrl(resolveLogoUrl(url))}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-ink/80 text-surface hover:bg-ink transition-colors shadow"
                        title="Hapus gambar"
                      >
                        <HiOutlineX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Form Input URL Gambar Langsung jika Diaktifkan */}
              {isAddingImageUrl && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="url"
                    placeholder="Masukkan tautan gambar langsung (https://...)"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                  <Button
                    type="button"
                    size="sm"
                    tone="neutral"
                    onClick={handleAddImageUrl}
                  >
                    Tambah
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    tone="quiet"
                    onClick={() => setIsAddingImageUrl(false)}
                  >
                    Batal
                  </Button>
                </div>
              )}

              {/* Bagian Bawah: Opsi Kategori, Tombol Media & Tombol Publikasi */}
              {isComposerOpen && (
                <div className="pt-2 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Pemilih Kategori & Opsi Pin */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={composerCategory}
                      onChange={(e) => setComposerCategory(e.target.value)}
                      className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-ink cursor-pointer"
                    >
                      <option value="announcement">Pengumuman Resmi</option>
                      <option value="news">Berita Internal</option>
                      <option value="operational">Operasional & Shift</option>
                      <option value="achievement">Prestasi Tim</option>
                      <option value="general">Umum & Diskusi</option>
                    </select>

                    {/* Tombol Unggah Gambar */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUploadMedia(file)
                      }}
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={isUploadingMedia}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface-2 transition-colors disabled:opacity-50"
                      title="Unggah Foto dari Perangkat"
                    >
                      <HiOutlinePhotograph className="h-4 w-4" />
                      <span>{isUploadingMedia ? 'Mengunggah...' : 'Foto'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAddingImageUrl((v) => !v)}
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface-2 transition-colors"
                      title="Sematkan Tautan Gambar Web"
                    >
                      <span>Tautan URL</span>
                    </button>

                    {/* Opsi Sematkan Pengumuman (Admin/HR) */}
                    {canPinPosts && (
                      <label className="inline-flex items-center gap-1.5 text-xs text-ink cursor-pointer ml-1 select-none">
                        <input
                          type="checkbox"
                          checked={composerIsPinned}
                          onChange={(e) => setComposerIsPinned(e.target.checked)}
                          className="rounded border-line text-ink focus:ring-ink"
                        />
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          Sematkan di Atas (Pin)
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Penghitung Karakter & Tombol Kirim */}
                  <div className="flex items-center justify-end gap-2.5">
                    <span className="text-xs text-ink-muted tabular-nums">
                      {composerContent.length} karakter
                    </span>
                    <Button
                      type="submit"
                      tone="primary"
                      size="sm"
                      disabled={isSubmitting || !composerContent.trim() || isUploadingMedia}
                      className="flex items-center gap-1.5 shadow-sm"
                    >
                      <HiOutlinePaperAirplane className="h-3.5 w-3.5 rotate-90" />
                      <span>{isSubmitting ? 'Mengirim...' : 'Kirim'}</span>
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Tab Filter Kategori & Bilah Pencarian */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Pills Kategori */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {CATEGORY_OPTIONS.map((cat) => {
            const isActive = activeCategory === cat.value
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setActiveCategory(cat.value)}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-ink text-surface shadow-sm font-semibold'
                    : 'bg-surface border border-line text-ink hover:bg-surface-2'
                }`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Pencarian */}
        <div className="relative min-w-[220px]">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
          <input
            type="text"
            placeholder="Cari berita atau pengumuman..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-line bg-surface pl-9 pr-8 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-ink"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              <HiOutlineX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Linimasa Feed Postingan */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-line bg-surface p-5 animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-surface-2" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-36 bg-surface-2 rounded" />
                  <div className="h-2.5 w-24 bg-surface-2 rounded" />
                </div>
              </div>
              <div className="space-y-2 pt-1">
                <div className="h-4 w-3/4 bg-surface-2 rounded" />
                <div className="h-3 w-full bg-surface-2 rounded" />
                <div className="h-3 w-5/6 bg-surface-2 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          title="Belum Ada Postingan"
          description={
            searchQuery
              ? `Tidak ditemukan pengumuman atau berita yang sesuai dengan kata kunci "${searchQuery}".`
              : 'Belum ada edaran atau kabar dalam kategori ini. Jadilah yang pertama membagikan informasi!'
          }
          action={
            <Button
              tone="neutral"
              size="sm"
              onClick={() => {
                setActiveCategory('all')
                setSearchQuery('')
                setIsComposerOpen(true)
              }}
            >
              Tulis Postingan Sekarang
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const catMeta = getCategoryMeta(post.category)
            const isCommentsOpen = !!expandedComments[post.id]
            const commentCount = post.commentsCount || (post.comments ? post.comments.length : 0)
            const isAuthorOrAdmin = user && (user.id === post.author?.id || user.role === 'admin')

            return (
              <article
                key={post.id}
                id={`post-${post.id}`}
                className="group rounded-2xl border border-line bg-surface hover:border-line-2 shadow-sm transition-all duration-200 overflow-hidden"
              >
                {/* Header Disematkan (Pinned) */}
                {post.isPinned && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-4 py-1.5 flex items-center justify-between text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">★</span>
                      <span>Pengumuman Prioritas · Disematkan oleh Manajemen</span>
                    </div>
                    <span className="text-[11px] font-normal opacity-80">Wajib Dibaca</span>
                  </div>
                )}

                {/* Konten Kartu */}
                <div className="p-4 sm:p-5">
                  {/* Bar Penulis & Waktu */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-surface-2 border border-line flex items-center justify-center font-bold text-ink text-xs shadow-inner">
                        {post.author?.avatarUrl ? (
                          <img
                            src={resolveLogoUrl(post.author.avatarUrl)}
                            alt={post.author.name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <span>{getInitials(post.author?.name)}</span>
                        )}
                      </div>

                      {/* Detail Penulis & Jabatan */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm text-ink truncate">
                            {post.author?.name || 'Karyawan'}
                          </span>
                          {/* Badge Terverifikasi Admin/HR */}
                          {(post.author?.role === 'admin' ||
                            post.author?.position?.toLowerCase().includes('hr')) && (
                            <span
                              className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-600 text-surface text-[10px] font-bold"
                              title="Terverifikasi Manajemen"
                            >
                              ✓
                            </span>
                          )}
                          <span className="text-xs text-ink-muted">·</span>
                          <span className="text-xs text-ink-muted font-normal">
                            {formatRelativeTime(post.createdAt)}
                          </span>
                        </div>

                        <div className="text-xs text-ink-muted truncate">
                          {post.author?.position || 'Staf'}
                          {post.author?.department?.name && ` · ${post.author.department.name}`}
                        </div>
                      </div>
                    </div>

                    {/* Badge Kategori & Menu Hapus */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge tone={catMeta.badgeTone}>
                        {catMeta.label}
                      </Badge>

                      {isAuthorOrAdmin && (
                        <button
                          type="button"
                          onClick={() => setDeleteTargetPost(post)}
                          className="p-1 rounded-lg text-ink-muted hover:text-red-600 hover:bg-surface-2 transition-colors"
                          title="Hapus Postingan"
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Isi Berita / Pengumuman */}
                  <div className="mt-3.5 space-y-2">
                    {post.title && (
                      <h3 className="text-base sm:text-lg font-bold text-ink tracking-tight leading-snug">
                        {post.title}
                      </h3>
                    )}
                    <p className="text-sm text-ink/90 whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>
                  </div>

                  {/* Gambar Terlampir Bergaya Instagram / X */}
                  {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="mt-3.5">
                      {post.mediaUrls.length === 1 ? (
                        <div
                          className="rounded-xl overflow-hidden border border-line bg-surface-2 max-h-[460px] flex items-center justify-center cursor-pointer group/img"
                          onClick={() => setPreviewImageUrl(resolveLogoUrl(post.mediaUrls[0]))}
                        >
                          <img
                            src={resolveLogoUrl(post.mediaUrls[0])}
                            alt="Media terlampir"
                            className="w-full h-full object-cover max-h-[460px] group-hover/img:scale-[1.01] transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
                          {post.mediaUrls.map((mediaUrl, idx) => (
                            <div
                              key={idx}
                              className="relative h-48 rounded-lg overflow-hidden border border-line bg-surface-2 cursor-pointer group/img"
                              onClick={() => setPreviewImageUrl(resolveLogoUrl(mediaUrl))}
                            >
                              <img
                                src={resolveLogoUrl(mediaUrl)}
                                alt={`Media ${idx + 1}`}
                                className="w-full h-full object-cover group-hover/img:scale-[1.02] transition-transform duration-300"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bar Interaksi Sosial: Suka, Komentar, Bagikan */}
                  <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-ink-muted">
                    <div className="flex items-center gap-4 sm:gap-6">
                      {/* Tombol Like / Respon Hati */}
                      <button
                        type="button"
                        onClick={() => handleToggleLike(post.id)}
                        className={`inline-flex items-center gap-1.5 py-1 px-2 rounded-lg font-medium transition-colors ${
                          post.isLiked
                            ? 'text-red-600 bg-red-50 dark:bg-red-950/30'
                            : 'hover:text-red-600 hover:bg-surface-2'
                        }`}
                      >
                        <span className="text-base leading-none">
                          {post.isLiked ? '♥' : '♡'}
                        </span>
                        <span>{post.likesCount || 0} Suka</span>
                      </button>

                      {/* Tombol Buka Thread Komentar */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedComments((prev) => ({
                            ...prev,
                            [post.id]: !prev[post.id],
                          }))
                        }
                        className="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg font-medium hover:text-ink hover:bg-surface-2 transition-colors"
                      >
                        <HiOutlineChatAlt2 className="h-4 w-4" />
                        <span>{commentCount} Komentar</span>
                      </button>

                      {/* Tombol Salin Tautan */}
                      <button
                        type="button"
                        onClick={() => handleCopyLink(post.id)}
                        className="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg font-medium hover:text-ink hover:bg-surface-2 transition-colors"
                      >
                        {copiedPostId === post.id ? (
                          <>
                            <HiOutlineCheck className="h-4 w-4 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <HiOutlineShare className="h-4 w-4" />
                            <span>Bagikan</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-[11px] text-ink-muted hidden sm:block">
                      Status Terbuka
                    </div>
                  </div>

                  {/* Thread Komentar Interaktif (Expandable) */}
                  {isCommentsOpen && (
                    <div className="mt-4 pt-3 border-t border-line space-y-3">
                      {/* Daftar Komentar Terdahulu */}
                      {post.comments && post.comments.length > 0 ? (
                        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                          {post.comments.map((comm) => (
                            <div
                              key={comm.id}
                              className="flex items-start gap-2.5 bg-surface-2/60 rounded-xl p-2.5 text-xs border border-line/60"
                            >
                              <div className="flex-shrink-0 h-7 w-7 rounded-full bg-surface border border-line flex items-center justify-center font-bold text-ink text-[10px]">
                                {comm.authorAvatarUrl ? (
                                  <img
                                    src={resolveLogoUrl(comm.authorAvatarUrl)}
                                    alt={comm.authorName || 'Karyawan'}
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  <span>{getInitials(comm.authorName)}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-ink">
                                      {comm.authorName || 'Karyawan'}
                                    </span>
                                    {comm.authorRole === 'admin' && (
                                      <span className="text-[10px] text-blue-600 font-medium">
                                        (Admin)
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-ink-muted">
                                    {formatRelativeTime(comm.createdAt)}
                                  </span>
                                </div>
                                <p className="mt-1 text-ink/90 whitespace-pre-wrap leading-relaxed">
                                  {comm.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-ink-muted italic py-1 text-center">
                          Belum ada komentar. Jadilah orang pertama yang menanggapi!
                        </p>
                      )}

                      {/* Form Tambah Komentar Baru */}
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-surface-2 border border-line flex items-center justify-center font-bold text-ink text-xs">
                          {user?.avatarUrl ? (
                            <img
                              src={resolveLogoUrl(user.avatarUrl)}
                              alt={user.name || 'User'}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <span>{getInitials(user?.name)}</span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Tulis balasan atau tanggapan..."
                          value={commentInputs[post.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSendComment(post.id)
                            }
                          }}
                          className="flex-1 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-ink"
                        />
                        <Button
                          size="sm"
                          tone="primary"
                          disabled={
                            submittingCommentId === post.id ||
                            !(commentInputs[post.id] || '').trim()
                          }
                          onClick={() => handleSendComment(post.id)}
                          className="rounded-full px-3"
                        >
                          <HiOutlinePaperAirplane className="h-3 w-3 rotate-90" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Modal Dialog Zoom Gambar Terlampir */}
      <Dialog
        isOpen={!!previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
        width={760}
      >
        <DialogHeading
          title="Pratinjau Foto Lampiran"
        />
        <DialogBody>
          {previewImageUrl && (
            <div className="max-h-[75vh] flex items-center justify-center overflow-auto rounded-lg bg-surface-2 p-1">
              <img
                src={previewImageUrl}
                alt="Foto ukuran penuh"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button tone="neutral" onClick={() => setPreviewImageUrl(null)}>
            Tutup Pratinjau
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Postingan */}
      <ConfirmDialog
        isOpen={!!deleteTargetPost}
        type="danger"
        title="Hapus Postingan"
        confirmText={isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
        cancelText="Batal"
        onClose={() => setDeleteTargetPost(null)}
        onCancel={() => setDeleteTargetPost(null)}
        onConfirm={handleConfirmDelete}
      >
        Apakah Anda yakin ingin menghapus postingan ini dari linimasa? Tindakan ini tidak dapat dibatalkan dan seluruh komentar terkait akan turut dihapus.
      </ConfirmDialog>
    </div>
  )
}
