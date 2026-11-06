import { spawn, type Subprocess } from 'bun'

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'

interface ServiceConfig {
  name: string
  port: number
  runtime: 'bun' | 'node'
  cmd: string[]
  cwd: string
}

const services: ServiceConfig[] = [
  {
    name: 'AUTH   ',
    port: 3001,
    runtime: 'bun',
    cmd: ['bun', 'run', 'src/index.ts'],
    cwd: 'services/auth'
  },
  {
    name: 'GATEWAY',
    port: 3000,
    runtime: 'bun',
    cmd: ['bun', 'run', 'src/index.ts'],
    cwd: 'services/gateway'
  },
  {
    name: 'CLIENT ',
    port: 5173,
    runtime: 'node',
    cmd: [npmCmd, 'run', 'dev'],
    cwd: 'apps/web'
  }
]

console.log('================================================================')
console.log('  SRIKAYA MICROSERVICES ORCHESTRATOR')
console.log('  • Auth Service   : http://localhost:3001 (Runtime: Bun)')
console.log('  • API Gateway    : http://localhost:3000/api (Runtime: Bun)')
console.log('  • Client SPA     : http://localhost:5173 (Runtime: Node.js)')
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
        PORT: String(svc.port)
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
      proc.kill()
    } catch {
      // Ignored
    }
  }
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

