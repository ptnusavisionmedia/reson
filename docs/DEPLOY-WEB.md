# Deploy web Reson ke Vercel

Aplikasi web ada di `apps/web` (Next.js App Router, Supabase SSR). Backend tetap Supabase yang sama dengan app Android. EAS tidak dipakai untuk web.

Status: build bersih dari `git archive` (mirip Vercel) lulus. Belum pernah dideploy; hasil di Vercel belum diverifikasi.

## 0. Sebelum mulai

- [ ] Push semua commit: `git push origin main` (saat ini 16 commit belum terkirim).
- [ ] Siapkan akun Vercel yang terhubung ke GitHub `ptnusavisionmedia`.
- [ ] **Paket Vercel:** paket Hobby (gratis) ditujukan untuk pemakaian pribadi non-komersial. Karena Reson dikelola badan usaha, periksa ketentuan dan harga paket Pro sebelum rilis publik. Jangan menganggap gratis tanpa batas.
- [ ] Domain (opsional tapi disarankan untuk rilis). Tanpa domain, Vercel memberi `https://<nama>.vercel.app`.

## 1. Buat project di Vercel

1. Vercel → Add New → Project → pilih repo `reson`.
2. **Root Directory:** `apps/web`.
3. Framework Preset: Next.js (terdeteksi otomatis). Build/Install/Output command: biarkan default.
4. **Wajib:** buka Settings → General → Root Directory, aktifkan
   **"Include source files outside of the Root Directory in the Build Step"**.
   Web mengimpor `shared/`, `src/utils/`, `src/types/database.ts`, dan `src/features/account/deletionFlow.ts` dari luar `apps/web`. Tanpa opsi ini build gagal.
5. Node.js version: otomatis dari `engines` (`22.x`).
6. Environment Variables (Production **dan** Preview), isi **sebelum** deploy pertama karena nilainya tertanam saat build:

   | Nama | Nilai |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |

   Jangan pernah mengisi `service_role` di mana pun. Web tidak memakainya.
7. Deploy.

> Catatan teknis: `apps/web/tsconfig.json` memetakan `zod` ke `apps/web/node_modules`, karena `shared/validation/*.ts` berada di luar `apps/web` dan Vercel hanya menjalankan `npm install` di dalamnya. Jangan dihapus.

## 2. Konfigurasi Supabase (wajib, kalau tidak login gagal)

Authentication → URL Configuration:

- **Site URL:** `https://<domain-produksi>` (ganti dari `http://localhost:3000`).
- **Redirect URLs** (tambahkan semuanya, Save):
  - `https://<domain-produksi>/auth/callback`
  - `https://<nama>.vercel.app/auth/callback` (jika masih dipakai)
  - `http://localhost:3000/auth/callback` (dev)
  - `reson://auth/callback` (Android, sudah ada)
  - Hapus `exp://192.168.…` sebelum rilis.
- Preview deployment (opsional, longgarkan hanya jika perlu): `https://*-<tim>.vercel.app/auth/callback`. Preview memakai database yang sama, jadi pakai akun uji saja.

## 3. Konfigurasi Google (tidak perlu diubah untuk domain web)

- **Authorized redirect URI** di Google Cloud tetap hanya `https://<project-ref>.supabase.co/auth/v1/callback`. Domain Vercel **tidak** ditambahkan di sana.
- **OAuth consent screen:** ubah Publishing status dari *Testing* ke *In production*. Selama *Testing*, hanya test user yang bisa login Google.
- Isi halaman beranda dan tautan kebijakan privasi setelah legal final (scope `email`, `profile`, `openid` tidak sensitif, jadi tidak perlu verifikasi penuh, tapi branding butuh tautan itu).

## 4. Pengaturan Auth untuk produksi

Selama dev, **Confirm email dimatikan**. Untuk produksi:

- [ ] Aktifkan **Confirm email**. Server sudah mewajibkan email terverifikasi untuk aksi sosial.
- [ ] Pasang **SMTP kustom** (Authentication → Emails → SMTP). SMTP bawaan Supabase sangat dibatasi dan hanya cocok untuk uji, sehingga verifikasi dan reset password akan gagal terkirim ke pengguna umum.
- [ ] Periksa **Rate Limits** dan **Attack Protection** (CAPTCHA opsional).
- [ ] Sesuaikan template email (bahasa Indonesia) dan pastikan tautannya memakai Site URL baru.

## 5. Domain

Vercel → Project → Settings → Domains → tambahkan domain, ikuti instruksi DNS. HTTPS otomatis. Setelah aktif, ulangi langkah 2 dengan domain itu.

## 6. Uji setelah deploy (smoke test)

Pakai akun uji, bukan akun utama.

1. `/` dan `/login` terbuka, `/home` tanpa login mengarah ke `/login`.
2. Login email, Login Google (akun baru dan akun lama), reset password.
3. Alur lengkap: Lengkapi profil → pengenalan → kuis → Beranda.
4. Buat post dengan foto (cek bucket `post-images`), komentar, like, ikuti.
5. Cek di Android: post dari web terbaca, komentar dari Android muncul di web.
6. Hapus akun uji (password dan Google).
7. DevTools → Network: tidak ada permintaan ke `service_role`, header `Cache-Control: private, no-store` pada halaman privat.

## 7. Rollback

- Web: Vercel → Deployments → pilih deployment sebelumnya → **Promote to Production** (instan).
- Database: jangan rollback schema secara destruktif. Migrasi bersifat additive agar APK lama tetap jalan.

## 8. Yang belum siap untuk rilis publik

- [ ] **Dokumen legal masih draf** (14 bagian `[[ISI: …]]`, jalankan `npm run check:legal`). Rute `/privacy` dan `/delete-account` belum ada di Next; isinya masih di folder `web/` (HTML statis). Pindahkan setelah data pengelola terisi.
- [ ] Belum ada tes browser otomatis (Playwright) dan tes lintas platform terotomasi.
- [ ] Edit post, panel moderasi staf, dan daftar perangkat "punya/incar" belum ada di web.
- [ ] Rekonsiliasi foto yatim di server (terjadwal) belum dibuat.
- [ ] Tidak ada pemantauan error (mis. Sentry) dan alert. Sementara andalkan Vercel Logs dan Supabase Logs.
