# Merilis perubahan: build vs pembaruan (EAS Update)

Ada dua jalur. Pilih yang sesuai dengan jenis perubahannya.

## 1. Pembaruan tanpa instal ulang (EAS Update) — untuk perubahan JavaScript saja

Cocok untuk: perbaikan bug, perubahan layar, teks, logika, query, warna, animasi.

```bash
npx eas-cli update --channel preview --message "Deskripsi singkat perubahan"
```

Yang terjadi pada HP yang sudah memasang build `preview`:
1. Saat app dibuka, `expo-updates` mengecek dan mengunduh pembaruan di latar.
2. Setelah siap, muncul kartu **Pembaruan tersedia** dengan tombol **Mulai ulang** (atau **Nanti**).
3. Setelah dimulai ulang, versi baru berjalan. Pengguna tidak perlu menghapus atau memasang ulang app.

Cek bahwa pembaruan terpasang: **Profil → Pengaturan → Tentang aplikasi → Pembaruan**. Barisnya berubah dari
`bawaan build` menjadi 8 karakter ID pembaruan.

## 2. Build baru (instal APK baru) — untuk perubahan native

WAJIB build ulang bila perubahan menyentuh:
- paket baru yang punya kode native (apa pun yang dipasang lewat `npx expo install` yang berisi modul native),
- `app.json`: ikon, splash, izin, plugin, package ID, `scheme`, konfigurasi Android,
- ikon dan splash (`assets/images/icon.png`, `splash-icon.png`, `android-icon-*.png`),
- peningkatan versi Expo SDK atau React Native.

```bash
npx eas-cli build --platform android --profile preview
```

### Aturan runtime (penting)
`runtimeVersion` memakai kebijakan `appVersion`: nilainya sama dengan `version` di `app.json` (sekarang `1.0.0`).
Pembaruan hanya dikirim ke build dengan runtime yang SAMA.

- Bila Anda membuat perubahan native, **naikkan `version`** di `app.json` (mis. `1.0.1`) lalu build ulang.
  Build lama (1.0.0) tidak akan menerima pembaruan 1.0.1, sehingga tidak ada app lama yang menjalankan kode
  JavaScript yang butuh modul native yang tidak dimilikinya (itu akan membuatnya crash).
- Bila Anda **lupa** menaikkan `version` setelah perubahan native, pembaruan akan dikirim ke build lama dan
  bisa membuatnya crash. Ini satu-satunya jebakan jalur ini.

## Saluran (channel)
| Profil build | Saluran | Catatan |
|---|---|---|
| `preview` | `preview` | Beta internal (APK). Terhubung ke project Supabase yang ada di variabel lingkungan EAS `preview` |
| `production` | `production` | Play Store nanti |

Saluran ditetapkan **saat build** dan tidak bisa diubah tanpa build ulang. `eas update --channel preview` hanya
mencapai build `preview`.

## Variabel lingkungan saat memperbarui
`eas update` membundel JavaScript dari komputer Anda memakai `.env` lokal. Pastikan `.env` yang dipakai saat
memperbarui menunjuk ke project Supabase yang sama dengan build `preview` (sekarang `reson-dev`). Bila `.env`
menunjuk project lain, pembaruan akan membuat app beta pindah backend. Versi EAS CLI yang lebih baru juga mendukung
`--environment preview` untuk memakai variabel dari EAS; periksa dengan `npx eas-cli update --help`.

## Membatalkan pembaruan yang buruk
```bash
npx eas-cli update:list --branch preview
```
Lalu terbitkan ulang pembaruan sebelumnya yang baik (`npx eas-cli update:republish`, ikuti petunjuknya). Pengguna
menerimanya lewat alur yang sama (unduh, lalu mulai ulang). Pembaruan yang sudah terlanjur diterapkan tidak ditarik
paksa dari HP; ia tergantikan saat pembaruan berikutnya diterapkan.

## Yang TIDAK bisa lewat pembaruan
Kode native, ikon dan splash, izin Android, dan peningkatan SDK. Semua itu butuh build baru (jalur 2).
