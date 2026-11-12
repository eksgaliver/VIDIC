import * as React from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  HiOutlineLocationMarker,
  HiOutlineSearch,
  HiOutlineCheckCircle,
} from 'react-icons/hi'
import { Button } from '@/components/base'

// Base URL gateway — semua request eksternal diproksikan melalui backend
const getBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_URL
  if (configured) {
    try { return new URL(configured).origin } catch { /* ignore */ }
  }
  return window.location.origin
}

export type MapTypeOption = 'roadmap' | 'satellite' | 'osm'
export type GeofenceMode = 'point' | 'polygon'

export interface ResolvedGeocoding {
  fullAddress: string
  road?: string
  city?: string
  province?: string
  postalCode?: string
  latitude: number
  longitude: number
}

// Marker Pin Merah Khas Google Maps berbasis Leaflet DivIcon
const createGoogleMapsPin = () => {
  return L.divIcon({
    className: 'custom-google-maps-pin',
    html: `
      <div style="width: 32px; height: 42px; cursor: grab; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.45));">
        <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.16344 0 0 7.16344 0 16C0 27.5 14.5 39.8 15.1 40.4C15.4 40.7 15.7 40.9 16 40.9C16.3 40.9 16.6 40.7 16.9 40.4C17.5 39.8 32 27.5 32 16C32 7.16344 24.8366 0 16 0Z" fill="#EA4335"/>
          <path d="M16 1C7.71573 1 1 7.71573 1 16C1 26.5 15.2 38.5 15.7 39.1C15.8 39.2 15.9 39.3 16 39.3C16.1 39.3 16.2 39.2 16.3 39.1C16.8 38.5 31 26.5 31 16C31 7.71573 24.2843 1 16 1Z" stroke="#B31412" stroke-width="0.8"/>
          <circle cx="16" cy="15.5" r="5.5" fill="#FFFFFF"/>
        </svg>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  })
}

// Titik Sudut Handle Poligon
const createVertexHandleIcon = (index: number) => {
  return L.divIcon({
    className: 'custom-vertex-handle',
    html: `
      <div style="width: 14px; height: 14px; background: #ffffff; border: 2.5px solid #1a73e8; border-radius: 50%; box-shadow: 0 1px 4px rgba(0,0,0,0.4); cursor: move; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 8px; font-weight: bold; color: #1a73e8; line-height: 1;">${index + 1}</span>
      </div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

// Lapisan Ubin Peta Google Maps & OSM Fallback
const getTileLayer = (type: MapTypeOption): L.TileLayer => {
  if (type === 'roadmap') {
    return L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&hl=id&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      attribution: '&copy; Google Maps',
    })
  }

  if (type === 'satellite') {
    return L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&hl=id&x={x}&y={y}&z={z}', {
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
      attribution: '&copy; Citra Satelit & Data Peta Google',
    })
  }

  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> kontributor',
  })
}

// Hitung Estimasi Luas Poligon dalam Meter Persegi (Formula Shoelace Geodesik Sederhana)
function calculatePolygonAreaMeters(coords: [number, number][]): number {
  if (coords.length < 3) return 0
  const R = 6378137
  let area = 0
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length
    const [lat1, lng1] = coords[i]
    const [lat2, lng2] = coords[j]
    const x1 = ((lng1 * Math.PI) / 180) * R * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180))
    const y1 = ((lat1 * Math.PI) / 180) * R
    const x2 = ((lng2 * Math.PI) / 180) * R * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180))
    const y2 = ((lat2 * Math.PI) / 180) * R
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(Math.round(area / 2))
}

export interface LeafletMapPickerProps {
  latitude: number
  longitude: number
  radiusMeters: number
  polygon?: [number, number][]
  mode?: GeofenceMode
  cityName?: string
  provinceName?: string
  onChange: (coords: {
    latitude: number
    longitude: number
    radiusMeters: number
    coordinatesType: GeofenceMode
    polygonCoordinates: [number, number][]
  }) => void
  onAddressSelect?: (address: ResolvedGeocoding) => void
  readOnly?: boolean
  className?: string
  height?: string | number
  initialMapType?: MapTypeOption
}

export function LeafletMapPicker({
  latitude,
  longitude,
  radiusMeters,
  polygon = [],
  mode = 'point',
  cityName,
  provinceName,
  onChange,
  onAddressSelect,
  readOnly = false,
  className = '',
  height = 370,
  initialMapType = 'roadmap',
}: LeafletMapPickerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mapRef = React.useRef<L.Map | null>(null)
  const markerRef = React.useRef<L.Marker | null>(null)
  const circleRef = React.useRef<L.Circle | null>(null)
  const polygonLayerRef = React.useRef<L.Polygon | null>(null)
  const vertexMarkersRef = React.useRef<L.Marker[]>([])
  const tileLayerRef = React.useRef<L.TileLayer | null>(null)

  const [currentMode, setCurrentMode] = React.useState<GeofenceMode>(mode)
  const [currentPolygon, setCurrentPolygon] = React.useState<[number, number][]>(polygon)
  const [mapType, setMapType] = React.useState<MapTypeOption>(initialMapType)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isLocating, setIsLocating] = React.useState(false)
  const [isResolvingAddress, setIsResolvingAddress] = React.useState(false)
  const [lastResolvedAddress, setLastResolvedAddress] = React.useState<ResolvedGeocoding | null>(null)

  const currentModeRef = React.useRef<GeofenceMode>(mode)
  currentModeRef.current = currentMode

  const currentPolygonRef = React.useRef<[number, number][]>(polygon)
  currentPolygonRef.current = currentPolygon

  const radiusMetersRef = React.useRef<number>(radiusMeters)
  radiusMetersRef.current = radiusMeters

  const latitudeRef = React.useRef<number>(latitude)
  latitudeRef.current = latitude

  const longitudeRef = React.useRef<number>(longitude)
  longitudeRef.current = longitude

  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  // Sinkronisasi mode dari prop luar
  React.useEffect(() => {
    setCurrentMode(mode)
    currentModeRef.current = mode
  }, [mode])

  // Sinkronisasi polygon dari prop luar
  React.useEffect(() => {
    setCurrentPolygon(polygon || [])
    currentPolygonRef.current = polygon || []
  }, [polygon])

  // Reverse Geocoding Otomatis ke Alamat Fisik Lengkap
  const resolveAddressFromCoords = React.useCallback(
    async (lat: number, lng: number) => {
      setIsResolvingAddress(true)
      try {
        const res = await fetch(
          `${getBaseUrl()}/api/utilities/geocode/reverse?lat=${lat}&lon=${lng}`
        )
        if (!res.ok) throw new Error('Geocoding request failed')
        const data = await res.json()
        const addr = data.address || {}

        const fullAddress = data.display_name || `Koordinat (${lat.toFixed(6)}, ${lng.toFixed(6)})`
        const road = addr.road || addr.street || addr.pedestrian || addr.residential || ''
        const city =
          addr.city ||
          addr.town ||
          addr.city_district ||
          addr.municipality ||
          addr.county ||
          ''
        const province = addr.state || addr.region || ''
        const postalCode = addr.postcode || ''

        const resolved: ResolvedGeocoding = {
          fullAddress,
          road,
          city,
          province,
          postalCode,
          latitude: lat,
          longitude: lng,
        }

        setLastResolvedAddress(resolved)

        // Beri tahu formulir induk agar otomatis terisi
        if (onAddressSelect) {
          onAddressSelect(resolved)
        }
      } catch {
        // Abaikan jika jaringan gagal, biarkan koordinat tetap terpilih
      } finally {
        setIsResolvingAddress(false)
      }
    },
    [onAddressSelect]
  )

  const resolveAddressRef = React.useRef(resolveAddressFromCoords)
  resolveAddressRef.current = resolveAddressFromCoords

  // Render Ulang Layer Poligon & Handle Sudut
  const updatePolygonLayers = React.useCallback(
    (coords: [number, number][], map: L.Map, activeMode: GeofenceMode = currentModeRef.current) => {
      // Hapus layer poligon lama jika ada
      if (polygonLayerRef.current) {
        map.removeLayer(polygonLayerRef.current)
        polygonLayerRef.current = null
      }

      // Bersihkan marker titik sudut lama
      vertexMarkersRef.current.forEach((m) => map.removeLayer(m))
      vertexMarkersRef.current = []

      // Jika bukan mode polygon atau koordinat kurang dari 2 titik, jangan buat poligon
      if (activeMode !== 'polygon' || coords.length < 2) return

      // Buat Layer Poligon Baru Bergaya Google Maps (Biru #1a73e8 dengan Fill Opacity)
      const poly = L.polygon(coords, {
        color: '#1a73e8',
        weight: 2.5,
        opacity: 0.9,
        fillColor: '#1a73e8',
        fillOpacity: 0.22,
        interactive: false, // Tidak memblokir klik pada kanvas peta
      }).addTo(map)

      polygonLayerRef.current = poly

      // Buat Drag Handle pada Setiap Titik Sudut
      if (!readOnly && activeMode === 'polygon') {
        const markers: L.Marker[] = []
        coords.forEach((point, idx) => {
          const vMarker = L.marker(point, {
            icon: createVertexHandleIcon(idx),
            draggable: true,
          }).addTo(map)

          vMarker.on('drag', () => {
            const newPos = vMarker.getLatLng()
            const updated = [...coords]
            updated[idx] = [Number(newPos.lat.toFixed(7)), Number(newPos.lng.toFixed(7))]
            poly.setLatLngs(updated)
          })

          vMarker.on('dragend', () => {
            const newPos = vMarker.getLatLng()
            const updated = [...coords]
            updated[idx] = [Number(newPos.lat.toFixed(7)), Number(newPos.lng.toFixed(7))]
            setCurrentPolygon(updated)
            currentPolygonRef.current = updated
            onChangeRef.current({
              latitude: latitudeRef.current,
              longitude: longitudeRef.current,
              radiusMeters: radiusMetersRef.current,
              coordinatesType: 'polygon',
              polygonCoordinates: updated,
            })
            resolveAddressRef.current(newPos.lat, newPos.lng)
          })

          markers.push(vMarker)
        })
        vertexMarkersRef.current = markers
      }
    },
    [readOnly]
  )

  // Inisialisasi Peta Leaflet Utama
  React.useEffect(() => {
    if (!containerRef.current) return

    if ((containerRef.current as unknown as { _leaflet_id?: number })._leaflet_id) {
      delete (containerRef.current as unknown as { _leaflet_id?: number })._leaflet_id
    }
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const initialLat = Number.isFinite(latitude) && latitude !== 0 ? latitude : -6.2088
    const initialLng = Number.isFinite(longitude) && longitude !== 0 ? longitude : 106.8456

    const map = L.map(containerRef.current, {
      center: [initialLat, initialLng],
      zoom: 16,
      zoomControl: false,
    })

    // Pasang lapisan ubin awal
    const tileLayer = getTileLayer(mapType)
    tileLayer.addTo(map)
    tileLayerRef.current = tileLayer

    // Pin Penanda Google Maps
    const pinIcon = createGoogleMapsPin()
    const marker = L.marker([initialLat, initialLng], {
      icon: pinIcon,
      draggable: !readOnly,
      autoPan: true,
    }).addTo(map)

    // Lingkaran Batas Geofence Presensi (Warna Biru Google)
    const circle = L.circle([initialLat, initialLng], {
      radius: radiusMeters,
      color: '#1a73e8',
      weight: 2,
      opacity: 0.9,
      fillColor: '#1a73e8',
      fillOpacity: 0.16,
      interactive: false, // WAJIB false: agar tidak memblokir event klik pada permukaan peta!
    }).addTo(map)

    // Handler Interaksi Geser Penanda (Point Mode)
    if (!readOnly) {
      marker.on('drag', () => {
        const pos = marker.getLatLng()
        circle.setLatLng(pos)
      })

      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        circle.setLatLng(pos)
        const lat = Number(pos.lat.toFixed(7))
        const lng = Number(pos.lng.toFixed(7))
        latitudeRef.current = lat
        longitudeRef.current = lng
        onChangeRef.current({
          latitude: lat,
          longitude: lng,
          radiusMeters: radiusMetersRef.current,
          coordinatesType: currentModeRef.current,
          polygonCoordinates: currentModeRef.current === 'point' ? [] : currentPolygonRef.current,
        })
        resolveAddressRef.current(lat, lng)
      })

      // Handler Klik Permukaan Peta
      map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = Number(e.latlng.lat.toFixed(7))
        const lng = Number(e.latlng.lng.toFixed(7))
        const activeMode = currentModeRef.current
        const activeRadius = radiusMetersRef.current

        if (activeMode === 'point') {
          // Bersihkan sisa poligon jika ada
          if (polygonLayerRef.current && mapRef.current) {
            mapRef.current.removeLayer(polygonLayerRef.current)
            polygonLayerRef.current = null
          }
          vertexMarkersRef.current.forEach((m) => mapRef.current?.removeLayer(m))
          vertexMarkersRef.current = []

          // Pindahkan Titik & Radius secara instan ke koordinat yang diklik
          marker.setLatLng([lat, lng])
          circle.setLatLng([lat, lng])
          latitudeRef.current = lat
          longitudeRef.current = lng

          onChangeRef.current({
            latitude: lat,
            longitude: lng,
            radiusMeters: activeRadius,
            coordinatesType: 'point',
            polygonCoordinates: [],
          })
          resolveAddressRef.current(lat, lng)
        } else {
          // Mode Poligon: Tambahkan Titik Sudut ke Poligon
          const nextPoly: [number, number][] = [...currentPolygonRef.current, [lat, lng]]
          setCurrentPolygon(nextPoly)
          currentPolygonRef.current = nextPoly
          if (mapRef.current) {
            updatePolygonLayers(nextPoly, mapRef.current, 'polygon')
          }
          onChangeRef.current({
            latitude: latitudeRef.current,
            longitude: longitudeRef.current,
            radiusMeters: activeRadius,
            coordinatesType: 'polygon',
            polygonCoordinates: nextPoly,
          })
          resolveAddressRef.current(lat, lng)
        }
      })
    }

    mapRef.current = map
    markerRef.current = marker
    circleRef.current = circle

    // Render poligon awal HANYA JIKA dalam mode poligon
    if (mode === 'polygon' && currentPolygon.length > 0) {
      updatePolygonLayers(currentPolygon, map, 'polygon')
    }

    // Pantau perubahan ukuran kontainer secara dinamis
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize()
      }
    })
    resizeObserver.observe(containerRef.current)

    const timers = [
      setTimeout(() => map.invalidateSize(), 60),
      setTimeout(() => map.invalidateSize(), 200),
      setTimeout(() => map.invalidateSize(), 500),
    ]

    return () => {
      timers.forEach(clearTimeout)
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      markerRef.current = null
      circleRef.current = null
      polygonLayerRef.current = null
      tileLayerRef.current = null
      vertexMarkersRef.current = []
    }
  }, [])

  // Ganti Lapisan Ubin saat Jenis Peta Berubah
  React.useEffect(() => {
    if (!mapRef.current) return

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current)
    }

    const newLayer = getTileLayer(mapType)
    newLayer.addTo(mapRef.current)
    newLayer.bringToBack()
    tileLayerRef.current = newLayer
  }, [mapType])

  // Sinkronisasi Lapisan saat Mode Geofence Berubah (Point / Polygon)
  React.useEffect(() => {
    if (!mapRef.current || !circleRef.current || !markerRef.current) return

    if (currentMode === 'point') {
      circleRef.current.setStyle({ opacity: 0.9, fillOpacity: 0.16 })
      // Hapus total layer poligon dan titik sudut dari kanvas peta
      if (polygonLayerRef.current) {
        mapRef.current.removeLayer(polygonLayerRef.current)
        polygonLayerRef.current = null
      }
      vertexMarkersRef.current.forEach((m) => mapRef.current?.removeLayer(m))
      vertexMarkersRef.current = []
    } else {
      circleRef.current.setStyle({ opacity: 0.2, fillOpacity: 0.04 })
      updatePolygonLayers(currentPolygon, mapRef.current, 'polygon')
    }
  }, [currentMode, currentPolygon, updatePolygonLayers])

  // Sinkronisasi posisi koordinat dari luar
  React.useEffect(() => {
    if (!mapRef.current || !markerRef.current || !circleRef.current) return

    const currentPos = markerRef.current.getLatLng()
    const posChanged =
      Math.abs(currentPos.lat - latitude) > 0.00001 ||
      Math.abs(currentPos.lng - longitude) > 0.00001

    if (posChanged) {
      markerRef.current.setLatLng([latitude, longitude])
      circleRef.current.setLatLng([latitude, longitude])
      mapRef.current.setView([latitude, longitude], mapRef.current.getZoom())
    }

    circleRef.current.setRadius(radiusMeters)
  }, [latitude, longitude, radiusMeters])

  // Beralih Kembali ke Mode Pointer (Titik & Radius) dan Hapus Poligon
  const handleSwitchToPoint = React.useCallback(() => {
    setCurrentMode('point')
    currentModeRef.current = 'point'
    setCurrentPolygon([])
    currentPolygonRef.current = []
    if (mapRef.current) {
      if (polygonLayerRef.current) {
        mapRef.current.removeLayer(polygonLayerRef.current)
        polygonLayerRef.current = null
      }
      vertexMarkersRef.current.forEach((m) => mapRef.current?.removeLayer(m))
      vertexMarkersRef.current = []
      if (circleRef.current) {
        circleRef.current.setStyle({ opacity: 0.9, fillOpacity: 0.16 })
      }
    }
    onChangeRef.current({
      latitude: latitudeRef.current,
      longitude: longitudeRef.current,
      radiusMeters: radiusMetersRef.current,
      coordinatesType: 'point',
      polygonCoordinates: [],
    })
  }, [])

  // Beralih ke Mode Poligon (Area Bidang)
  const handleSwitchToPolygon = React.useCallback(() => {
    setCurrentMode('polygon')
    currentModeRef.current = 'polygon'
    if (circleRef.current) {
      circleRef.current.setStyle({ opacity: 0.2, fillOpacity: 0.04 })
    }
    const currentCoords = currentPolygonRef.current
    if (currentCoords.length === 0) {
      const lat = latitudeRef.current
      const lng = longitudeRef.current
      const rad = radiusMetersRef.current
      const latDelta = (rad / 111320) * 0.9
      const lngDelta = (rad / (111320 * Math.cos((lat * Math.PI) / 180))) * 0.9

      const rect: [number, number][] = [
        [Number((lat + latDelta).toFixed(7)), Number((lng - lngDelta).toFixed(7))],
        [Number((lat + latDelta).toFixed(7)), Number((lng + lngDelta).toFixed(7))],
        [Number((lat - latDelta).toFixed(7)), Number((lng + lngDelta).toFixed(7))],
        [Number((lat - latDelta).toFixed(7)), Number((lng - lngDelta).toFixed(7))],
      ]

      setCurrentPolygon(rect)
      currentPolygonRef.current = rect
      if (mapRef.current) {
        updatePolygonLayers(rect, mapRef.current, 'polygon')
      }
      onChangeRef.current({
        latitude: lat,
        longitude: lng,
        radiusMeters: rad,
        coordinatesType: 'polygon',
        polygonCoordinates: rect,
      })
    } else {
      if (mapRef.current) {
        updatePolygonLayers(currentCoords, mapRef.current, 'polygon')
      }
      onChangeRef.current({
        latitude: latitudeRef.current,
        longitude: longitudeRef.current,
        radiusMeters: radiusMetersRef.current,
        coordinatesType: 'polygon',
        polygonCoordinates: currentCoords,
      })
    }
  }, [updatePolygonLayers])

  // Buat Bentuk Poligon Persegi Otomatis di Sekitar Titik Pusat
  const handleGenerateDefaultPolygon = () => {
    if (!mapRef.current) return
    const lat = latitudeRef.current
    const lng = longitudeRef.current
    const rad = radiusMetersRef.current
    const latDelta = (rad / 111320) * 0.9
    const lngDelta = (rad / (111320 * Math.cos((lat * Math.PI) / 180))) * 0.9

    const rect: [number, number][] = [
      [Number((lat + latDelta).toFixed(7)), Number((lng - lngDelta).toFixed(7))],
      [Number((lat + latDelta).toFixed(7)), Number((lng + lngDelta).toFixed(7))],
      [Number((lat - latDelta).toFixed(7)), Number((lng + lngDelta).toFixed(7))],
      [Number((lat - latDelta).toFixed(7)), Number((lng - lngDelta).toFixed(7))],
    ]

    setCurrentPolygon(rect)
    currentPolygonRef.current = rect
    updatePolygonLayers(rect, mapRef.current, 'polygon')
    onChangeRef.current({
      latitude: lat,
      longitude: lng,
      radiusMeters: rad,
      coordinatesType: 'polygon',
      polygonCoordinates: rect,
    })
  }

  // Hapus Titik Sudut Terakhir
  const handleRemoveLastPoint = () => {
    if (!mapRef.current || currentPolygonRef.current.length === 0) return
    const nextPoly = currentPolygonRef.current.slice(0, -1)
    setCurrentPolygon(nextPoly)
    currentPolygonRef.current = nextPoly
    updatePolygonLayers(nextPoly, mapRef.current, 'polygon')
    onChangeRef.current({
      latitude: latitudeRef.current,
      longitude: longitudeRef.current,
      radiusMeters: radiusMetersRef.current,
      coordinatesType: 'polygon',
      polygonCoordinates: nextPoly,
    })
  }

  // Bersihkan Seluruh Poligon
  const handleClearPolygon = () => {
    if (!mapRef.current) return
    setCurrentPolygon([])
    currentPolygonRef.current = []
    updatePolygonLayers([], mapRef.current, 'polygon')
    onChangeRef.current({
      latitude: latitudeRef.current,
      longitude: longitudeRef.current,
      radiusMeters: radiusMetersRef.current,
      coordinatesType: 'polygon',
      polygonCoordinates: [],
    })
  }

  // Deteksi Lokasi Terkini via GPS
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Perangkat Anda tidak mendukung fitur geolokasi GPS.')
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const lat = Number(pos.coords.latitude.toFixed(7))
        const lng = Number(pos.coords.longitude.toFixed(7))
        latitudeRef.current = lat
        longitudeRef.current = lng
        if (mapRef.current && markerRef.current && circleRef.current) {
          mapRef.current.flyTo([lat, lng], 16, { duration: 1.2 })
          markerRef.current.setLatLng([lat, lng])
          circleRef.current.setLatLng([lat, lng])
          onChangeRef.current({
            latitude: lat,
            longitude: lng,
            radiusMeters: radiusMetersRef.current,
            coordinatesType: currentModeRef.current,
            polygonCoordinates: currentPolygonRef.current,
          })
          resolveAddressRef.current(lat, lng)
        }
      },
      () => {
        setIsLocating(false)
        alert('Izin lokasi ditolak atau sinyal GPS tidak tersedia.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Pusatkan Peta ke Titik Penanda
  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo([latitudeRef.current, longitudeRef.current], 16, { duration: 0.8 })
    }
  }

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn()
  }

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut()
  }

  // Pencarian Lokasi
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    try {
      const res = await fetch(
        `${getBaseUrl()}/api/utilities/geocode/search?q=${encodeURIComponent(searchQuery.trim())}&limit=1`
      )
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0]
        const lat = Number(parseFloat(item.lat).toFixed(7))
        const lng = Number(parseFloat(item.lon).toFixed(7))
        latitudeRef.current = lat
        longitudeRef.current = lng
        if (mapRef.current && markerRef.current && circleRef.current) {
          mapRef.current.flyTo([lat, lng], 16, { duration: 1.2 })
          markerRef.current.setLatLng([lat, lng])
          circleRef.current.setLatLng([lat, lng])
          onChangeRef.current({
            latitude: lat,
            longitude: lng,
            radiusMeters: radiusMetersRef.current,
            coordinatesType: currentModeRef.current,
            polygonCoordinates: currentPolygonRef.current,
          })
          resolveAddressRef.current(lat, lng)
        }
      } else {
        alert(`Lokasi "${searchQuery}" tidak ditemukan di Indonesia.`)
      }
    } catch {
      // Abaikan jika jaringan gagal
    }
  }

  const polygonArea = calculatePolygonAreaMeters(currentPolygon)
  const containerHeightStyle = typeof height === 'number' ? `${height}px` : height

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Baris Pencarian & Tindakan Cepat */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Form Pencarian Alamat */}
          <form onSubmit={handleSearch} className="flex min-w-0 flex-1 items-center gap-1.5">
            <div className="relative flex-1">
              <HiOutlineSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari gedung, jalan, atau kawasan di Indonesia..."
                className="h-8.5 w-full rounded-control border border-line bg-surface pl-8 pr-2.5 text-xs text-ink placeholder:text-ink-3 focus:border-[#1a73e8]"
              />
            </div>
            <Button type="submit" size="sm" tone="neutral">
              Cari
            </Button>
          </form>

          {/* Tombol GPS & Pusatkan */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              tone="neutral"
              onClick={handleCurrentLocation}
              disabled={isLocating}
              title="Posisikan ke lokasi GPS saya saat ini"
            >
              {isLocating ? 'Mendeteksi...' : 'Lokasi Saya (GPS)'}
            </Button>
            <Button
              type="button"
              size="sm"
              tone="neutral"
              onClick={handleRecenter}
              title="Pusatkan kamera peta ke pin penanda"
            >
              Pusatkan
            </Button>
          </div>
        </div>
      )}

      {/* Kontainer Kanvas Peta Leaflet dengan Gaya Google Maps */}
      <div
        className="relative overflow-hidden rounded-control border border-line shadow-inner"
        style={{ height: containerHeightStyle, minHeight: containerHeightStyle }}
      >
        <div
          ref={containerRef}
          className="h-full w-full"
          style={{ height: '100%', minHeight: containerHeightStyle, zIndex: 1 }}
        />

        {/* Header Kontrol Mengambang Kiri Atas: Pengalih Mode Geofence & Jenis Peta */}
        <div className="absolute left-3 top-3 z-[1000] flex flex-wrap items-center gap-2">
          {/* Pemilih Mode: Pointer (Point) vs Perimeter (Polygon) */}
          {!readOnly && (
            <div className="flex items-center overflow-hidden rounded-md border border-[#dadce0] bg-white text-xs font-semibold shadow-[0_1px_4px_rgba(0,0,0,0.22)]">
              <button
                type="button"
                onClick={handleSwitchToPoint}
                className={`px-3 py-1.5 transition-colors ${
                  currentMode === 'point'
                    ? 'bg-[#1a73e8] font-bold text-white'
                    : 'text-[#3c4043] hover:bg-[#f1f3f4]'
                }`}
              >
                Pointer (Titik & Radius)
              </button>
              <button
                type="button"
                onClick={handleSwitchToPolygon}
                className={`border-l border-[#dadce0] px-3 py-1.5 transition-colors ${
                  currentMode === 'polygon'
                    ? 'bg-[#1a73e8] font-bold text-white'
                    : 'text-[#3c4043] hover:bg-[#f1f3f4]'
                }`}
              >
                Poligon (Area Bidang)
              </button>
            </div>
          )}

          {/* Pengalih Tipe Peta (Peta | Satelit | OSM) */}
          <div className="flex items-center overflow-hidden rounded-md border border-[#dadce0] bg-white text-xs font-medium shadow-[0_1px_4px_rgba(0,0,0,0.22)]">
            <button
              type="button"
              onClick={() => setMapType('roadmap')}
              className={`px-2.5 py-1.5 transition-colors ${
                mapType === 'roadmap'
                  ? 'bg-[#1a73e8] font-bold text-white'
                  : 'text-[#3c4043] hover:bg-[#f1f3f4]'
              }`}
            >
              Peta
            </button>
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`border-l border-[#dadce0] px-2.5 py-1.5 transition-colors ${
                mapType === 'satellite'
                  ? 'bg-[#1a73e8] font-bold text-white'
                  : 'text-[#3c4043] hover:bg-[#f1f3f4]'
              }`}
            >
              Satelit
            </button>
            <button
              type="button"
              onClick={() => setMapType('osm')}
              className={`border-l border-[#dadce0] px-2 py-1.5 transition-colors ${
                mapType === 'osm'
                  ? 'bg-[#1a73e8] font-bold text-white'
                  : 'text-[#70757a] hover:bg-[#f1f3f4]'
              }`}
              title="OpenStreetMap"
            >
              OSM
            </button>
          </div>
        </div>

        {/* Toolbar Operasi Poligon (Muncul saat Mode Poligon Aktif) */}
        {!readOnly && currentMode === 'polygon' && (
          <div className="absolute left-3 top-13 z-[1000] flex flex-wrap items-center gap-1.5 rounded-md border border-[#dadce0] bg-white/95 p-1.5 text-2xs font-medium text-ink shadow-md backdrop-blur-sm">
            <button
              type="button"
              onClick={handleSwitchToPoint}
              className="inline-flex items-center gap-1 rounded bg-[#e8f0fe] px-2 py-0.5 font-bold text-[#1a73e8] hover:bg-[#d2e3fc] transition-colors"
              title="Kembali ke mode pointer dan hilangkan area poligon"
            >
              ← Kembali ke Pointer
            </button>
            <span className="h-3 w-px bg-line" />
            <button
              type="button"
              onClick={handleGenerateDefaultPolygon}
              className="rounded bg-[#f1f3f4] px-2 py-0.5 font-semibold text-[#1a73e8] hover:bg-[#e8f0fe] transition-colors"
            >
              Persegi Default
            </button>
            {currentPolygon.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleRemoveLastPoint}
                  className="rounded bg-[#f1f3f4] px-2 py-0.5 text-ink-2 hover:bg-surface-3 transition-colors"
                >
                  Hapus Titik
                </button>
                <button
                  type="button"
                  onClick={handleClearPolygon}
                  className="rounded bg-[#fce8e6] px-2 py-0.5 text-[#d93025] hover:bg-[#fad2cf] transition-colors"
                >
                  Reset
                </button>
              </>
            )}
            <span className="border-l border-line pl-2 font-mono text-2xs text-ink-2">
              {currentPolygon.length} sudut · {polygonArea.toLocaleString('id-ID')} m²
            </span>
          </div>
        )}

        {/* Kontrol Mengambang Google Maps di Kanan Bawah: GPS, Pusatkan, & Zoom */}
        <div className="absolute bottom-3 right-3 z-[1000] flex flex-col items-center gap-2">
          {!readOnly && (
            <div className="flex flex-col overflow-hidden rounded-md border border-[#dadce0] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]">
              <button
                type="button"
                onClick={handleCurrentLocation}
                disabled={isLocating}
                title="Posisikan ke lokasi GPS saya"
                className="flex h-8 w-8 items-center justify-center text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1a73e8] transition-colors disabled:opacity-50"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="8" />
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                  <line x1="12" y1="2" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="5" y2="12" />
                  <line x1="19" y1="12" x2="22" y2="12" />
                </svg>
              </button>
              <div className="h-px w-full bg-[#dadce0]" />
              <button
                type="button"
                onClick={handleRecenter}
                title="Pusatkan peta ke pin penanda"
                className="flex h-8 w-8 items-center justify-center text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#ea4335] transition-colors"
              >
                <HiOutlineLocationMarker className="h-4.5 w-4.5 text-[#ea4335]" />
              </button>
            </div>
          )}

          {/* Tombol Zoom (+ / −) */}
          <div className="flex flex-col overflow-hidden rounded-md border border-[#dadce0] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]">
            <button
              type="button"
              onClick={handleZoomIn}
              title="Perbesar peta"
              className="flex h-8 w-8 items-center justify-center text-[18px] font-semibold text-[#3c4043] hover:bg-[#f1f3f4] transition-colors select-none"
            >
              +
            </button>
            <div className="h-px w-full bg-[#dadce0]" />
            <button
              type="button"
              onClick={handleZoomOut}
              title="Perkecil peta"
              className="flex h-8 w-8 items-center justify-center text-[18px] font-semibold text-[#3c4043] hover:bg-[#f1f3f4] transition-colors select-none"
            >
              −
            </button>
          </div>
        </div>

        {/* Banner Notifikasi Alamat Terdeteksi Otomatis di Bagian Bawah Kiri Peta */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] max-w-[calc(100%-90px)] rounded-md border border-[#dadce0] bg-white/95 px-3 py-1.5 text-xs shadow-md backdrop-blur-sm sm:max-w-md">
          <div className="flex items-center gap-1.5">
            <HiOutlineLocationMarker className="h-4 w-4 shrink-0 text-[#ea4335]" />
            <span className="font-bold text-[#202124]">
              {cityName ? `${cityName}, ` : ''}
              {provinceName || 'Indonesia'}
            </span>
            {isResolvingAddress && (
              <span className="animate-pulse text-2xs text-[#1a73e8] font-semibold">
                · Mendeteksi alamat...
              </span>
            )}
          </div>
          {lastResolvedAddress?.fullAddress ? (
            <p className="mt-0.5 line-clamp-1 text-2xs text-[#5f6368]">
              {lastResolvedAddress.fullAddress}
            </p>
          ) : (
            <p className="mt-0.5 text-2xs text-[#70757a]">
              Klik atau geser peta untuk mengisi alamat otomatis
            </p>
          )}
        </div>
      </div>

      {/* Kontrol Parameter Geofence (Point Radius atau Ringkasan Polygon) */}
      {!readOnly && (
        <div className="rounded-control border border-line bg-surface-2/60 p-3">
          {currentMode === 'point' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-ink">Radius Batas Toleransi Absensi (Point):</span>
                <span className="tabular font-bold text-[#1a73e8]">{radiusMeters} meter</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={25}
                  max={1000}
                  step={25}
                  value={radiusMeters}
                  onChange={(e) =>
                    onChange({
                      latitude,
                      longitude,
                      radiusMeters: Number(e.target.value),
                      coordinatesType: 'point',
                      polygonCoordinates: currentPolygon,
                    })
                  }
                  className="h-1.5 w-full cursor-pointer accent-[#1a73e8]"
                />
                <span className="tabular min-w-[54px] text-right text-xs font-mono text-ink-3">
                  ±{radiusMeters}m
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-2xs text-ink-3">
                <span>
                  Lat: <span className="font-mono tabular text-ink">{latitude.toFixed(6)}</span>
                </span>
                <span>
                  Lng: <span className="font-mono tabular text-ink">{longitude.toFixed(6)}</span>
                </span>
                <span>Lingkaran biru = radius toleransi geofence presensi</span>
              </div>
            </>
          ) : (
            <div className="space-y-1 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink">Geofence Perimeter Khusus (Polygon):</span>
                <span className="font-bold text-[#1a73e8]">{currentPolygon.length} Titik Sudut</span>
              </div>
              <p className="text-2xs text-ink-2">
                Estimasi cakupan luas area tapak kerja:{' '}
                <span className="font-bold font-mono text-ink">
                  {polygonArea.toLocaleString('id-ID')} m²
                </span>
                {polygonArea > 10000 ? ` (${(polygonArea / 10000).toFixed(2)} hektar)` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-2xs text-ink-3">
                <HiOutlineCheckCircle className="h-3.5 w-3.5 text-success" />
                <span>Karyawan hanya dapat presensi jika berada di dalam perimeter poligon ini.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
