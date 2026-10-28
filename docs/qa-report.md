# Laporan QA (T16)

Tanggal: 2026-10-28. Bagian ini hanya memuat **hasil yang benar-benar dijalankan**. Yang belum dijalankan
ditulis terpisah di bagian "Belum diuji" dan tidak dihitung sebagai lulus.

## 1. Hasil pemeriksaan otomatis

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Tipe TypeScript (strict) | `npm run typecheck` | 0 error |
| Lint | `npx eslint src shared tests scripts` | 0 temuan (aturan `import/*` dimatikan, lihat §4) |
| Unit test | `npm test` | **37 lulus** dari 37: Taste Match 11, teks notifikasi 9, alur hapus akun 7, kontras warna 10 |
| Paritas algoritma Match (TS lawan database) | `npm run check:parity` | 9 dari 9 fixture identik (skor, cakupan, label, alasan) |
| Lint skema database | `npx supabase db lint --linked` | Tidak ada error. 2 peringatan jinak (`taste_match_compute`, `prepare_post_details`: inisialisasi variabel dari literal `'{}'`) |
| Bundel Android | `npx expo export --platform android` | Berhasil |
| Audit statis | `npm run audit:static` | Bersih: 0 secret, 0 log sensitif, 0 `Pressable` tanpa `accessibilityRole`, 0 query tanpa batas, 0 aset demo |
| Audit dependensi | `npm audit --omit=dev` | 9 temuan (5 rendah, 4 tinggi), **semuanya di alat build Expo** (`@expo/cli`, `node-forge`, salinan `zod` milik Expo). Tidak ikut terkirim di aplikasi. Saran `npm audit fix --force` (menurunkan Expo ke 51) **tidak boleh diikuti**. `zod` milik proyek 4.6.7, di atas versi rentan |
| Izin database sebagai anon | `curl` per fungsi/tabel, tiap tugas | Semua fungsi RPC ditolak, semua tabel kosong atau ditolak, tulis langsung ditolak, bucket privat tidak terbuka |

### 1a. Uji akses antar-akun dengan sesi login nyata (`npm run check:access`)
Dijalankan pemilik pada 2026-10-28 dengan dua akun yang sudah ada. **Putaran pertama: 42 lulus, 1 gagal dari 43.**

Lulus di **kedua arah** (A terhadap B dan sebaliknya):
- A tidak bisa membaca data privat B: `accounts`, `device_lists`, `saved_posts`, `blocks`, `notifications`, `match_results`, `device_suggestions`, dan laporan (non-staf). Kontrol positif (profil publik terbaca) lulus, jadi pemeriksaan bermakna.
- 18 penulisan langsung ditolak oleh izin: ubah profil, status, `follower_count`, `role`, status dan `like_count` post, serta sisip post, komentar, follow, like, keanggotaan, notifikasi, laporan, blokir, hasil Match, katalog, dan `deletion_jobs`.
- 9 fungsi moderator, admin, dan internal ditolak untuk akun biasa.
- Folder `avatars/<pihak lain>` tidak terdaftar.

**Gagal di putaran pertama (1):** "A tidak bisa mendaftar `post-images/<B>`: 1 berkas terlihat". Penyebabnya **tes yang salah rancang**, bukan kebocoran: kebijakan Storage memang mengizinkan pengguna yang masuk membaca foto yang dipakai post yang sedang tampil, tetapi tesnya mengharapkan folder kosong. Tes diganti: setiap berkas yang terlihat harus tercantum di `image_paths` post tampil milik pihak itu, dan berkas lain dianggap kebocoran (unggahan belum terbit, post disembunyikan atau dihapus).

**Putaran kedua (tes diperbaiki): 45 lulus, 0 gagal dari 45.** A melihat 1 berkas dan B melihat 4 berkas di `post-images` milik pihak lain, **semuanya milik post yang tampil**.

**Yang TIDAK dicakup skrip ini** (tetap perlu diuji manual di HP, lihat `docs/qa-checklist.md` bagian B sampai D):
- Penyaringan blokir dua arah pada feed, komunitas, detail, dan komentar.
- Konten yang disembunyikan moderator tidak terbaca lewat tautan langsung, dan fotonya tidak terbaca orang lain.
- Foto dari post yang sudah dihapus tidak terbaca.
- Persyaratan email terverifikasi pada aksi sosial.
- Login ulang sebagai syarat hapus akun, dan jalannya penghapusan itu sendiri.
- Akun staf: skrip memakai dua akun non-staf, jadi jalur positif moderator tidak diuji.

### Temuan dan perbaikan dari pemeriksaan ini
- **Kontras batas kontrol (WCAG 1.4.11) gagal:** garis batas kolom isian, tombol sekunder, dan chip hanya **1,35:1** (minimal 3:1). Teks sendiri lulus (6,5 sampai 15,9:1). Diperbaiki dengan token `borderStrong` (3,55:1 di atas latar, 3,20:1 di atas kartu) untuk semua kontrol interaktif. Dikunci oleh `tests/a11y/contrast.test.ts`.
- **Daftar blokir tak berbatas:** ditambah `limit(200)`.
- **Aset template Expo tertinggal** (8 berkas + folder `tabIcons`): dihapus.
- **Skrip `seed:dev` menunjuk berkas yang tidak ada:** dihapus (komunitas dan katalog masuk lewat migrasi).
- Skrip `scripts/audit.ts` awalnya melaporkan 9 query "tak berbatas" yang ternyata sebagian besar peringatan palsu (batas dipasang di pernyataan berikutnya); jendela deteksi dilebarkan, dan 1 temuan nyata (daftar blokir) diperbaiki.

## 2. Bug yang ditemukan lewat uji di HP selama pengerjaan (sudah diperbaiki)
Ditemukan saat pengguna menguji tiap tugas di perangkat Android sungguhan lewat Expo Go.

| Bug | Penyebab | Perbaikan |
|---|---|---|
| Avatar tersimpan tapi tidak tampil (berkas 14 byte) | `fetch(uri).arrayBuffer()` tidak andal di React Native | Ambil base64 langsung dari manipulator, ubah ke ArrayBuffer |
| Detail post "Gagal memuat" | Embed `profiles(...)` ambigu (beberapa jalur relasi) | Sebut nama FK (`profiles!posts_author_id_fkey`) |
| Teks kolom isi tak terbaca (menyatu dengan latar) | `{...props}` menimpa `style` dasar di komponen `Input` | Gabungkan gaya, bukan menimpa |
| Error `Ionicons.ttf` berulang | Unduhan font 390 KB dari Metro ke HP sesekali putus (Metro sendiri menyajikannya dengan benar) | Ikon tab diganti SVG buatan sendiri |
| Item bebas showcase menerima nama perangkat yang sudah ada di katalog | Server hanya mengecek label tidak kosong | Server menolak, app mengecek lebih dulu |
| `create_comment`/`follow_user` dsb. terbuka untuk anon (HTTP 204) | Supabase memberi `EXECUTE` ke `anon` secara eksplisit; `revoke from public` tidak cukup | `revoke ... from public, anon` pada semua fungsi |

## 3. Belum diuji (wajib sebelum rilis)
Tidak satu pun di bawah ini boleh dianggap lulus.

- **Skenario akses yang belum dicakup `check:access`:** blokir, konten disembunyikan, post dihapus, email terverifikasi, dan jalur staf (daftar lengkap di §1a). Itu hanya bisa diuji dengan data dan akun staf di HP.
- **Seluruh daftar di `docs/qa-checklist.md`** (T16.2 dan T16.3): pasang baru, pulihkan sesi, seluruh alur sosial, moderasi, hapus akun, jaringan lambat atau putus, layar kecil, keyboard, pembesaran font, Reduce Motion, TalkBack.
- **Pengukuran biaya dan baca** (T16.4): jumlah query per layar, ukuran foto nyata, perilaku saat batas gratis Supabase tercapai. Hanya ditinjau lewat kode (semua daftar berhalaman, tidak ada listener realtime, foto dikompres ke 512 atau 1600 px).
- **Pengujian otomatis RLS** di dalam CI: belum ada. Pengujian RLS saat ini hanya lewat `check:access` yang dijalankan manual.
- **Uji beban:** tidak ada.
- **Kontras warna yang dihitung hanya token tema.** Foto pengguna dan warna sistem Android (mode terang paksa, tema tinggi-kontras) belum diperiksa.

## 4. Masalah yang diketahui

| # | Masalah | Dampak | Keputusan |
|---|---|---|---|
| 1 | Ikon peluncur dan splash masih **gambar bawaan template Expo** | Harus diganti aset Reson sebelum rilis | Menunggu aset final (PRD §2.3) |
| 2 | `android.package` belum ditetapkan, belum ada `eas.json` | Blocker T17 | Menunggu keputusan pemilik |
| 3 | "Confirm email" Supabase **mati** untuk development; email bawaan kena batas laju | Verifikasi email belum teruji di alur nyata | Nyalakan lagi dan pasang SMTP sebelum pilot |
| 4 | Reset password di dalam app dan verifikasi lewat deep link belum ada (hanya kirim email) | F01 belum lengkap | Perlu deep link `reson://` |
| 5 | Layar intro animasi sebelum login belum ada (pengenalan muncul setelah daftar) | Menyimpang dari PRD §4.2 langkah 2 | Keputusan produk |
| 6 | Tab komunitas Populer dan Belum terjawab belum ada | F04 sebagian | `has_answers` sudah terisi |
| 7 | Komentar dimuat maksimal 300 per post, tanpa pagination | Post sangat ramai terpotong | Tambah pagination bila perlu |
| 8 | Foto yang terunggah lalu app dimatikan paksa tertinggal di Storage | Foto yatim (tidak terbaca orang lain) | Butuh job terjadwal (Edge Function) |
| 9 | Rate limit baru ada di post, komentar, laporan, usulan perangkat | Operasi lain (follow, like) belum dibatasi | Tinjau saat pilot |
| 10 | Tidak ada UI admin: tambah perangkat, proses usulan perangkat, atur komunitas dan sematan | Semua lewat dashboard Supabase | Di luar scope v1 |
| 11 | Daftar pengikut dan yang diikuti belum punya layar (hanya jumlah) | Kecil | |
| 12 | Aturan ESLint `import/*` dimatikan | `unrs-resolver` gagal dimuat di mesin ini (runtime Visual C++). Resolusi modul tetap dijaga `tsc` | Pasang VC++ Redistributable lalu nyalakan lagi |
| 13 | Bucket `avatars` publik | URL foto profil bisa dibuka tanpa login bila diketahui | Keputusan v1; ganti ke signed URL bila perlu |
| 14 | Halaman kebijakan privasi dan hapus akun masih **draf** (14 bagian `[[ISI: …]]`, termasuk periode retensi catatan moderasi) | Blocker T18 | `npm run check:legal` gagal sampai terisi |
| 15 | Folder proyek **belum menjadi repositori git** | Tidak ada riwayat perubahan | `git init` bila diinginkan |
| 16 | Penghitung reaksi, hasil Match, dan notifikasi tidak realtime | Perlu tarik-untuk-refresh atau pindah layar | Sesuai PRD (tanpa listener ke seluruh feed) |

## 5. Status blocker
PRD §T16.6: blocker data, akses, dan crash harus nol sebelum rilis.

- **Data:** tidak ada blocker data yang diketahui.
- **Akses:** tidak ada blocker yang diketahui. Anon bersih, dan uji antar-akun dengan sesi login **45 dari 45 lulus** (§1a). Ini hanya berlaku untuk yang dicakup skrip; skenario blokir, konten disembunyikan, dan hapus akun masih menunggu uji di HP, jadi status akhirnya baru bisa ditetapkan setelah checklist diisi.
- **Crash:** tidak ada crash yang dilaporkan selama uji per tugas, tapi belum ada uji sistematis di beberapa perangkat dan versi Android.
