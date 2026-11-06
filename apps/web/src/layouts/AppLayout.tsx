import * as React from 'react'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth'
import { navigationConfig } from '@/configs/navigation.config'
import { HiOutlineLogout, HiOutlineMenu, HiOutlineX } from 'react-icons/hi'

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const appName = import.meta.env.VITE_APP_NAME || 'Srikaya Enterprise'

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  // Cari judul halaman saat ini berdasarkan navigasi
  const currentNavItem = navigationConfig.find((item) =>
    location.pathname.startsWith(item.path)
  )
  const currentTitle = currentNavItem ? currentNavItem.title : 'Halaman'

  return (
    <div className="flex min-h-screen bg-neutral-100 dark:bg-neutral-950 font-sans text-neutral-800 dark:text-neutral-200">
      {/* 1. Backdrop Navigasi Mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 2. Sidebar Navigasi Utama */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col justify-between border-r border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 transition-transform duration-200 lg:static lg:z-10 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Identitas Brand */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <img
                src="/img/logo/logo-light-streamline.png"
                alt={appName}
                className="h-8 w-auto dark:hidden"
              />
              <img
                src="/img/logo/logo-dark-streamline.png"
                alt={appName}
                className="hidden h-8 w-auto dark:block"
              />
              <div>
                <div className="text-base font-bold leading-none tracking-tight text-neutral-900 dark:text-white">
                  {appName}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-neutral-400 mt-1">
                  Portal Layanan
                </div>
              </div>
            </div>

            {/* Tombol Tutup Mobile */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
            >
              <HiOutlineX className="h-5 w-5" />
            </button>
          </div>

          {/* Daftar Menu Terpusat */}
          <nav className="space-y-1">
            <div className="px-2 pb-2 text-[11px] font-semibold tracking-wider uppercase text-neutral-400">
              Menu Utama
            </div>
            {navigationConfig.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  activeProps={{
                    className:
                      'bg-primary/10 text-primary dark:bg-primary/20 font-semibold'
                  }}
                  inactiveProps={{
                    className:
                      'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.title}</span>
                  {item.badge && (
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Profil Singkat & Tombol Keluar di Bawah Sidebar */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-bold text-xs text-white shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-semibold text-neutral-900 dark:text-white">
                {user?.name || 'Pengguna'}
              </div>
              <div className="truncate text-[11px] text-neutral-500 font-mono">
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
          >
            <HiOutlineLogout className="h-3.5 w-3.5" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* 3. Area Konten Utama */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header Atas */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/80 px-6 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
              title="Buka Navigasi"
            >
              <HiOutlineMenu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="hidden sm:inline">{appName}</span>
              <span className="hidden sm:inline">/</span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {currentTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-mono text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              <span>●</span>
              <span>Sesi Terverifikasi</span>
            </span>
          </div>
        </header>

        {/* Render Rute Aktif */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

