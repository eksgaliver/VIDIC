import * as React from 'react'
import { createRoute, redirect, useNavigate } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { useAuthStore } from '@/stores/auth'
import {
  HiOutlineHome,
  HiOutlineOfficeBuilding,
  HiOutlineLogout
} from 'react-icons/hi'

export const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: () => {
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardPage
})

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [activeTab, setActiveTab] = React.useState('dashboard')
  const appName = import.meta.env.VITE_APP_NAME || 'Srikaya Enterprise'

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  const navItems = [
    { id: 'dashboard', label: 'Dasbor', icon: HiOutlineHome },
    { id: 'companies', label: 'Perusahaan', icon: HiOutlineOfficeBuilding }
  ]

  return (
    <div className="flex min-h-screen bg-neutral-100 dark:bg-neutral-950 font-sans text-neutral-800 dark:text-neutral-200">
      {/* 1. Sidebar Navigasi */}
      <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2">
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
                Portal Manajemen
              </div>
            </div>
          </div>

          {/* Daftar Menu */}
          <nav className="space-y-1">
            <div className="px-2 pb-2 text-[11px] font-semibold tracking-wider uppercase text-neutral-400">
              Menu Utama
            </div>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Profil Singkat di Bawah Sidebar */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-bold text-xs text-white">
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
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 cursor-pointer"
          >
            <HiOutlineLogout className="h-3.5 w-3.5" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* 2. Area Konten Utama */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header Atas */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/80 px-6 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>{appName}</span>
            <span>/</span>
            <span className="font-semibold text-neutral-900 dark:text-white">Dasbor</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer lg:hidden"
              title="Keluar"
            >
              <HiOutlineLogout className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Badan Halaman - Halaman Kosong Khusus Ucapan Selamat Datang (Greeting) */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl">
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900 shadow-sm">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Portal Informasi
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
                Selamat Datang, {user?.name || 'Operator'}
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Sistem informasi kehadiran karyawan dan manajemen operasional perusahaan siap digunakan.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
