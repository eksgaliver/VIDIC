// ==============================================================================
// Dataset Wilayah Administratif Republik Indonesia: 38 Provinsi & Kota/Kabupaten
// Dilengkapi koordinat geografis default dan zona waktu operasional (WIB/WITA/WIT)
// ==============================================================================

export interface IndonesiaCity {
  name: string
  type: 'Kota' | 'Kabupaten'
  latitude: number
  longitude: number
}

export interface IndonesiaProvince {
  id: string
  name: string
  island: 'Sumatera' | 'Jawa' | 'Bali-NusaTenggara' | 'Kalimantan' | 'Sulawesi' | 'Maluku-Papua'
  timezone: 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura'
  timezoneLabel: 'WIB' | 'WITA' | 'WIT'
  capital: string
  latitude: number
  longitude: number
  cities: IndonesiaCity[]
}

export const INDONESIA_PROVINCES: IndonesiaProvince[] = [
  // --- JAWA ---
  {
    id: 'DKI',
    name: 'DKI Jakarta',
    island: 'Jawa',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Jakarta Pusat',
    latitude: -6.2088,
    longitude: 106.8456,
    cities: [
      { name: 'Jakarta Pusat', type: 'Kota', latitude: -6.1805, longitude: 106.8284 },
      { name: 'Jakarta Selatan', type: 'Kota', latitude: -6.2615, longitude: 106.8106 },
      { name: 'Jakarta Barat', type: 'Kota', latitude: -6.1683, longitude: 106.7588 },
      { name: 'Jakarta Timur', type: 'Kota', latitude: -6.2250, longitude: 106.9004 },
      { name: 'Jakarta Utara', type: 'Kota', latitude: -6.1214, longitude: 106.7741 },
      { name: 'Kepulauan Seribu', type: 'Kabupaten', latitude: -5.6122, longitude: 106.5622 }
    ]
  },
  {
    id: 'JB',
    name: 'Jawa Barat',
    island: 'Jawa',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Bandung',
    latitude: -6.9175,
    longitude: 107.6191,
    cities: [
      { name: 'Kota Bandung', type: 'Kota', latitude: -6.9175, longitude: 107.6191 },
      { name: 'Kota Bekasi', type: 'Kota', latitude: -6.2383, longitude: 106.9756 },
      { name: 'Kota Bogor', type: 'Kota', latitude: -6.5971, longitude: 106.8060 },
      { name: 'Kota Depok', type: 'Kota', latitude: -6.4025, longitude: 106.7942 },
      { name: 'Kota Cimahi', type: 'Kota', latitude: -6.8722, longitude: 107.5422 },
      { name: 'Kota Cirebon', type: 'Kota', latitude: -6.7320, longitude: 108.5523 },
      { name: 'Kota Sukabumi', type: 'Kota', latitude: -6.9277, longitude: 106.9300 },
      { name: 'Kota Tasikmalaya', type: 'Kota', latitude: -7.3274, longitude: 108.2207 },
      { name: 'Kota Banjar', type: 'Kota', latitude: -7.3686, longitude: 108.5333 },
      { name: 'Kabupaten Bandung', type: 'Kabupaten', latitude: -7.0253, longitude: 107.5198 },
      { name: 'Kabupaten Bandung Barat', type: 'Kabupaten', latitude: -6.8447, longitude: 107.4939 },
      { name: 'Kabupaten Bekasi', type: 'Kabupaten', latitude: -6.2443, longitude: 107.1362 },
      { name: 'Kabupaten Bogor', type: 'Kabupaten', latitude: -6.5518, longitude: 106.6291 },
      { name: 'Kabupaten Karawang', type: 'Kabupaten', latitude: -6.3054, longitude: 107.3022 },
      { name: 'Kabupaten Purwakarta', type: 'Kabupaten', latitude: -6.5569, longitude: 107.4433 },
      { name: 'Kabupaten Subang', type: 'Kabupaten', latitude: -6.5716, longitude: 107.7606 },
      { name: 'Kabupaten Cirebon', type: 'Kabupaten', latitude: -6.7644, longitude: 108.4794 },
      { name: 'Kabupaten Garut', type: 'Kabupaten', latitude: -7.2279, longitude: 107.9087 },
      { name: 'Kabupaten Sumedang', type: 'Kabupaten', latitude: -6.8586, longitude: 107.9267 }
    ]
  },
  {
    id: 'BT',
    name: 'Banten',
    island: 'Jawa',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Serang',
    latitude: -6.1200,
    longitude: 106.1503,
    cities: [
      { name: 'Kota Tangerang', type: 'Kota', latitude: -6.1783, longitude: 106.6319 },
      { name: 'Kota Tangerang Selatan', type: 'Kota', latitude: -6.2888, longitude: 106.7179 },
      { name: 'Kota Serang', type: 'Kota', latitude: -6.1200, longitude: 106.1503 },
      { name: 'Kota Cilegon', type: 'Kota', latitude: -6.0028, longitude: 106.0536 },
      { name: 'Kabupaten Tangerang', type: 'Kabupaten', latitude: -6.1969, longitude: 106.4522 },
      { name: 'Kabupaten Serang', type: 'Kabupaten', latitude: -6.1600, longitude: 106.0000 },
      { name: 'Kabupaten Pandeglang', type: 'Kabupaten', latitude: -6.3083, longitude: 106.1067 },
      { name: 'Kabupaten Lebak', type: 'Kabupaten', latitude: -6.5411, longitude: 106.2494 }
    ]
  },
  {
    id: 'JT',
    name: 'Jawa Tengah',
    island: 'Jawa',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Semarang',
    latitude: -6.9667,
    longitude: 110.4167,
    cities: [
      { name: 'Kota Semarang', type: 'Kota', latitude: -6.9667, longitude: 110.4167 },
      { name: 'Kota Surakarta (Solo)', type: 'Kota', latitude: -7.5755, longitude: 110.8243 },
      { name: 'Kota Magelang', type: 'Kota', latitude: -7.4706, longitude: 110.2178 },
      { name: 'Kota Salatiga', type: 'Kota', latitude: -7.3305, longitude: 110.5084 },
      { name: 'Kota Pekalongan', type: 'Kota', latitude: -6.8886, longitude: 109.6753 },
      { name: 'Kota Tegal', type: 'Kota', latitude: -6.8694, longitude: 109.1402 },
      { name: 'Kabupaten Banyumas (Purwokerto)', type: 'Kabupaten', latitude: -7.4243, longitude: 109.2302 },
      { name: 'Kabupaten Kudus', type: 'Kabupaten', latitude: -6.8048, longitude: 110.8405 },
      { name: 'Kabupaten Jepara', type: 'Kabupaten', latitude: -6.5931, longitude: 110.6728 },
      { name: 'Kabupaten Klaten', type: 'Kabupaten', latitude: -7.7058, longitude: 110.6015 },
      { name: 'Kabupaten Boyolali', type: 'Kabupaten', latitude: -7.5361, longitude: 110.5947 },
      { name: 'Kabupaten Cilacap', type: 'Kabupaten', latitude: -7.7028, longitude: 109.0150 }
    ]
  },
  {
    id: 'DIY',
    name: 'DI Yogyakarta',
    island: 'Jawa',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Yogyakarta',
    latitude: -7.7956,
    longitude: 110.3695,
    cities: [
      { name: 'Kota Yogyakarta', type: 'Kota', latitude: -7.7956, longitude: 110.3695 },
      { name: 'Kabupaten Sleman', type: 'Kabupaten', latitude: -7.6894, longitude: 110.3453 },
      { name: 'Kabupaten Bantul', type: 'Kabupaten', latitude: -7.8939, longitude: 110.3344 },
      { name: 'Kabupaten Kulon Progo', type: 'Kabupaten', latitude: -7.8258, longitude: 110.1564 },
      { name: 'Kabupaten Gunungkidul', type: 'Kabupaten', latitude: -7.9622, longitude: 110.6033 }
    ]
  },
  {
    id: 'JTM',
    name: 'Jawa Timur',
    island: 'Jawa',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Surabaya',
    latitude: -7.2575,
    longitude: 112.7521,
    cities: [
      { name: 'Kota Surabaya', type: 'Kota', latitude: -7.2575, longitude: 112.7521 },
      { name: 'Kota Malang', type: 'Kota', latitude: -7.9666, longitude: 112.6326 },
      { name: 'Kota Batu', type: 'Kota', latitude: -7.8712, longitude: 112.5273 },
      { name: 'Kota Kediri', type: 'Kota', latitude: -7.8228, longitude: 112.0119 },
      { name: 'Kota Madiun', type: 'Kota', latitude: -7.6298, longitude: 111.5239 },
      { name: 'Kota Mojokerto', type: 'Kota', latitude: -7.4726, longitude: 112.4381 },
      { name: 'Kota Pasuruan', type: 'Kota', latitude: -7.6453, longitude: 112.9075 },
      { name: 'Kota Probolinggo', type: 'Kota', latitude: -7.7543, longitude: 113.2159 },
      { name: 'Kota Blitar', type: 'Kota', latitude: -8.0954, longitude: 112.1609 },
      { name: 'Kabupaten Sidoarjo', type: 'Kabupaten', latitude: -7.4478, longitude: 112.7183 },
      { name: 'Kabupaten Gresik', type: 'Kabupaten', latitude: -7.1566, longitude: 112.6555 },
      { name: 'Kabupaten Jember', type: 'Kabupaten', latitude: -8.1724, longitude: 113.7007 },
      { name: 'Kabupaten Banyuwangi', type: 'Kabupaten', latitude: -8.2192, longitude: 114.3692 }
    ]
  },

  // --- SUMATERA ---
  {
    id: 'SU',
    name: 'Sumatera Utara',
    island: 'Sumatera',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Medan',
    latitude: 3.5952,
    longitude: 98.6722,
    cities: [
      { name: 'Kota Medan', type: 'Kota', latitude: 3.5952, longitude: 98.6722 },
      { name: 'Kota Binjai', type: 'Kota', latitude: 3.6008, longitude: 98.4856 },
      { name: 'Kota Pematangsiantar', type: 'Kota', latitude: 2.9616, longitude: 99.0682 },
      { name: 'Kota Tebing Tinggi', type: 'Kota', latitude: 3.3283, longitude: 99.1625 },
      { name: 'Kota Sibolga', type: 'Kota', latitude: 1.7428, longitude: 98.7842 },
      { name: 'Kota Padangsidimpuan', type: 'Kota', latitude: 1.3733, longitude: 99.2733 },
      { name: 'Kabupaten Deli Serdang', type: 'Kabupaten', latitude: 3.5500, longitude: 98.7000 },
      { name: 'Kabupaten Karo', type: 'Kabupaten', latitude: 3.1000, longitude: 98.5000 }
    ]
  },
  {
    id: 'SB',
    name: 'Sumatera Barat',
    island: 'Sumatera',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Padang',
    latitude: -0.9471,
    longitude: 100.4172,
    cities: [
      { name: 'Kota Padang', type: 'Kota', latitude: -0.9471, longitude: 100.4172 },
      { name: 'Kota Bukittinggi', type: 'Kota', latitude: -0.3056, longitude: 100.3692 },
      { name: 'Kota Payakumbuh', type: 'Kota', latitude: -0.2248, longitude: 100.6322 },
      { name: 'Kota Pariaman', type: 'Kota', latitude: -0.6264, longitude: 100.1206 },
      { name: 'Kota Solok', type: 'Kota', latitude: -0.7983, longitude: 100.6586 },
      { name: 'Kota Padang Panjang', type: 'Kota', latitude: -0.4636, longitude: 100.4011 }
    ]
  },
  {
    id: 'RI',
    name: 'Riau',
    island: 'Sumatera',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Pekanbaru',
    latitude: 0.5071,
    longitude: 101.4478,
    cities: [
      { name: 'Kota Pekanbaru', type: 'Kota', latitude: 0.5071, longitude: 101.4478 },
      { name: 'Kota Dumai', type: 'Kota', latitude: 1.6667, longitude: 101.4500 },
      { name: 'Kabupaten Kampar', type: 'Kabupaten', latitude: 0.3333, longitude: 101.0000 },
      { name: 'Kabupaten Siak', type: 'Kabupaten', latitude: 0.7967, longitude: 101.9961 },
      { name: 'Kabupaten Bengkalis', type: 'Kabupaten', latitude: 1.4833, longitude: 102.1333 }
    ]
  },
  {
    id: 'KR',
    name: 'Kepulauan Riau',
    island: 'Sumatera',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Tanjungpinang',
    latitude: 0.9167,
    longitude: 104.4500,
    cities: [
      { name: 'Kota Batam', type: 'Kota', latitude: 1.1301, longitude: 104.0529 },
      { name: 'Kota Tanjungpinang', type: 'Kota', latitude: 0.9167, longitude: 104.4500 },
      { name: 'Kabupaten Bintan', type: 'Kabupaten', latitude: 1.0500, longitude: 104.5333 },
      { name: 'Kabupaten Karimun', type: 'Kabupaten', latitude: 0.9667, longitude: 103.4333 }
    ]
  },
  {
    id: 'SS',
    name: 'Sumatera Selatan',
    island: 'Sumatera',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Palembang',
    latitude: -2.9909,
    longitude: 104.7565,
    cities: [
      { name: 'Kota Palembang', type: 'Kota', latitude: -2.9909, longitude: 104.7565 },
      { name: 'Kota Prabumulih', type: 'Kota', latitude: -3.4333, longitude: 104.2333 },
      { name: 'Kota Lubuklinggau', type: 'Kota', latitude: -3.2958, longitude: 102.8622 },
      { name: 'Kabupaten Banyuasin', type: 'Kabupaten', latitude: -2.8833, longitude: 104.3833 },
      { name: 'Kabupaten Ogan Ilir', type: 'Kabupaten', latitude: -3.4333, longitude: 104.6500 }
    ]
  },
  {
    id: 'LP',
    name: 'Lampung',
    island: 'Sumatera',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Bandar Lampung',
    latitude: -5.4500,
    longitude: 105.2667,
    cities: [
      { name: 'Kota Bandar Lampung', type: 'Kota', latitude: -5.4500, longitude: 105.2667 },
      { name: 'Kota Metro', type: 'Kota', latitude: -5.1133, longitude: 105.3067 },
      { name: 'Kabupaten Lampung Selatan', type: 'Kabupaten', latitude: -5.6000, longitude: 105.5833 },
      { name: 'Kabupaten Lampung Tengah', type: 'Kabupaten', latitude: -4.8667, longitude: 105.2667 }
    ]
  },
  {
    id: 'AC',
    name: 'Aceh',
    island: 'Sumatera',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Banda Aceh',
    latitude: 5.5483,
    longitude: 95.3238,
    cities: [
      { name: 'Kota Banda Aceh', type: 'Kota', latitude: 5.5483, longitude: 95.3238 },
      { name: 'Kota Lhokseumawe', type: 'Kota', latitude: 5.1804, longitude: 97.1406 },
      { name: 'Kota Langsa', type: 'Kota', latitude: 4.4719, longitude: 97.9683 },
      { name: 'Kota Sabang', type: 'Kota', latitude: 5.8933, longitude: 95.3197 }
    ]
  },
  {
    id: 'JA',
    name: 'Jambi',
    island: 'Sumatera',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Jambi',
    latitude: -1.6101,
    longitude: 103.6131,
    cities: [
      { name: 'Kota Jambi', type: 'Kota', latitude: -1.6101, longitude: 103.6131 },
      { name: 'Kota Sungai Penuh', type: 'Kota', latitude: -2.0667, longitude: 101.4000 }
    ]
  },
  {
    id: 'BE',
    name: 'Bengkulu',
    island: 'Sumatera',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Bengkulu',
    latitude: -3.8004,
    longitude: 102.2655,
    cities: [
      { name: 'Kota Bengkulu', type: 'Kota', latitude: -3.8004, longitude: 102.2655 },
      { name: 'Kabupaten Rejang Lebong', type: 'Kabupaten', latitude: -3.4667, longitude: 102.5333 }
    ]
  },
  {
    id: 'BB',
    name: 'Bangka Belitung',
    island: 'Sumatera',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Pangkalpinang',
    latitude: -2.1333,
    longitude: 106.1167,
    cities: [
      { name: 'Kota Pangkalpinang', type: 'Kota', latitude: -2.1333, longitude: 106.1167 },
      { name: 'Kabupaten Belitung', type: 'Kabupaten', latitude: -2.8333, longitude: 107.7000 }
    ]
  },

  // --- BALI & NUSA TENGGARA ---
  {
    id: 'BA',
    name: 'Bali',
    island: 'Bali-NusaTenggara',
    timezone: 'Asia/Makassar',
    timezoneLabel: 'WITA',
    capital: 'Denpasar',
    latitude: -8.6705,
    longitude: 115.2126,
    cities: [
      { name: 'Kota Denpasar', type: 'Kota', latitude: -8.6705, longitude: 115.2126 },
      { name: 'Kabupaten Badung (Kuta/Canggu)', type: 'Kabupaten', latitude: -8.5833, longitude: 115.1833 },
      { name: 'Kabupaten Gianyar (Ubud)', type: 'Kabupaten', latitude: -8.5333, longitude: 115.3333 },
      { name: 'Kabupaten Tabanan', type: 'Kabupaten', latitude: -8.5333, longitude: 115.1333 },
      { name: 'Kabupaten Buleleng (Singaraja)', type: 'Kabupaten', latitude: -8.1167, longitude: 115.0833 }
    ]
  },
  {
    id: 'NB',
    name: 'Nusa Tenggara Barat',
    island: 'Bali-NusaTenggara',
    timezone: 'Asia/Makassar',
    timezoneLabel: 'WITA',
    capital: 'Mataram',
    latitude: -8.5833,
    longitude: 116.1167,
    cities: [
      { name: 'Kota Mataram', type: 'Kota', latitude: -8.5833, longitude: 116.1167 },
      { name: 'Kota Bima', type: 'Kota', latitude: -8.4500, longitude: 118.7167 },
      { name: 'Kabupaten Lombok Barat', type: 'Kabupaten', latitude: -8.6833, longitude: 116.1333 },
      { name: 'Kabupaten Lombok Tengah (Mandalika)', type: 'Kabupaten', latitude: -8.7000, longitude: 116.2833 }
    ]
  },
  {
    id: 'NT',
    name: 'Nusa Tenggara Timur',
    island: 'Bali-NusaTenggara',
    timezone: 'Asia/Makassar',
    timezoneLabel: 'WITA',
    capital: 'Kupang',
    latitude: -10.1772,
    longitude: 123.6070,
    cities: [
      { name: 'Kota Kupang', type: 'Kota', latitude: -10.1772, longitude: 123.6070 },
      { name: 'Kabupaten Manggarai Barat (Labuan Bajo)', type: 'Kabupaten', latitude: -8.4900, longitude: 119.8800 }
    ]
  },

  // --- KALIMANTAN ---
  {
    id: 'KT',
    name: 'Kalimantan Timur',
    island: 'Kalimantan',
    timezone: 'Asia/Makassar',
    timezoneLabel: 'WITA',
    capital: 'Samarinda',
    latitude: -0.5022,
    longitude: 117.1536,
    cities: [
      { name: 'Kota Balikpapan', type: 'Kota', latitude: -1.2654, longitude: 116.8312 },
      { name: 'Kota Samarinda', type: 'Kota', latitude: -0.5022, longitude: 117.1536 },
      { name: 'Kota Bontang', type: 'Kota', latitude: 0.1333, longitude: 117.5000 },
      { name: 'Kabupaten Penajam Paser Utara (IKN Nusantara)', type: 'Kabupaten', latitude: -0.9631, longitude: 116.7167 },
      { name: 'Kabupaten Kutai Kartanegara', type: 'Kabupaten', latitude: -0.4333, longitude: 117.0000 },
      { name: 'Kabupaten Berau', type: 'Kabupaten', latitude: 2.1500, longitude: 117.4833 }
    ]
  },
  {
    id: 'KB',
    name: 'Kalimantan Barat',
    island: 'Kalimantan',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Pontianak',
    latitude: -0.0263,
    longitude: 109.3425,
    cities: [
      { name: 'Kota Pontianak', type: 'Kota', latitude: -0.0263, longitude: 109.3425 },
      { name: 'Kota Singkawang', type: 'Kota', latitude: 0.9000, longitude: 108.9833 },
      { name: 'Kabupaten Kubu Raya', type: 'Kabupaten', latitude: -0.1667, longitude: 109.4333 }
    ]
  },
  {
    id: 'KS',
    name: 'Kalimantan Selatan',
    island: 'Kalimantan',
    timezone: 'Asia/Makassar',
    timezoneLabel: 'WITA',
    capital: 'Banjarbaru',
    latitude: -3.4400,
    longitude: 114.8300,
    cities: [
      { name: 'Kota Banjarmasin', type: 'Kota', latitude: -3.3194, longitude: 114.5908 },
      { name: 'Kota Banjarbaru', type: 'Kota', latitude: -3.4400, longitude: 114.8300 },
      { name: 'Kabupaten Banjar (Martapura)', type: 'Kabupaten', latitude: -3.4167, longitude: 114.8500 }
    ]
  },
  {
    id: 'KH',
    name: 'Kalimantan Tengah',
    island: 'Kalimantan',
    timezone: 'Asia/Jakarta',
    timezoneLabel: 'WIB',
    capital: 'Palangka Raya',
    latitude: -2.2167,
    longitude: 113.9167,
    cities: [
      { name: 'Kota Palangka Raya', type: 'Kota', latitude: -2.2167, longitude: 113.9167 },
      { name: 'Kabupaten Kotawaringin Timur (Sampit)', type: 'Kabupaten', latitude: -2.5333, longitude: 112.9500 }
    ]
  },
  {
    id: 'KU',
    name: 'Kalimantan Utara',
    island: 'Kalimantan',
    timezone: 'Asia/Makassar',
    timezoneLabel: 'WITA',
    capital: 'Tanjung Selor',
    latitude: 2.8333,
    longitude: 117.3667,
    cities: [
      { name: 'Kota Tarakan', type: 'Kota', latitude: 3.3000, longitude: 117.6333 },
      { name: 'Kabupaten Bulungan (Tanjung Selor)', type: 'Kabupaten', latitude: 2.8333, longitude: 117.3667 }
    ]
  },

  // --- SULAWESI ---
  {
    id: 'SN',
    name: 'Sulawesi Selatan',
    island: 'Sulawesi',
    timezone: 'Asia/Makassar',
    timezoneLabel: 'WITA',
    capital: 'Makassar',
    latitude: -5.1477,
    longitude: 119.4327,
    cities: [
      { name: 'Kota Makassar', type: 'Kota', latitude: -5.1477, longitude: 119.4327 },
      { name: 'Kota Parepare', type: 'Kota', latitude: -4.0133, longitude: 119.6267 },
      { name: 'Kota Palopo', type: 'Kota', latitude: -3.0000, longitude: 120.2000 },
      { name: 'Kabupaten Gowa', type: 'Kabupaten', latitude: -5.3000, longitude: 119.7500 },
      { name: 'Kabupaten Maros', type: 'Kabupaten', latitude: -5.0000, longitude: 119.5833 }
    ]
  },
  {
    id: 'SA',
    name: 'Sulawesi Utara',
    island: 'Sulawesi',
    timezone: 'Asia/Makassar',
    timezoneLabel: 'WITA',
    capital: 'Manado',
    latitude: 1.4748,
    longitude: 124.8428,
    cities: [
      { name: 'Kota Manado', type: 'Kota', latitude: 1.4748, longitude: 124.8428 },
      { name: 'Kota Bitung', type: 'Kota', latitude: 1.4400, longitude: 125.1833 },
      { name: 'Kota Tomohon', type: 'Kota', latitude: 1.3167, longitude: 124.8333 }
    ]
  },
  {
    id: 'ST',
    name: 'Sulawesi Tengah',
    island: 'Sulawesi',
    timezone: 'Asia/Makassar',
    timezoneLabel: 'WITA',
    capital: 'Palu',
    latitude: -0.8917,
    longitude: 119.8707,
    cities: [
      { name: 'Kota Palu', type: 'Kota', latitude: -0.8917, longitude: 119.8707 },
      { name: 'Kabupaten Banggai (Luwuk)', type: 'Kabupaten', latitude: -0.9500, longitude: 122.7833 },
      { name: 'Kabupaten Morowali', type: 'Kabupaten', latitude: -2.4833, longitude: 121.9000 }
    ]
  },
  {
    id: 'SG',
    name: 'Sulawesi Tenggara',
    island: 'Sulawesi',
    timezone: 'Asia/Makassar',
    timezoneLabel: 'WITA',
    capital: 'Kendari',
    latitude: -3.9985,
    longitude: 122.5126,
    cities: [
      { name: 'Kota Kendari', type: 'Kota', latitude: -3.9985, longitude: 122.5126 },
      { name: 'Kota Baubau', type: 'Kota', latitude: -5.4667, longitude: 122.6000 }
    ]
  },
  {
    id: 'GO',
    name: 'Gorontalo',
    island: 'Sulawesi',
    timezone: 'Asia/Makassar',
    timezoneLabel: 'WITA',
    capital: 'Gorontalo',
    latitude: 0.5433,
    longitude: 123.0567,
    cities: [
      { name: 'Kota Gorontalo', type: 'Kota', latitude: 0.5433, longitude: 123.0567 }
    ]
  },
  {
    id: 'SR',
    name: 'Sulawesi Barat',
    island: 'Sulawesi',
    timezone: 'Asia/Makassar',
    timezoneLabel: 'WITA',
    capital: 'Mamuju',
    latitude: -2.6778,
    longitude: 118.8892,
    cities: [
      { name: 'Kabupaten Mamuju', type: 'Kabupaten', latitude: -2.6778, longitude: 118.8892 }
    ]
  },

  // --- MALUKU & PAPUA ---
  {
    id: 'MA',
    name: 'Maluku',
    island: 'Maluku-Papua',
    timezone: 'Asia/Jayapura',
    timezoneLabel: 'WIT',
    capital: 'Ambon',
    latitude: -3.6958,
    longitude: 128.1831,
    cities: [
      { name: 'Kota Ambon', type: 'Kota', latitude: -3.6958, longitude: 128.1831 },
      { name: 'Kota Tual', type: 'Kota', latitude: -5.6333, longitude: 132.7500 }
    ]
  },
  {
    id: 'MU',
    name: 'Maluku Utara',
    island: 'Maluku-Papua',
    timezone: 'Asia/Jayapura',
    timezoneLabel: 'WIT',
    capital: 'Sofifi',
    latitude: 0.7333,
    longitude: 127.5667,
    cities: [
      { name: 'Kota Ternate', type: 'Kota', latitude: 0.7833, longitude: 127.3833 },
      { name: 'Kota Tidore Kepulauan', type: 'Kota', latitude: 0.6833, longitude: 127.4000 }
    ]
  },
  {
    id: 'PA',
    name: 'Papua',
    island: 'Maluku-Papua',
    timezone: 'Asia/Jayapura',
    timezoneLabel: 'WIT',
    capital: 'Jayapura',
    latitude: -2.5916,
    longitude: 140.6690,
    cities: [
      { name: 'Kota Jayapura', type: 'Kota', latitude: -2.5916, longitude: 140.6690 },
      { name: 'Kabupaten Jayapura', type: 'Kabupaten', latitude: -2.6833, longitude: 140.3333 }
    ]
  },
  {
    id: 'PB',
    name: 'Papua Barat',
    island: 'Maluku-Papua',
    timezone: 'Asia/Jayapura',
    timezoneLabel: 'WIT',
    capital: 'Manokwari',
    latitude: -0.8615,
    longitude: 134.0620,
    cities: [
      { name: 'Kabupaten Manokwari', type: 'Kabupaten', latitude: -0.8615, longitude: 134.0620 },
      { name: 'Kabupaten Fakfak', type: 'Kabupaten', latitude: -2.9167, longitude: 132.3000 }
    ]
  },
  {
    id: 'PBD',
    name: 'Papua Barat Daya',
    island: 'Maluku-Papua',
    timezone: 'Asia/Jayapura',
    timezoneLabel: 'WIT',
    capital: 'Sorong',
    latitude: -0.8762,
    longitude: 131.2558,
    cities: [
      { name: 'Kota Sorong', type: 'Kota', latitude: -0.8762, longitude: 131.2558 },
      { name: 'Kabupaten Raja Ampat', type: 'Kabupaten', latitude: -0.2333, longitude: 130.5167 }
    ]
  },
  {
    id: 'PS',
    name: 'Papua Selatan',
    island: 'Maluku-Papua',
    timezone: 'Asia/Jayapura',
    timezoneLabel: 'WIT',
    capital: 'Merauke',
    latitude: -8.4991,
    longitude: 140.4011,
    cities: [
      { name: 'Kabupaten Merauke', type: 'Kabupaten', latitude: -8.4991, longitude: 140.4011 }
    ]
  },
  {
    id: 'PT',
    name: 'Papua Tengah',
    island: 'Maluku-Papua',
    timezone: 'Asia/Jayapura',
    timezoneLabel: 'WIT',
    capital: 'Nabire',
    latitude: -3.3667,
    longitude: 135.4833,
    cities: [
      { name: 'Kabupaten Nabire', type: 'Kabupaten', latitude: -3.3667, longitude: 135.4833 },
      { name: 'Kabupaten Mimika (Timika)', type: 'Kabupaten', latitude: -4.5444, longitude: 136.8872 }
    ]
  },
  {
    id: 'PP',
    name: 'Papua Pegunungan',
    island: 'Maluku-Papua',
    timezone: 'Asia/Jayapura',
    timezoneLabel: 'WIT',
    capital: 'Wamena',
    latitude: -4.0983,
    longitude: 138.9442,
    cities: [
      { name: 'Kabupaten Jayawijaya (Wamena)', type: 'Kabupaten', latitude: -4.0983, longitude: 138.9442 }
    ]
  }
]

export const findProvinceByName = (name?: string): IndonesiaProvince | undefined => {
  if (!name) return undefined
  const query = name.toLowerCase().trim()
  return INDONESIA_PROVINCES.find((p) => p.name.toLowerCase() === query || p.name.toLowerCase().includes(query))
}

export const findCityInProvince = (provinceName: string, cityName: string): IndonesiaCity | undefined => {
  const prov = findProvinceByName(provinceName)
  if (!prov) return undefined
  const query = cityName.toLowerCase().trim()
  return prov.cities.find((c) => c.name.toLowerCase() === query || c.name.toLowerCase().includes(query))
}

export const getTimezoneByProvince = (provinceName?: string): { timezone: string; label: string } => {
  const prov = findProvinceByName(provinceName)
  if (!prov) return { timezone: 'Asia/Jakarta', label: 'WIB' }
  return { timezone: prov.timezone, label: prov.timezoneLabel }
}

