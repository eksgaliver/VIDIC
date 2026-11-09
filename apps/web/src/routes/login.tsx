import * as React from 'react'
import { createRoute, redirect, useNavigate } from '@tanstack/react-router'
import { HiOutlineLockClosed, HiOutlineMail, HiOutlineMoon, HiOutlineSun } from 'react-icons/hi'
import { rootRoute } from './__root'
import { api } from '@/lib/api'
import { getLastLoginEmail, useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { Notice, Button } from '@/components/base'
import { errorText } from '@/utils/apiError'
import { DASHBOARD_PATH, LOGIN_PATH } from '@/constants/route.constant'
import { cn } from '@/lib/utils'

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: LOGIN_PATH,
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      throw redirect({ to: DASHBOARD_PATH })
    }
  },
  component: LoginPage
})

const inputClass =
  'h-11 w-full rounded-control border border-line bg-surface pl-10 pr-3.5 text-[14px] text-ink transition-[border-color,background-color] duration-150 hover:border-line-strong focus:border-primary sm:h-10'

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const appName = import.meta.env.VITE_APP_NAME || 'Srikaya Enterprise'

  const [email, setEmail] = React.useState(() => getLastLoginEmail() || 'admin@srikaya.id')
  const [password, setPassword] = React.useState('rahasia123')
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsLoading(true)

    try {
      const res = await api.auth.login.post({ email, password })

      if (res.error) {
        setErrorMsg(errorText(res, 'Surel atau kata sandi tidak cocok.'))
        return
      }

      const data = res.data
      if (data && 'token' in data && data.token && data.user) {
        setAuth(data.token, {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role as 'admin' | 'member' | 'guest',
          avatarUrl: data.user.avatarUrl ?? null,
          createdAt: data.user.createdAt
        })
        navigate({ to: DASHBOARD_PATH })
      } else {
        setErrorMsg(errorText({ error: { value: data } }, 'Server tidak mengirim balasan yang sah.'))
      }
    } catch {
      setErrorMsg('Gateway API tidak terjangkau. Jalankan layanan backend lebih dahulu.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh bg-app">
      <div className="flex flex-1 flex-col px-4 py-5 sm:px-10 lg:px-14 2xl:px-20 fhd:px-28">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/img/logo/logo-light-streamline.png"
              alt=""
              className="h-8 w-auto 2xl:h-9 dark:hidden"
            />
            <img
              src="/img/logo/logo-dark-streamline.png"
              alt=""
              className="hidden h-8 w-auto 2xl:h-9 dark:block"
            />
            <span className="text-[15px] font-bold tracking-tight text-ink 2xl:text-base">{appName}</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-8 2xl:py-12">
          <div className="w-full max-w-[390px] 2xl:max-w-[430px]">
            <div className="mb-7 2xl:mb-9">
              <h1 className="text-2xl font-bold tracking-tightest text-ink 2xl:text-3xl">Masuk ke portal</h1>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2 2xl:text-sm">
                Sesi berlaku tujuh hari. Kredensial diverifikasi oleh layanan auth melalui gateway.
              </p>
            </div>

            {errorMsg && (
              <Notice
                tone="danger"
                title="Tidak bisa masuk"
                onDismiss={() => setErrorMsg(null)}
                className="mb-5"
              >
                {errorMsg}
              </Notice>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-[13px] font-semibold text-ink-2"
                >
                  Alamat surel
                </label>
                <div className="relative">
                  <HiOutlineMail className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@perusahaan.co.id"
                    required
                    autoComplete="email"
                    className={cn(inputClass, 'font-mono text-[13px]')}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-[13px] font-semibold text-ink-2"
                  >
                    Kata sandi
                  </label>
                  <span className="text-[11px] text-ink-3">minimal 6 karakter</span>
                </div>
                <div className="relative">
                  <HiOutlineLockClosed className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-3" />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={inputClass}
                  />
                </div>
              </div>

              <Button type="submit" tone="primary" full loading={isLoading}>
                {isLoading ? 'Memverifikasi' : 'Masuk'}
              </Button>
            </form>

            <div className="mt-6 rounded-control border border-line bg-surface px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                Kredensial awal layanan auth
              </p>
              <dl className="mt-2 space-y-1 text-[12px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-2">Surel</dt>
                  <dd className="font-mono text-ink">admin@srikaya.id</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-2">Kata sandi</dt>
                  <dd className="font-mono text-ink">rahasia123</dd>
                </div>
              </dl>
              <p className="mt-2 text-[11px] leading-snug text-ink-3">
                Berlaku setelah layanan auth dimulai ulang, selama profil belum diubah.
              </p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-ink-3">
          &copy; 2026 {appName} &middot; Layanan berjalan di Bun, antarmuka di Node.js
        </p>
      </div>

      <div className="hidden w-[46%] max-w-[720px] shrink-0 border-l border-line p-6 lg:block">
        <div className="relative h-full overflow-hidden rounded-panel">
          <img
            src="/img/others/auth-side-bg.png"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/25 to-transparent p-10 text-white">
            <h2 className="text-2xl font-bold leading-snug tracking-tight">
              Portal operasional kehadiran
            </h2>
            <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/85">
              Satu tempat untuk mengatur badan usaha, titik geofence absensi, dan struktur departemen.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function ThemeToggle() {
  const resolved = useThemeStore((state) => state.resolved)
  const toggle = useThemeStore((state) => state.toggle)
  const isDark = resolved === 'dark'

  return (
    <button
      onClick={toggle}
      className={cn(
        'rounded-control border border-line bg-surface p-2 text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink button-press-feedback',
        'lg:border-transparent lg:bg-transparent'
      )}
      title={isDark ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
      aria-label={isDark ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
    >
      {isDark ? (
        <HiOutlineSun className="h-[18px] w-[18px]" />
      ) : (
        <HiOutlineMoon className="h-[18px] w-[18px]" />
      )}
    </button>
  )
}
