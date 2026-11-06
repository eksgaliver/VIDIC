import * as React from 'react'
import { createRoute, redirect, useNavigate } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { useAuthStore } from '@/stores/auth'
import {
  HiOutlineHome,
  HiOutlineServer,
  HiOutlineDatabase,
  HiOutlineCube,
  HiOutlineCog,
  HiOutlineLogout,
  HiOutlineSearch,
  HiOutlineBell,
  HiOutlineShieldCheck,
  HiOutlineCheckCircle
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
  const { user, token, logout } = useAuthStore()
  const [activeTab, setActiveTab] = React.useState('dashboard')

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  const navItems = [
    { id: 'dashboard', label: 'Dasbor Utama', icon: HiOutlineHome },
    { id: 'services', label: 'Klaster Layanan', icon: HiOutlineServer },
    { id: 'database', label: 'Drizzle ORM & Data', icon: HiOutlineDatabase },
    { id: 'gateway', label: 'API Gateway RPC', icon: HiOutlineCube },
    { id: 'settings', label: 'Pengaturan Sistem', icon: HiOutlineCog },
  ]

  return (
    <div className="flex min-h-screen bg-neutral-100 dark:bg-neutral-950 font-sans text-neutral-800 dark:text-neutral-200">
      {/* 1. Sidebar Navigasi Ecme */}
      <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="space-y-6">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-2">
            <img
              src="/img/logo/logo-light-streamline.png"
              alt="Srikaya"
              className="h-8 w-auto dark:hidden"
            />
            <img
              src="/img/logo/logo-dark-streamline.png"
              alt="Srikaya"
              className="hidden h-8 w-auto dark:block"
            />
            <div>
              <div className="text-base font-bold leading-none tracking-tight text-neutral-900 dark:text-white">
                Srikaya
              </div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 mt-0.5">
                Enterprise Suite
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="space-y-1">
            <div className="px-2 pb-2 text-[11px] font-semibold tracking-wider uppercase text-neutral-400">
              Navigasi Layanan
            </div>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
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

        {/* User Card Bottom Sidebar */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-bold text-xs text-white">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-semibold text-neutral-900 dark:text-white">
                {user?.name || 'Srikaya Operator'}
              </div>
              <div className="truncate text-[11px] text-neutral-500 font-mono">
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-1.5 text-xs font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <HiOutlineLogout className="h-3.5 w-3.5" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header Ecme */}
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/80 px-6 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-900/80">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>Srikaya</span>
              <span>/</span>
              <span>Klaster</span>
              <span>/</span>
              <span className="font-semibold text-neutral-900 dark:text-white">Ikhtisar</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input Bar */}
            <div className="relative hidden md:block">
              <HiOutlineSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari rute / servis..."
                className="h-9 w-56 rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-xs placeholder:text-neutral-400 focus:border-primary focus:bg-white focus:outline-none dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>

            {/* Status Klaster Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>3 Layanan Aktif</span>
            </div>

            <button
              onClick={handleLogout}
              className="lg:hidden rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              title="Keluar"
            >
              <HiOutlineLogout className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl">
          {/* Header Judul Halaman */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Ikhtisar Operasional Mikroservis
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Laporan metrik performa Bun runtime, rute ElysiaJS Gateway, dan basis data Drizzle ORM.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-neutral-200/60 dark:bg-neutral-800 px-2.5 py-1 text-xs font-mono text-neutral-700 dark:text-neutral-300">
                Mode: Monorepo Orchestrated
              </span>
            </div>
          </div>

          {/* 4 Kartu Metrik Ecme */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                <span>Klaster Servis</span>
                <span className="text-emerald-600 font-bold">&#x25CF; Sehat</span>
              </div>
              <div className="mt-3 text-2xl font-bold text-neutral-900 dark:text-white">
                3 / 3
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Gateway :3000, Auth :3001, Web :5173
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                <span>Latensi Gateway</span>
                <span className="text-primary font-bold">Bun Native</span>
              </div>
              <div className="mt-3 text-2xl font-bold text-neutral-900 dark:text-white">
                &lt; 2.1 ms
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Reverse proxy tanpa bottleneck HTTP
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                <span>Basis Data</span>
                <span className="text-neutral-400 font-mono">Drizzle</span>
              </div>
              <div className="mt-3 text-2xl font-bold text-neutral-900 dark:text-white">
                PostgreSQL
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Pool 10 koneksi &middot; Schema valid
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                <span>Sesi Operator</span>
                <span className="text-emerald-600 font-bold">&#x2713; Terverifikasi</span>
              </div>
              <div className="mt-3 text-2xl font-bold text-neutral-900 dark:text-white">
                7 Hari
              </div>
              <p className="mt-1 text-xs text-neutral-500 font-mono">
                Role: {user?.role || 'admin'}
              </p>
            </div>
          </div>

          {/* Tabel Status Klaster Mikroservis */}
          <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 overflow-hidden">
            <div className="border-b border-neutral-200 p-5 dark:border-neutral-800">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                Daftar Node Layanan Aktif
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Pemetaan port dan runtime terdistribusi pada satu orkestrator terpadu.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-200 bg-neutral-50/75 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/50">
                  <tr>
                    <th className="py-3 px-5 font-semibold">Nama Layanan</th>
                    <th className="py-3 px-5 font-semibold">Runtime</th>
                    <th className="py-3 px-5 font-semibold">Port</th>
                    <th className="py-3 px-5 font-semibold">Protokol &amp; Tipe</th>
                    <th className="py-3 px-5 font-semibold">Status Operasional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="py-3.5 px-5 font-medium text-neutral-900 dark:text-white">
                      API Gateway (BFF)
                    </td>
                    <td className="py-3.5 px-5 font-mono text-neutral-600 dark:text-neutral-300">
                      Bun v1.4.x
                    </td>
                    <td className="py-3.5 px-5 font-mono text-primary font-semibold">
                      :3000
                    </td>
                    <td className="py-3.5 px-5 text-neutral-500">
                      HTTP Reverse Proxy / Type Composer
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                        <span>&#x2713;</span> Siap Meneruskan
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="py-3.5 px-5 font-medium text-neutral-900 dark:text-white">
                      Auth Service
                    </td>
                    <td className="py-3.5 px-5 font-mono text-neutral-600 dark:text-neutral-300">
                      Bun v1.4.x
                    </td>
                    <td className="py-3.5 px-5 font-mono text-primary font-semibold">
                      :3001
                    </td>
                    <td className="py-3.5 px-5 text-neutral-500">
                      ElysiaJS + Drizzle ORM + JWT
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                        <span>&#x2713;</span> Database Sinkron
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30">
                    <td className="py-3.5 px-5 font-medium text-neutral-900 dark:text-white">
                      Web Frontend (Client)
                    </td>
                    <td className="py-3.5 px-5 font-mono text-neutral-600 dark:text-neutral-300">
                      Node.js v24.x
                    </td>
                    <td className="py-3.5 px-5 font-mono text-primary font-semibold">
                      :5173
                    </td>
                    <td className="py-3.5 px-5 text-neutral-500">
                      Vite + React 19 + TanStack Router
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                        <span>&#x2713;</span> Hot Module Replacement
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sesi Token & Keamanan Kontrak */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Identitas Sesi Aktif
                </h3>
                <span className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 font-mono text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase">
                  {user?.role}
                </span>
              </div>
              <div className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-neutral-50 dark:border-neutral-800">
                  <span className="text-neutral-500">Nama Operator</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">{user?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-50 dark:border-neutral-800">
                  <span className="text-neutral-500">Alamat Surel</span>
                  <span className="font-mono text-neutral-900 dark:text-white">{user?.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-50 dark:border-neutral-800">
                  <span className="text-neutral-500">Identifikasi Subyek</span>
                  <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400">{user?.id}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Klien RPC Terhubung</span>
                  <span className="font-mono text-emerald-600 font-semibold">Eden Treaty 1.2+</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    JWT Bearer Token
                  </h3>
                  <span className="text-[11px] text-neutral-400 font-mono">HS256 7d</span>
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-950 p-3 font-mono text-[11px] text-neutral-300 break-all max-h-24 overflow-y-auto">
                  {token}
                </div>
              </div>
              <p className="mt-3 text-[11px] text-neutral-500 leading-normal">
                &#x2713; Token ditransmisikan otomatis pada header <code className="font-mono text-neutral-700 dark:text-neutral-300">Authorization: Bearer</code> setiap pemanggilan API Gateway.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
