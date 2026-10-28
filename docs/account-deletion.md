# Penghapusan akun

Ada dua jalur. Keduanya memakai logika penghapusan data yang sama (`deletion_step` di
`supabase/migrations/20261031000000_account_deletion.sql`).

## 1. Lewat aplikasi (otomatis)

Profil → Pengaturan → Hapus akun. Urutannya:

1. **Login ulang** dengan password. Server menolak (`reauth required`) bila sesi Auth tidak dibuat dalam 5 menit terakhir.
2. `request_account_deletion` menandai akun `deleting`. Sejak itu semua aksi tulis ditolak (RPC mensyaratkan status `active`).
3. Aplikasi menghapus foto di bucket `avatars` dan `post-images` milik akun itu (Storage tidak bisa dibersihkan dari SQL tanpa meninggalkan berkas yatim).
4. `process_account_deletion` dipanggil berulang sampai `done`. Tiap panggilan berbatas (maks 500 baris per jenis data) dan idempoten.
5. `finalize_account_deletion` menghapus akun Auth; profil, akun, dan Sound Profile ikut terhapus lewat `ON DELETE CASCADE`.

Bila terputus (koneksi, aplikasi ditutup), akun tetap `deleting`. Saat masuk lagi, aplikasi menampilkan
**Penghapusan akun belum selesai → Lanjutkan penghapusan**, yang mengulang tahap 3–5 dengan aman.

## 2. Permintaan lewat email (manual)

Halaman web `web/delete-account.html` menjanjikan jalur ini. Tidak ada formulir; permintaan datang lewat email.

1. **Verifikasi pemohon.** Permintaan hanya diproses bila dikirim dari alamat email yang terdaftar di akun. Cocokkan di dashboard Supabase → Authentication → Users. Jika berbeda, balas ke alamat terdaftar dan minta konfirmasi dari sana.
2. Catat **UUID** akun (Authentication → Users).
3. **Hapus foto** di dashboard Storage: folder `avatars/<uuid>` dan `post-images/<uuid>`. (SQL tidak menghapus berkas fisiknya.)
4. Di **SQL Editor** (peran `postgres`), jalankan:

   ```sql
   select admin_delete_account('<uuid>');
   ```

   Hasilnya `selesai`. Fungsi ini tidak dapat dipanggil dari aplikasi atau peran klien mana pun.
5. **Periksa:** akun sudah tidak ada di Authentication → Users, dan

   ```sql
   select * from deletion_jobs where user_id = '<uuid>';
   ```

   berstatus `completed`.
6. Kirim konfirmasi ke pemohon dalam batas waktu yang tertulis di halaman web.

## Yang dipertahankan (harus sama dengan kebijakan privasi)

- Balasan orang lain di komentar utama akun: tombstone tanpa isi dan tanpa identitas.
- `reports`: identitas pelapor dikosongkan (`reporter_id` menjadi null).
- `moderation_audit`: tidak berubah (berisi ID moderator, ID target, alasan).
- `deletion_jobs`: ID akun, status, dan waktu.
- Lama retensi catatan moderasi **belum ditetapkan**; harus diputuskan pemilik layanan dan ditulis di kebijakan privasi sebelum rilis.
