import { createRoute, redirect, useNavigate } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'

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

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6 md:p-12">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col justify-between gap-4 border-b border-neutral-200 pb-5 md:flex-row md:items-center">
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-neutral-500">
              Panel Pengendali
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Dasbor Microservices Srikaya
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200">
              &#x25CF; Terautentikasi (JWT Aktif)
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Keluar Sesi &#x2192;
            </Button>
          </div>
        </div>

        {/* User Profile Card */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-neutral-200 bg-white shadow-sm md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informasi Akun Operator</CardTitle>
              <CardDescription className="text-xs">
                Data sesi yang diterbitkan oleh AuthService melalui API Gateway.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-neutral-100 py-2">
                <span className="text-neutral-500">Nama Pengguna</span>
                <span className="font-semibold text-neutral-900">{user?.name || 'Administrator'}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100 py-2">
                <span className="text-neutral-500">Alamat Surel</span>
                <span className="font-mono text-neutral-900">{user?.email}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-100 py-2">
                <span className="text-neutral-500">Peran Sistem</span>
                <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs font-bold uppercase text-neutral-800">
                  {user?.role}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-neutral-500">ID Identitas</span>
                <span className="font-mono text-xs text-neutral-600">{user?.id}</span>
              </div>
            </CardContent>
          </Card>

          {/* Token Card */}
          <Card className="border-neutral-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">JWT Bearer Token</CardTitle>
              <CardDescription className="text-xs">
                Kunci otorisasi pada header HTTP untuk rute mikroservis tertutup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-36 overflow-x-auto rounded border border-neutral-200 bg-neutral-900 p-2.5 font-mono text-[10px] text-neutral-200 break-all">
                {token}
              </div>
              <p className="text-[11px] text-neutral-500">
                &#x2713; Terintegrasi otomatis ke setiap permintaan Eden Treaty via interceptor klien.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Microservices Topology Status */}
        <Card className="border-neutral-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Status Klaster Layanan</CardTitle>
            <CardDescription className="text-xs">
              Layanan yang terhubung melalui Gateway port 3000.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-neutral-200 p-3">
                <div className="text-xs text-neutral-500">API Gateway</div>
                <div className="mt-1 font-semibold text-neutral-900">Port 3000</div>
                <div className="mt-1 text-[11px] text-emerald-600">&#x2713; Siap Meneruskan Rute</div>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <div className="text-xs text-neutral-500">Auth Service</div>
                <div className="mt-1 font-semibold text-neutral-900">Port 3001</div>
                <div className="mt-1 text-[11px] text-emerald-600">&#x2713; Drizzle ORM Aktif</div>
              </div>
              <div className="rounded-lg border border-neutral-200 p-3">
                <div className="text-xs text-neutral-500">Frontend Client</div>
                <div className="mt-1 font-semibold text-neutral-900">Port 5173</div>
                <div className="mt-1 text-[11px] text-emerald-600">&#x2713; TanStack Router SPA</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
