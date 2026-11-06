import * as React from 'react'
import { createRoute, useNavigate } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { HiOutlineMail, HiOutlineLockClosed } from 'react-icons/hi'

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage
})

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth, isAuthenticated } = useAuthStore()

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
            : 'Autentikasi gagal: periksa kembali data masukan Anda'
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
        const failMessage = resData && 'message' in resData ? String(resData.message) : 'Respon server tidak valid'
        setErrorMsg(failMessage)
      }
    } catch {
      setErrorMsg('Gagal terhubung ke gateway autentikasi pada port 3000')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-neutral-900 font-sans">
      {/* Kolom Kiri: Formulir Masuk Ecme */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Logo Header */}
        <div className="flex items-center gap-3">
          <img
            src="/img/logo/logo-light-streamline.png"
            alt="Srikaya Logo"
            className="h-9 w-auto dark:hidden"
          />
          <img
            src="/img/logo/logo-dark-streamline.png"
            alt="Srikaya Logo"
            className="hidden h-9 w-auto dark:block"
          />
          <span className="font-bold tracking-tight text-lg text-neutral-900 dark:text-white">
            Srikaya Platform
          </span>
        </div>

        {/* Form Container */}
        <div className="mx-auto w-full max-w-md py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Selamat Datang
            </h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Silakan masukkan kredensial akun Anda untuk mengakses sistem dasbor mikroservis.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50/80 p-4 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
            >
              <div className="font-semibold flex items-center gap-1.5">
                <span>&#x2715; Autentikasi Gagal</span>
              </div>
              <div className="mt-1 pl-4">{errorMsg}</div>
            </div>
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
                <span className="text-xs text-neutral-400">Min. 6 Karakter</span>
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

            {/* Kotak Kredensial Demo */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/60 dark:text-neutral-300">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-white">
                <span className="text-primary">&#x25CF;</span>
                <span>Kredensial Demo Terintegrasi</span>
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

        {/* Footer Note */}
        <div className="text-xs text-neutral-400">
          &copy; 2026 Srikaya Platform &middot; Ecme Template &middot; Bun &middot; ElysiaJS &middot; React 19
        </div>
      </div>

      {/* Kolom Kanan: Visual Banner Samping Ecme */}
      <div className="hidden lg:flex flex-1 p-6 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="relative h-full max-h-[94vh] w-full max-w-[640px] overflow-hidden rounded-3xl shadow-xl">
          <img
            src="/img/others/auth-side-bg.png"
            alt="Srikaya Enterprise Atmosphere"
            className="h-full w-full object-cover"
          />
          {/* Overlay Kartu Info di Atas Visual */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-10 text-white">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-mild">
              Arsitektur Mikroservis Terdistribusi
            </span>
            <h2 className="mt-2 text-2xl font-bold leading-snug">
              Kinerja Tinggi Bun &amp; ElysiaJS dengan Frontend React 19
            </h2>
            <p className="mt-2 text-xs text-neutral-300 leading-relaxed max-w-md">
              Dilengkapi type-safe RPC via Eden Treaty, ORM relasional Drizzle, dan desain antarmuka enterprise Ecme.
            </p>
            <div className="mt-6 flex items-center gap-4 text-xs font-mono text-neutral-200">
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400">&#x25CF;</span> Gateway :3000
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400">&#x25CF;</span> Auth :3001
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-emerald-400">&#x25CF;</span> Client :5173
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
