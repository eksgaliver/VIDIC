import * as React from 'react'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import {
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineX,
} from 'react-icons/hi'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { navigationConfig } from '@/configs/navigation.config'
import { api } from '@/lib/api'
import { LOGIN_PATH } from '@/constants/route.constant'
import { cn } from '@/lib/utils'

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [navOpen, setNavOpen] = React.useState(false)
  const appName = import.meta.env.VITE_APP_NAME || 'Srikaya Enterprise'

  const currentNavItem = navigationConfig.find((item) =>
    location.pathname.startsWith(item.path)
  )

  React.useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate({ to: LOGIN_PATH })
  }

  return (
    <div className="flex min-h-dvh bg-app">
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        appName={appName}
        userName={user?.name ?? 'Pengguna'}
        userEmail={user?.email ?? ''}
        open={navOpen}
        onLogout={handleLogout}
        onClose={() => setNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur-sm sm:px-6">
          <button
            onClick={() => setNavOpen(true)}
            className="-ml-1 rounded-control p-2 text-ink-2 hover:bg-surface-2 hover:text-ink lg:hidden button-press-feedback"
            aria-label="Buka navigasi"
          >
            <HiOutlineMenu className="h-5 w-5" />
          </button>

          <span className="truncate text-sm font-semibold text-ink">
            {currentNavItem?.title ?? appName}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <GatewayStatus />
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div key={location.pathname} className="route-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

interface SidebarProps {
  appName: string
  userName: string
  userEmail: string
  open: boolean
  onLogout: () => void
  onClose: () => void
}

function Sidebar({ appName, userName, userEmail, open, onLogout, onClose }: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[272px] max-w-[82vw] flex-col border-r border-line bg-surface transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:max-w-none lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src="/img/logo/logo-light-streamline.png"
            alt=""
            className="h-7 w-auto dark:hidden"
          />
          <img
            src="/img/logo/logo-dark-streamline.png"
            alt=""
            className="hidden h-7 w-auto dark:block"
          />
          <span className="truncate text-[13px] font-bold tracking-tight text-ink">{appName}</span>
        </div>
        <button
          onClick={onClose}
          className="-mr-1 rounded-control p-2 text-ink-2 hover:bg-surface-2 hover:text-ink lg:hidden button-press-feedback"
          aria-label="Tutup navigasi"
        >
          <HiOutlineX className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigationConfig.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.key}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-control px-3 py-2.5 text-[13px] font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
                  activeProps={{
                    className: 'bg-primary-subtle text-primary font-semibold hover:bg-primary-subtle hover:text-primary',
                  }}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="flex-1 truncate">{item.title}</span>
                  {item.badge ? (
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-ink-3">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-control px-1.5 py-1.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-on">
            {initials(userName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-ink">{userName}</div>
            <div className="truncate text-xs text-ink-3">{userEmail}</div>
          </div>
          <button
            onClick={onLogout}
            className="-mr-1 shrink-0 rounded-control p-2 text-ink-2 hover:bg-error-subtle hover:text-error button-press-feedback"
            title="Keluar sesi"
            aria-label="Keluar sesi"
          >
            <HiOutlineLogout className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </aside>
  )
}

function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'OP'
  )
}

function ThemeToggle() {
  const resolved = useThemeStore((state) => state.resolved)
  const toggle = useThemeStore((state) => state.toggle)
  const isDark = resolved === 'dark'

  return (
    <button
      onClick={toggle}
      className="rounded-control p-2 text-ink-2 hover:bg-surface-2 hover:text-ink button-press-feedback"
      title={isDark ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
      aria-label={isDark ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
    >
      {isDark ? <HiOutlineSun className="h-[18px] w-[18px]" /> : <HiOutlineMoon className="h-[18px] w-[18px]" />}
    </button>
  )
}

type GatewayState = 'checking' | 'online' | 'offline'

function GatewayStatus() {
  const [state, setState] = React.useState<GatewayState>('checking')

  const check = React.useCallback(async () => {
    setState('checking')
    try {
      const res = await api.health.get()
      setState(res.error ? 'offline' : 'online')
    } catch {
      setState('offline')
    }
  }, [])

  React.useEffect(() => {
    check()
  }, [check])

  const label =
    state === 'checking' ? 'Memeriksa gateway' : state === 'online' ? 'Gateway terhubung' : 'Gateway tidak terjangkau'

  return (
    <button
      onClick={check}
      className="mr-1 hidden items-center gap-2 rounded-control border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:bg-surface-2 sm:inline-flex button-press-feedback"
      title="Periksa ulang koneksi gateway"
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          state === 'online' ? 'bg-success' : state === 'offline' ? 'bg-error' : 'bg-ink-3 animate-pulse'
        )}
      />
      {label}
    </button>
  )
}
