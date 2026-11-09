import { spawn, type Subprocess } from 'bun'

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const appName = process.env.APP_NAME || 'Srikaya Enterprise'
const authPort = Number(process.env.AUTH_SERVICE_PORT || 3001)
const storagePort = Number(process.env.STORAGE_SERVICE_PORT || 3002)
const gatewayPort = Number(process.env.GATEWAY_PORT || 3000)
const clientPort = Number(process.env.CLIENT_PORT || 5173)

interface ServiceConfig {
  name: string
  port: number
  runtime: 'bun' | 'node'
  cmd: string[]
  cwd: string
  env?: Record<string, string>
}

const services: ServiceConfig[] = [
  {
    name: 'AUTH   ',
    port: authPort,
    runtime: 'bun',
    cmd: ['bun', '--watch', 'src/index.ts'],
    cwd: 'services/auth',
    env: {
      AUTH_SERVICE_PORT: String(authPort),
      PORT: String(authPort),
      APP_NAME: appName
    }
  },
  {
    name: 'STORAGE',
    port: storagePort,
    runtime: 'bun',
    cmd: ['bun', '--watch', 'src/index.ts'],
    cwd: 'services/storage',
    env: {
      STORAGE_SERVICE_PORT: String(storagePort),
      PORT: String(storagePort),
      APP_NAME: appName
    }
  },
  {
    name: 'GATEWAY',
    port: gatewayPort,
    runtime: 'bun',
    // Dijalankan dari folder services agar mikroservis yang di-mount gateway ikut terpantau --watch
    cmd: ['bun', '--watch', 'gateway/src/index.ts'],
    cwd: 'services',
    env: {
      GATEWAY_PORT: String(gatewayPort),
      PORT: String(gatewayPort),
      AUTH_SERVICE_PORT: String(authPort),
      AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || `http://localhost:${authPort}`,
      STORAGE_SERVICE_PORT: String(storagePort),
      STORAGE_SERVICE_URL: process.env.STORAGE_SERVICE_URL || `http://localhost:${storagePort}`,
      APP_NAME: appName
    }
  },
  {
    name: 'CLIENT ',
    port: clientPort,
    runtime: 'node',
    cmd: [npmCmd, 'run', 'dev'],
    cwd: 'apps/web',
    env: {
      CLIENT_PORT: String(clientPort),
      VITE_PORT: String(clientPort),
      PORT: String(clientPort),
      VITE_APP_NAME: process.env.VITE_APP_NAME || appName,
      VITE_API_URL: process.env.VITE_API_URL || `http://localhost:${gatewayPort}/api`
    }
  }
]

console.log('================================================================')
console.log(`  ${appName.toUpperCase()} MICROSERVICES ORCHESTRATOR`)
console.log(`  • Auth Service   : http://localhost:${authPort} (Runtime: Bun)`)
console.log(`  • API Gateway    : http://localhost:${gatewayPort}/api (Runtime: Bun)`)
console.log(`  • Client SPA     : http://localhost:${clientPort} (Runtime: Node.js)`)
console.log('================================================================\n')

const processes: Subprocess[] = []

async function pipeStream(readable: ReadableStream<Uint8Array> | null, prefix: string) {
  if (!readable) return
  const reader = readable.getReader()
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value).split('\n')
      for (const line of lines) {
        if (line.trim().length > 0) {
          console.log(`[${prefix}] ${line}`)
        }
      }
    }
  } catch {
    // Process stream closed
  }
}

for (const svc of services) {
  try {
    const proc = spawn(svc.cmd, {
      cwd: svc.cwd,
      env: {
        ...process.env,
        ...svc.env
      },
      stdout: 'pipe',
      stderr: 'pipe'
    })

    processes.push(proc)
    pipeStream(proc.stdout, `${svc.name} :${svc.port}`)
    pipeStream(proc.stderr, `${svc.name} :${svc.port}`)
  } catch (err) {
    console.error(`Gagal menjalankan ${svc.name}:`, err)
  }
}

// Penanganan penghentian proses (SIGINT / CTRL+C)
function cleanup() {
  console.log('\n[ORCHESTRATOR] Menghentikan seluruh proses mikroservis...')
  for (const proc of processes) {
    try {
      if (process.platform === 'win32' && proc.pid) {
        spawn(['taskkill', '/F', '/T', '/PID', String(proc.pid)])
      } else {
        proc.kill()
      }
    } catch {
      // Ignored
    }
  }
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
