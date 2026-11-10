# Panduan Manifest Kubernetes Srikaya Platform

Direktori ini memuat spesifikasi manifest deklaratif Kubernetes lengkap untuk topologi arsitektur **Srikaya Platform (VIDIC)** berbasis Bun, ElysiaJS, PostgreSQL, dan React 19 SPA.

Manifest dirancang mengikuti standar label Kubernetes resmi (`app.kubernetes.io/*`) untuk menghasilkan visualisasi diagram topologi yang jernih pada **Kubernetes Visualizer** (seperti *Lens*, *Monokle*, *Octant*, *K9s*, *Kubernetes Dashboard*, maupun visualizer web).

---

## 1. Peta Topologi Komponen

```text
                                  [ KUBERNETES INGRESS ]
                                  (Host: srikaya.local)
                                       /         \
                             path: / /            \ path: /api & /storage
                                    v              v
                          [ web-client:80 ]   [ gateway-service:3000 ]
                           (SPA Nginx Hub)     (Reverse Proxy & Storage)
                                                /        |        \
                                               /         |         \
                                              v          v          v
                                    [ auth-service ] [ shifting ] [ storage ]
                                        (:3001)       (:3003)      (:3002)
                                           \             /            |
                                            \           /       [ srikaya-media-pvc ]
                                             v         v        (Shared Assets: 20Gi)
                                      [ postgres-service:5432 ]
                                         (StatefulSet DB)
                                                |
                                      [ postgres-data-pvc ]
                                            (10Gi)
```

---

## 2. Struktur Berkas Manifest

| Berkas | Jenis Sumber Daya | Fungsi & Peran dalam Sistem |
| :--- | :--- | :--- |
| `00-namespace.yaml` | `Namespace` | Ruang lingkup isolasi `srikaya-system` |
| `01-configmap-secret.yaml` | `ConfigMap`, `Secret` | Konfigurasi port, endpoint microservice, JWT secret, dan database URL |
| `02-storage-pvc.yaml` | `PersistentVolumeClaim` | Penyimpanan persisten media bersama (`20Gi`) & basis data (`10Gi`) |
| `03-postgres.yaml` | `StatefulSet`, `Service` | Basis data relasional PostgreSQL 16 (Port 5432) |
| `04-auth-service.yaml` | `Deployment`, `Service` | Mikroservis autentikasi, organisasi, departemen, dan karyawan (Port 3001) |
| `05-shifting-service.yaml`| `Deployment`, `Service` | Mikroservis jam kerja, master shift, dan verifikasi geofence (Port 3003) |
| `06-storage-service.yaml` | `Deployment`, `Service` | Mikroservis unggah berkas dan kompresi WebP (Port 3002) |
| `07-gateway-service.yaml` | `Deployment`, `Service` | API Gateway, aggregator mikroservis, dan peladen statis berkas (Port 3000) |
| `08-web-client.yaml` | `Deployment`, `Service` | Antarmuka pengguna Client Web SPA React 19 (Port 80) |
| `09-ingress.yaml` | `Ingress` | Router gerbang luar: `/api` & `/storage` ke gateway, `/` ke web client |
| `10-network-policy.yaml` | `NetworkPolicy` | Kebijakan isolasi zero-trust (visualizer merender garis koneksi antar-pod) |
| `11-hpa.yaml` | `HorizontalPodAutoscaler`| Skalabilitas otomatis pod berbasis penggunaan CPU dan memori |
| `srikaya-all-in-one.yaml`| *Gabungan Seluruh Sumber Daya* | Berkas tunggal siap pakai untuk diunggah/di-import ke visualizer |

---

## 3. Cara Memeriksa pada Kubernetes Visualizer

### A. Penggunaan Berkas Tunggal (*All-in-One*)
Untuk visualizer web, Monokle, atau tool inspeksi visual:
1. Buka atau import berkas [`k8s/srikaya-all-in-one.yaml`](./srikaya-all-in-one.yaml).
2. Visualizer akan secara otomatis membaca seluruh relasi `Deployment` → `Service` → `Ingress` serta korelasi `PersistentVolumeClaim` dan `NetworkPolicy`.

### B. Menerapkan ke Klaster Lokal (Minikube / Kind / K3s / Docker Desktop)
```powershell
# 1. Jalankan apply seluruh manifest secara terurut:
kubectl apply -f k8s/

# Atau menggunakan berkas gabungan:
kubectl apply -f k8s/srikaya-all-in-one.yaml

# 2. Verifikasi seluruh status pod dan service:
kubectl get all -n srikaya-system

# 3. Buka visualizer Kubernetes (contoh: K9s atau Lens):
# Pilih namespace: srikaya-system
```

