import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.VITE_PORT || env.CLIENT_PORT || 5173)
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000/api'
  const apiOrigin = new URL(apiUrl).origin

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts')
      }
    },
    server: {
      port,
      proxy: {
        '/api': {
          target: apiOrigin,
          changeOrigin: true
        }
      }
    }
  }
})
