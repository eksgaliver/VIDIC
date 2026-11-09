import * as React from 'react'
import {
  INDONESIA_PROVINCES,
  findProvinceByName,
  type IndonesiaCity,
  type IndonesiaProvince
} from 'shared-types'
import { HiOutlineCheck, HiOutlinePlus, HiOutlineTrash, HiOutlineX } from 'react-icons/hi'
import { Button } from '@/components/base'

export interface SelectedOperationalArea {
  province: string
  city: string
}

export interface OperationalAreaSelectorProps {
  value: SelectedOperationalArea[]
  onChange: (areas: SelectedOperationalArea[]) => void
  onSelectPrimaryCity?: (city: IndonesiaCity, province: IndonesiaProvince) => void
  readOnly?: boolean
}

export function OperationalAreaSelector({
  value = [],
  onChange,
  onSelectPrimaryCity,
  readOnly = false
}: OperationalAreaSelectorProps) {
  const [selectedProvinceName, setSelectedProvinceName] = React.useState<string>('DKI Jakarta')
  const [islandFilter, setIslandFilter] = React.useState<string>('Semua')
  const [citySearch, setCitySearch] = React.useState<string>('')

  // Provinsi yang sedang aktif dipilih pada selector
  const activeProvince = React.useMemo(() => {
    return findProvinceByName(selectedProvinceName) || INDONESIA_PROVINCES[0]
  }, [selectedProvinceName])

  // Filter daftar provinsi berdasarkan kepulauan
  const filteredProvinces = React.useMemo(() => {
    if (islandFilter === 'Semua') return INDONESIA_PROVINCES
    return INDONESIA_PROVINCES.filter((p) => p.island === islandFilter)
  }, [islandFilter])

  // Filter kota dalam provinsi yang aktif
  const filteredCities = React.useMemo(() => {
    if (!citySearch.trim()) return activeProvince.cities
    const q = citySearch.toLowerCase().trim()
    return activeProvince.cities.filter((c) => c.name.toLowerCase().includes(q))
  }, [activeProvince, citySearch])

  // Daftar kota terpilih untuk provinsi aktif
  const selectedCitiesInActiveProvince = React.useMemo(() => {
    return value
      .filter((item) => item.province.toLowerCase() === activeProvince.name.toLowerCase())
      .map((item) => item.city)
  }, [value, activeProvince])

  // Toggle satu kota
  const handleToggleCity = (city: IndonesiaCity) => {
    if (readOnly) return

    const exists = value.some(
      (a) =>
        a.province.toLowerCase() === activeProvince.name.toLowerCase() &&
        a.city.toLowerCase() === city.name.toLowerCase()
    )

    let updated: SelectedOperationalArea[]
    if (exists) {
      updated = value.filter(
        (a) =>
          !(
            a.province.toLowerCase() === activeProvince.name.toLowerCase() &&
            a.city.toLowerCase() === city.name.toLowerCase()
          )
      )
    } else {
      updated = [
        ...value,
        {
          province: activeProvince.name,
          city: city.name
        }
      ]
      // Beritahu parent untuk sinkronisasi titik peta jika callback ada
      onSelectPrimaryCity?.(city, activeProvince)
    }

    onChange(updated)
  }

  // Pilih semua kota dalam provinsi aktif
  const handleSelectAllCities = () => {
    if (readOnly) return
    const remaining = value.filter(
      (a) => a.province.toLowerCase() !== activeProvince.name.toLowerCase()
    )
    const newItems = activeProvince.cities.map((c) => ({
      province: activeProvince.name,
      city: c.name
    }))
    onChange([...remaining, ...newItems])
  }

  // Bersihkan semua kota dalam provinsi aktif
  const handleClearCitiesInProvince = () => {
    if (readOnly) return
    const remaining = value.filter(
      (a) => a.province.toLowerCase() !== activeProvince.name.toLowerCase()
    )
    onChange(remaining)
  }

  // Hapus satu kota spesifik dari list
  const handleRemoveArea = (provinceName: string, cityName: string) => {
    if (readOnly) return
    const updated = value.filter(
      (a) =>
        !(
          a.province.toLowerCase() === provinceName.toLowerCase() &&
          a.city.toLowerCase() === cityName.toLowerCase()
        )
    )
    onChange(updated)
  }

  // Ringkasan pengelompokan wilayah berdasarkan provinsi
  const groupedSummary = React.useMemo(() => {
    const map = new Map<string, string[]>()
    for (const item of value) {
      if (!map.has(item.province)) {
        map.set(item.province, [])
      }
      map.get(item.province)!.push(item.city)
    }
    return Array.from(map.entries())
  }, [value])

  return (
    <div className="space-y-4">
      {/* 1. Panel Pemilihan Wilayah Provinsi & Kota */}
      {!readOnly && (
        <div className="rounded-control border border-line bg-surface p-4 shadow-1">
          <div className="mb-3">
            <h4 className="text-[13px] font-bold text-ink">
              Pilih Wilayah & Kota Operasional di Indonesia
            </h4>
            <p className="mt-0.5 text-xs text-ink-2">
              Tentukan provinsi basis operasi, lalu centang kota atau kabupaten tempat perusahaan beroperasi.
            </p>
          </div>

          {/* Filter Kepulauan Indonesia */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-line pb-2.5">
            <span className="text-[11px] font-semibold text-ink-3">Wilayah:</span>
            {['Semua', 'Jawa', 'Sumatera', 'Bali-NusaTenggara', 'Kalimantan', 'Sulawesi', 'Maluku-Papua'].map(
              (island) => (
                <button
                  key={island}
                  type="button"
                  onClick={() => setIslandFilter(island)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    islandFilter === island
                      ? 'bg-primary text-primary-on font-semibold'
                      : 'bg-surface-2 text-ink-2 hover:bg-line hover:text-ink'
                  }`}
                >
                  {island}
                </button>
              )
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-12">
            {/* Kolom Kiri: Pemilihan Provinsi (38 Provinsi) */}
            <div className="md:col-span-5 space-y-2">
              <label className="block text-xs font-semibold text-ink-2">
                Provinsi ({filteredProvinces.length} tersedia)
              </label>
              <div className="max-h-56 overflow-y-auto rounded-control border border-line bg-surface-2/40 divide-y divide-line/70">
                {filteredProvinces.map((prov) => {
                  const isSelected = activeProvince.id === prov.id
                  const countInProv = value.filter(
                    (a) => a.province.toLowerCase() === prov.name.toLowerCase()
                  ).length

                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => {
                        setSelectedProvinceName(prov.name)
                        setCitySearch('')
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-primary-subtle text-primary font-bold'
                          : 'text-ink hover:bg-surface-2'
                      }`}
                    >
                      <span className="truncate">{prov.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-ink-3">({prov.timezoneLabel})</span>
                        {countInProv > 0 && (
                          <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                            {countInProv}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Kolom Kanan: Pemilihan Kota/Kabupaten pada Provinsi Aktif */}
            <div className="md:col-span-7 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-ink-2">
                  Kota di <span className="font-bold text-primary">{activeProvince.name}</span>
                </label>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAllCities}
                    className="text-primary hover:underline font-medium"
                  >
                    Pilih Semua ({activeProvince.cities.length})
                  </button>
                  <span className="text-line-strong">•</span>
                  <button
                    type="button"
                    onClick={handleClearCitiesInProvince}
                    className="text-error hover:underline font-medium"
                  >
                    Batal
                  </button>
                </div>
              </div>

              {/* Pencarian Kota */}
              <input
                type="text"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder={`Cari kota di ${activeProvince.name}...`}
                className="h-8 w-full rounded-control border border-line bg-surface px-2.5 text-xs text-ink placeholder:text-ink-3 focus:border-primary"
              />

              {/* Grid Pilihan Kota/Kabupaten */}
              <div className="max-h-48 overflow-y-auto rounded-control border border-line bg-surface p-2.5">
                {filteredCities.length === 0 ? (
                  <p className="py-4 text-center text-xs text-ink-3">Tidak ada kota yang cocok.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {filteredCities.map((city) => {
                      const isChecked = selectedCitiesInActiveProvince.includes(city.name)
                      return (
                        <button
                          key={city.name}
                          type="button"
                          onClick={() => handleToggleCity(city)}
                          className={`flex items-center justify-between rounded-control border px-2.5 py-1.5 text-left text-xs transition-colors ${
                            isChecked
                              ? 'border-primary bg-primary-subtle text-primary font-semibold'
                              : 'border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2'
                          }`}
                        >
                          <span className="truncate">{city.name}</span>
                          {isChecked && <HiOutlineCheck className="h-3.5 w-3.5 shrink-0 text-primary ml-1" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Ringkasan Wilayah Operasional Terpilih */}
      <div className="rounded-control border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
          <h4 className="text-[13px] font-bold text-ink">
            Daftar Cakupan Operasional ({groupedSummary.length} Provinsi, {value.length} Kota/Kabupaten)
          </h4>
          {value.length > 0 && !readOnly && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-semibold text-error hover:underline"
            >
              Kosongkan Semua
            </button>
          )}
        </div>

        {value.length === 0 ? (
          <div className="py-5 text-center">
            <p className="text-xs text-ink-3">
              Belum ada wilayah operasional yang didaftarkan. Pilih provinsi dan kota di atas untuk menambahkan.
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {groupedSummary.map(([provName, cities]) => (
              <div key={provName} className="rounded-control border border-line/80 bg-surface-2/40 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">{provName}</span>
                    <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                      {cities.length} Kota Operasional
                    </span>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        const remaining = value.filter(
                          (a) => a.province.toLowerCase() !== provName.toLowerCase()
                        )
                        onChange(remaining)
                      }}
                      className="text-[11px] font-medium text-error hover:underline"
                      title="Hapus seluruh kota di provinsi ini"
                    >
                      Hapus Provinsi
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {cities.map((cityName) => (
                    <span
                      key={cityName}
                      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink shadow-sm"
                    >
                      <span>{cityName}</span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveArea(provName, cityName)}
                          className="text-ink-3 hover:text-error"
                          aria-label={`Hapus ${cityName}`}
                        >
                          <HiOutlineX className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

