import * as React from 'react'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  HiOutlineChevronDoubleLeft,
  HiOutlineChevronDoubleRight,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineX,
} from 'react-icons/hi'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { navigationConfig } from '@/configs/navigation.config'
import { resolveLogoUrl } from '@/components/shared/LogoUploader'
import { api } from '@/lib/api'
import { LOGIN_PATH, DASHBOARD_PATH, PROFILE_PATH } from '@/constants/route.constant'
import { cn } from '@/lib/utils'

const SIDEBAR_ID = 'app-sidebar'
const SIDEBAR_COLLAPSE_KEY = 'srikaya_sidebar_collapsed'
const NAV_SECTIONS = [
  { key: 'workspace', label: 'Ruang kerja' },
  { key: 'account', label: 'Akun' },
] as const

function readCollapsedPreference() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function isNavActive(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`)
}

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [navOpen, setNavOpen] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState(readCollapsedPreference)
  const menuButtonRef = React.useRef<HTMLButtonElement>(null)
  const wasNavOpen = React.useRef(false)
  const appName = import.meta.env.VITE_APP_NAME || 'Srikaya Enterprise'

  const currentNavItem = navigationConfig.find((item) =>
    isNavActive(location.pathname, item.path)
  )

  React.useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  React.useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      // Preferensi tetap berlaku untuk sesi berjalan
    }
  }, [collapsed])

  React.useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) setNavOpen(false)
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  React.useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'b') return
      if (!window.matchMedia('(min-width: 1024px)').matches) return
      event.preventDefault()
      setCollapsed((value) => !value)
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  React.useEffect(() => {
    if (!navOpen) {
      if (wasNavOpen.current) {
        wasNavOpen.current = false
        menuButtonRef.current?.focus()
      }
      return
    }

    wasNavOpen.current = true
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [navOpen])

  const handleLogout = () => {
    logout()
    navigate({ to: LOGIN_PATH })
  }

  return (
    <div className="flex min-h-dvh bg-app">
      <AnimatePresence>
        {navOpen && (
          <motion.div
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <Sidebar
        appName={appName}
        userName={user?.name ?? 'Pengguna'}
        userEmail={user?.email ?? ''}
        avatarUrl={user?.avatarUrl ?? null}
        activePath={location.pathname}
        collapsed={collapsed}
        open={navOpen}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        onLogout={handleLogout}
        onClose={() => setNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/90 px-3 backdrop-blur-sm sm:gap-3 sm:px-6 2xl:h-16 2xl:px-10 fhd:px-14">
          <button
            ref={menuButtonRef}
            onClick={() => setNavOpen(true)}
            className="-ml-1 inline-flex h-10 w-10 items-center justify-center rounded-control text-ink-2 hover:bg-surface-2 hover:text-ink lg:hidden button-press-feedback"
            aria-label="Buka navigasi"
            aria-expanded={navOpen}
            aria-controls={SIDEBAR_ID}
          >
            <HiOutlineMenu className="h-5 w-5" />
          </button>

          <span className="truncate text-sm font-semibold text-ink 2xl:text-[15px]">
            {currentNavItem?.title ?? appName}
          </span>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <GatewayStatus />
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1240px] flex-1 px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7 2xl:max-w-[1600px] 2xl:px-10 2xl:py-9 fhd:max-w-[1840px] fhd:px-14 fhd:py-10">
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
  avatarUrl: string | null
  activePath: string
  collapsed: boolean
  open: boolean
  onToggleCollapsed: () => void
  onLogout: () => void
  onClose: () => void
}

function Sidebar({
  appName,
  userName,
  userEmail,
  avatarUrl,
  activePath,
  collapsed,
  open,
  onToggleCollapsed,
  onLogout,
  onClose,
}: SidebarProps) {
  const closeButtonRef = React.useRef<HTMLButtonElement>(null)
  const profileActive = isNavActive(activePath, PROFILE_PATH)

  React.useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 60)
    return () => window.clearTimeout(timer)
  }, [open])

  return (
    <aside
      id={SIDEBAR_ID}
      aria-label="Navigasi utama"
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col border-r border-line bg-surface transition-[transform,width] duration-300 ease-out lg:sticky lg:top-0 lg:z-40 lg:h-dvh lg:max-w-none lg:translate-x-0',
        collapsed
          ? 'lg:w-[80px] 2xl:w-[84px] fhd:w-[88px]'
          : 'lg:w-[260px] xl:w-[272px] 2xl:w-[288px] fhd:w-[304px]',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="group absolute -right-3 top-[42px] z-20 hidden h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-ink-3 shadow-1 hover:border-primary-line hover:bg-primary-subtle hover:text-primary button-press-feedback after:absolute after:-inset-2 after:content-[''] lg:inline-flex 2xl:top-[50px]"
        title={collapsed ? 'Bentangkan sidebar (Ctrl+B)' : 'Ciutkan sidebar (Ctrl+B)'}
        aria-label={collapsed ? 'Bentangkan sidebar' : 'Ciutkan sidebar'}
        aria-expanded={!collapsed}
        aria-controls={SIDEBAR_ID}
        aria-keyshortcuts="Control+B Meta+B"
      >
        {collapsed ? (
          <HiOutlineChevronDoubleRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        ) : (
          <HiOutlineChevronDoubleLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
        )}
      </button>

      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div
          className={cn(
            'flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4 2xl:h-16 2xl:px-5',
            collapsed && 'lg:justify-center lg:px-0'
          )}
        >
          <Link
            to={DASHBOARD_PATH}
            onClick={onClose}
            preload="intent"
            aria-label={`${appName} — buka dasbor`}
            className={cn(
              '-m-1 flex min-w-0 items-center gap-2.5 rounded-control p-1 transition-opacity hover:opacity-80',
              collapsed && 'lg:justify-center'
            )}
          >
            <img
              src="/img/logo/logo-light-streamline.png"
              alt=""
              className="h-7 w-auto 2xl:h-8 dark:hidden"
            />
            <img
              src="/img/logo/logo-dark-streamline.png"
              alt=""
              className="hidden h-7 w-auto 2xl:h-8 dark:block"
            />
            <span
              className={cn(
                'truncate text-[13px] font-bold tracking-tight text-ink 2xl:text-sm',
                collapsed && 'lg:hidden'
              )}
            >
              {appName}
            </span>
          </Link>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="-mr-1 inline-flex h-10 w-10 items-center justify-center rounded-control text-ink-2 hover:bg-surface-2 hover:text-ink lg:hidden button-press-feedback"
            aria-label="Tutup navigasi"
          >
            <HiOutlineX className="h-5 w-5" />
          </button>
        </div>

        <nav
          className={cn(
            'flex-1 overflow-y-auto px-3 py-4 2xl:px-4 2xl:py-5',
            collapsed && 'lg:px-2 2xl:px-2'
          )}
          aria-label="Menu aplikasi"
        >
          {NAV_SECTIONS.map((section, sectionIndex) => {
            const items = navigationConfig.filter((item) => item.section === section.key)
            if (items.length === 0) return null

            return (
              <div key={section.key} className={cn(sectionIndex > 0 && 'mt-4 2xl:mt-5')}>
                <div
                  className={cn(
                    'px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3',
                    collapsed && 'lg:hidden'
                  )}
                >
                  {section.label}
                </div>
                {collapsed && sectionIndex > 0 && (
                  <div className="mx-auto mb-2 hidden h-px w-6 bg-line lg:block" aria-hidden="true" />
                )}
                <ul className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon
                    const active = isNavActive(activePath, item.path)

                    return (
                      <li key={item.key}>
                        <Link
                          to={item.path}
                          onClick={onClose}
                          preload="intent"
                          aria-label={item.title}
                          aria-current={active ? 'page' : undefined}
                          title={collapsed ? item.title : undefined}
                          className={cn(
                            'group relative flex min-h-[44px] items-center gap-3 rounded-control px-3 py-2.5 text-[13px] font-medium transition-colors duration-150 2xl:text-[14px]',
                            active ? 'text-primary' : 'text-ink-2 hover:text-ink',
                            collapsed && 'lg:justify-center lg:px-0'
                          )}
                        >
                          {active ? (
                            <>
                              <motion.span
                                layoutId="sidebar-active-pill"
                                className="absolute inset-0 rounded-control bg-primary-subtle"
                                transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.8 }}
                                aria-hidden="true"
                              />
                              <motion.span
                                layoutId="sidebar-active-rail"
                                className="absolute left-0 top-1/2 -mt-2.5 h-5 w-[3px] rounded-r-full bg-primary"
                                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                aria-hidden="true"
                              />
                            </>
                          ) : (
                            <span
                              className="absolute inset-0 rounded-control bg-transparent transition-colors duration-150 group-hover:bg-surface-2"
                              aria-hidden="true"
                            />
                          )}

                          <Icon
                            className={cn(
                              'relative z-10 h-[18px] w-[18px] shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 2xl:h-5 2xl:w-5',
                              active && 'text-primary'
                            )}
                          />
                          <span
                            className={cn(
                              'relative z-10 min-w-0 flex-1 truncate',
                              active && 'font-semibold',
                              collapsed && 'lg:hidden'
                            )}
                          >
                            {item.title}
                          </span>
                          {item.badge ? (
                            <span
                              className={cn(
                                'relative z-10 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-ink-3',
                                active && 'bg-surface',
                                collapsed && 'lg:hidden'
                              )}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                          {active ? (
                            <span
                              className={cn(
                                'relative z-10 ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary',
                                collapsed && 'lg:hidden'
                              )}
                              aria-hidden="true"
                            />
                          ) : (
                            <span
                              className={cn(
                                'relative z-10 ml-auto w-3 shrink-0 text-right text-[13px] text-ink-3 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100',
                                collapsed && 'lg:hidden'
                              )}
                              aria-hidden="true"
                            >
                              →
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        <div
          className={cn(
            'shrink-0 border-t border-line p-3 2xl:p-4',
            collapsed && 'lg:p-2 2xl:p-2.5'
          )}
        >
          <div
            className={cn(
              'flex items-center gap-1 rounded-control px-1.5 py-1.5',
              collapsed && 'lg:flex-col lg:gap-1.5 lg:px-0'
            )}
          >
            <Link
              to={PROFILE_PATH}
              onClick={onClose}
              preload="intent"
              title="Buka halaman profil"
              aria-label={`Buka profil ${userName}`}
              aria-current={profileActive ? 'page' : undefined}
              className={cn(
                'group flex min-w-0 flex-1 items-center gap-3 rounded-control p-1 transition-colors',
                profileActive ? 'bg-primary-subtle' : 'hover:bg-surface-2',
                collapsed && 'lg:w-full lg:flex-none lg:justify-center lg:p-1.5'
              )}
            >
              <div className="relative shrink-0">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-primary text-[11px] font-bold text-primary-on 2xl:h-10 2xl:w-10 2xl:text-xs">
                  {avatarUrl ? (
                    <img
                      src={resolveLogoUrl(avatarUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials(userName)
                  )}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success"
                  title="Sesi aktif"
                >
                  <span className="sr-only">Sesi aktif</span>
                </span>
              </div>
              <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
                <div
                  className={cn(
                    'truncate text-[13px] font-semibold text-ink 2xl:text-sm',
                    profileActive && 'text-primary'
                  )}
                >
                  {userName}
                </div>
                <div className="truncate text-xs text-ink-3">{userEmail}</div>
              </div>
              <span
                className={cn(
                  'shrink-0 text-[13px] text-ink-3 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100',
                  profileActive && 'text-primary opacity-100',
                  collapsed && 'lg:hidden'
                )}
                aria-hidden="true"
              >
                →
              </span>
            </Link>
            <button
              onClick={onLogout}
              className={cn(
                '-mr-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-2 hover:bg-error-subtle hover:text-error button-press-feedback',
                collapsed && 'lg:mx-auto lg:mr-0'
              )}
              title="Keluar sesi"
              aria-label="Keluar sesi"
            >
              <HiOutlineLogout className="h-[18px] w-[18px] 2xl:h-5 2xl:w-5" />
            </button>
          </div>
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
      className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-2 hover:bg-surface-2 hover:text-ink button-press-feedback 2xl:h-10 2xl:w-10"
      title={isDark ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
      aria-label={isDark ? 'Gunakan tema terang' : 'Gunakan tema gelap'}
    >
      {isDark ? <HiOutlineSun className="h-[18px] w-[18px] 2xl:h-5 2xl:w-5" /> : <HiOutlineMoon className="h-[18px] w-[18px] 2xl:h-5 2xl:w-5" />}
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
      className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2 py-1.5 text-[11px] font-medium text-ink-2 transition-colors hover:bg-surface-2 button-press-feedback sm:px-2.5 2xl:text-xs"
      title={`Status: ${label} (Klik untuk periksa ulang)`}
      aria-label={label}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          state === 'online' ? 'bg-success' : state === 'offline' ? 'bg-error' : 'bg-ink-3 animate-pulse'
        )}
      />
      <span className="hidden xs:inline">{label}</span>
    </button>
  )
}
