import * as React from 'react'
import { createRoute, useNavigate } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { HiOutlineMail, HiOutlineLockClosed } from 'react-icons/hi'
import Alert from '@/components/ui/Alert'

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage
})

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth, isAuthenticated } = useAuthStore()
  const appName = import.meta.env.VITE_APP_NAME || 'Srikaya Enterprise'

  const [email, setEmail] = React.useState('admin@srikaya.id')
  const [password, setPassword] = React.useState('rahasia123')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/dashboard' })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsLoading(true)

    try {
      const response = await api.auth.login.post({
        email,
        password
      })

      if (response.error) {
        const message =
          typeof response.error.value === 'object' && response.error.value && 'message' in response.error.value
            ? String((response.error.value as { message?: string }).message)
            : 'Surel atau kata sandi tidak cocok. Periksa kembali data Anda.'
        setErrorMsg(message)
        setIsLoading(false)
        return
      }

      const resData = response.data
      if (resData && 'token' in resData && resData.token && resData.user) {
        setAuth(resData.token, {
          id: resData.user.id,
          email: resData.user.email,
          name: resData.user.name,
          role: resData.user.role as 'admin' | 'member' | 'guest',
          createdAt: resData.user.createdAt
        })
        navigate({ to: '/dashboard' })
      } else {
        const failMessage =
          resData && 'message' in resData ? String(resData.message) : 'Server tidak memberikan respon valid.'
        setErrorMsg(failMessage)
      }
    } catch {
      setErrorMsg('Gagal terhubung ke gateway API. Pastikan layanan backend aktif.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-900 font-sans">
      {/* Kolom Kiri: Formulir Masuk */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Identitas Brand */}
        <div className="flex items-center gap-3">
          <img
            src="/img/logo/logo-light-streamline.png"
            alt={appName}
            className="h-9 w-auto dark:hidden"
          />
          <img
            src="/img/logo/logo-dark-streamline.png"
            alt={appName}
            className="hidden h-9 w-auto dark:block"
          />
          <span className="font-bold tracking-tight text-lg text-neutral-900 dark:text-white">
            {appName}
          </span>
        </div>

        {/* Konten Formulir */}
        <div className="mx-auto w-full max-w-md py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Masuk ke Akun
            </h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Masukkan surel dan kata sandi Anda untuk mengelola layanan.
            </p>
          </div>

          {errorMsg && (
            <Alert
              type="danger"
              showIcon
              title="Permintaan Ditolak"
              className="mb-6 shadow-sm"
              closable
              onClose={() => setErrorMsg(null)}
            >
              {errorMsg}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
              >
                Alamat Surel
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <HiOutlineMail className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@srikaya.id"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-neutral-300 bg-neutral-50/50 py-2.5 pl-11 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:bg-neutral-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
                >
                  Kata Sandi
                </label>
                <span className="text-xs text-neutral-400">Minimal 6 karakter</span>
              </div>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <HiOutlineLockClosed className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-neutral-300 bg-neutral-50/50 py-2.5 pl-11 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:bg-neutral-900"
                />
              </div>
            </div>

            {/* Kotak Informasi Demo Kredensial */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-300">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-white">
                <span className="text-primary">&#x25CF;</span>
                <span>Akun Bawaan Pengembang</span>
              </div>
              <div className="mt-1 text-[11px] space-y-0.5 text-neutral-500 dark:text-neutral-400">
                <div>Surel: <span className="font-mono text-neutral-800 dark:text-neutral-200">admin@srikaya.id</span></div>
                <div>Sandi: <span className="font-mono text-neutral-800 dark:text-neutral-200">rahasia123</span></div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-primary py-3 px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? 'Memverifikasi Sesi...' : 'Masuk Sekarang \u2192'}
            </button>
          </form>
        </div>

        {/* Keterangan Hak Cipta & Stack */}
        <div className="text-xs text-neutral-400">
          &copy; 2026 {appName} &middot; Layanan Terdistribusi Bun &amp; Node.js
        </div>
      </div>

      {/* Kolom Kanan: Visual Samping */}
      <div className="hidden lg:flex flex-1 p-6 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="relative h-full max-h-[94vh] w-full max-w-[640px] overflow-hidden rounded-3xl shadow-xl">
          <img
            src="/img/others/auth-side-bg.png"
            alt="Suasana Ruang Kerja"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-10 text-white">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-mild">
              Sistem Informasi Terpadu
            </span>
            <h2 className="mt-2 text-2xl font-bold leading-snug">
              Kendali Klaster Mikroservis Lintas Runtime
            </h2>
            <p className="mt-2 text-xs text-neutral-300 leading-relaxed max-w-md">
              Integrasi langsung antara backend Bun dan antarmuka client Node.js dengan keamanan tipe Eden Treaty.
            </p>
            <div className="mt-6 flex items-center gap-4 text-xs font-mono text-neutral-200">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400">&#x25CF;</span> Gateway Aktif
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400">&#x25CF;</span> Basis Data Terhubung
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400">&#x25CF;</span> Sesi Aman
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
