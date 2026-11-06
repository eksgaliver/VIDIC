import * as React from 'react'
import { createRoute, useNavigate } from '@tanstack/react-router'
import { rootRoute } from './__root'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

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

  // Jika sudah terautentikasi, alihkan langsung ke dashboard
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
      setErrorMsg('Gagal terhubung ke gateway autentikasi')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="text-xs font-semibold tracking-widest uppercase text-neutral-500">
            Platform Terpadu Srikaya
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
            Masuk ke Layanan
          </h1>
        </div>

        <Card className="border-neutral-200 shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Kredensial Akun</CardTitle>
            <CardDescription className="text-xs">
              Masukkan surel dan kata sandi untuk mengakses dasbor mikroservis.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMsg && (
                <div
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                >
                  <span className="font-semibold">&#x2715; Kesalahan:</span> {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Alamat Surel</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.id"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Kata Sandi</Label>
                  <span className="text-xs text-neutral-400">Min. 6 karakter</span>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="rounded-md bg-neutral-100 p-2.5 text-[11px] text-neutral-600">
                <div className="font-semibold text-neutral-800">&#x25CF; Akun Demo Otomatis:</div>
                <div className="mt-0.5">Surel: <span className="font-mono text-neutral-900">admin@srikaya.id</span></div>
                <div>Kata Sandi: <span className="font-mono text-neutral-900">rahasia123</span></div>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Memverifikasi...' : 'Masuk Sekarang \u2192'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Srikaya &middot; Bun &middot; ElysiaJS &middot; React 19 &middot; Drizzle ORM
        </p>
      </div>
    </div>
  )
}
