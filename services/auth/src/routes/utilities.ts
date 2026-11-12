import { Elysia, t } from 'elysia'

// Proxy endpoint untuk API eksternal — agar web client tidak melakukan fetch langsung keluar gateway
export const utilitiesRoutes = new Elysia({ prefix: '/utilities' })

  // Proxy: Data hari libur nasional Indonesia
  // Sumber: tanggalmerah.upset.dev — diproksikan agar frontend tidak hit external API
  .get('/holidays', async ({ query, set }) => {
    const year = query.year || new Date().getFullYear().toString()
    try {
      const res = await fetch(`https://tanggalmerah.upset.dev/api/holidays?year=${year}`, {
        headers: {
          'User-Agent': 'VIDIC-Gateway/1.0',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(8000)
      })
      if (!res.ok) {
        set.status = res.status
        return { success: false, message: `Upstream error: HTTP ${res.status}` }
      }
      const data = await res.json()
      set.headers['Cache-Control'] = 'public, max-age=86400' // cache 24 jam
      return data
    } catch (err) {
      set.status = 502
      return { success: false, message: 'Gagal mengambil data hari libur dari upstream.' }
    }
  }, {
    query: t.Object({
      year: t.Optional(t.String())
    })
  })

  // Proxy: Reverse geocoding (koordinat → alamat) via Nominatim/OpenStreetMap
  .get('/geocode/reverse', async ({ query, set }) => {
    const { lat, lon } = query
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'VIDIC-Gateway/1.0 (kontak@srikaya.id)',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(8000)
        }
      )
      if (!res.ok) {
        set.status = res.status
        return { success: false, message: `Upstream error: HTTP ${res.status}` }
      }
      const data = await res.json()
      set.headers['Cache-Control'] = 'public, max-age=300' // cache 5 menit
      return data
    } catch (err) {
      set.status = 502
      return { success: false, message: 'Gagal melakukan reverse geocoding.' }
    }
  }, {
    query: t.Object({
      lat: t.String(),
      lon: t.String()
    })
  })

  // Proxy: Forward geocoding (teks → koordinat) via Nominatim/OpenStreetMap
  .get('/geocode/search', async ({ query, set }) => {
    const q = encodeURIComponent(`${query.q.trim()}, Indonesia`)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&countrycodes=id&limit=${query.limit || '5'}`,
        {
          headers: {
            'User-Agent': 'VIDIC-Gateway/1.0 (kontak@srikaya.id)',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(8000)
        }
      )
      if (!res.ok) {
        set.status = res.status
        return { success: false, message: `Upstream error: HTTP ${res.status}` }
      }
      const data = await res.json()
      set.headers['Cache-Control'] = 'public, max-age=300'
      return data
    } catch (err) {
      set.status = 502
      return { success: false, message: 'Gagal melakukan forward geocoding.' }
    }
  }, {
    query: t.Object({
      q: t.String(),
      limit: t.Optional(t.String())
    })
  })

