# Checklist uji di HP (T16.2 dan T16.3)

Isi kolom **Hasil** dengan LULUS / GAGAL / tidak diuji, dan catat versi Android, perangkat, serta catatan.
Laporan QA hanya boleh menyebut hasil yang terisi di sini.

Perangkat: ____________  Android: ____  Build: Expo Go / development build  Tanggal: ________

Gunakan **dua akun uji** (A dan B). Jangan pakai akun utama untuk bagian hapus akun.

## A. Pasang baru dan pemulihan sesi
| # | Langkah | Yang diharapkan | Hasil |
|---|---|---|---|
| A1 | Pasang baru, buka app | Splash lalu layar masuk, tanpa kilasan layar yang salah | |
| A2 | Daftar akun A, lalu masuk | Pengenalan, kuis, hasil, lalu Beranda | |
| A3 | Tutup app sepenuhnya, buka lagi | Langsung ke Beranda (sesi pulih) | |
| A4 | Keluar, lalu buka app | Layar masuk; draf post milik A tidak muncul di akun B | |
| A5 | Matikan internet, buka app saat sudah masuk | Pesan koneksi yang jelas, bukan layar kosong; ada tombol coba lagi | |

## B. Alur sosial (dua akun)
| # | Langkah | Yang diharapkan | Hasil |
|---|---|---|---|
| B1 | A dan B sama-sama gabung satu komunitas | Angka anggota naik tepat 1 per akun | |
| B2 | A buat post dengan 2 foto; B membukanya | Foto tampil di B | |
| B3 | B suka, simpan, komentar, dan A membalas | Angka sesuai; notifikasi muncul di A dan B; tidak ada notifikasi untuk aksi sendiri | |
| B4 | B ikuti A | Tab Mengikuti B menampilkan post A | |
| B5 | A buat review (pilih perangkat, status Sponsor) dan showcase (satu item katalog, satu item bebas) | Tampil benar; status sponsor terbaca jelas | |
| B6 | Match: kedua akun mengisi Sound Profile | Muncul kartu dengan label dan alasan, tanpa persentase | |
| B7 | A mengubah Sound Profile | Hasil Match A berubah tanpa menunggu 24 jam | |
| B8 | Jelajah: cari perangkat, post, pengguna; coba filter | Hasil awalan kata; kosong menampilkan kategori | |

## C. Moderasi dan blokir
| # | Langkah | Yang diharapkan | Hasil |
|---|---|---|---|
| C1 | A memblokir B | Post dan komentar saling hilang; follow terputus; B tidak muncul di Match A | |
| C2 | Setelah blokir, B mencoba ikuti A | Ditolak dengan pesan generik | |
| C3 | B melaporkan komentar A; akun moderator memprosesnya (sembunyikan) | Komentar hilang untuk orang lain; baris audit tercatat | |
| C4 | Buka tautan ke post yang disembunyikan | "Post tidak tersedia", tanpa membedakan penyebab | |
| C5 | Akun non-moderator | Tidak ada tombol Moderasi | |

## D. Hapus akun (akun uji saja)
| # | Langkah | Yang diharapkan | Hasil |
|---|---|---|---|
| D1 | Hapus akun dengan password salah | Ditolak | |
| D2 | Hapus akun dengan password benar | Progres tampil; kembali ke layar masuk; tidak bisa masuk lagi | |
| D3 | Periksa dashboard | Auth user hilang; folder Storage kosong; `deletion_jobs` = completed; tombstone untuk balasan orang lain | |
| D4 | Putuskan koneksi di tengah penghapusan, buka lagi | "Penghapusan akun belum selesai" dan bisa dilanjutkan | |

## E. Ketahanan dan aksesibilitas (T16.3)
| # | Langkah | Yang diharapkan | Hasil |
|---|---|---|---|
| E1 | Jaringan lambat (mode data lambat / throttle) saat memuat feed dan mengunggah foto | Indikator memuat jelas; tidak macet tanpa pesan | |
| E2 | Internet putus saat menerbitkan post | Pesan galat, draf tidak hilang, retry tidak membuat duplikat | |
| E3 | Layar kecil (mis. 5 inci atau tampilan diperkecil) | Tidak ada teks terpotong atau tombol di luar layar | |
| E4 | Buka keyboard di composer, kolom komentar, dan kuis | Kolom yang diisi tetap terlihat; tombol tidak tertutup | |
| E5 | Ukuran font Android ke maksimum (Pengaturan > Tampilan) | Teks membesar; tidak ada yang terpotong; tombol tetap bisa diketuk | |
| E6 | Aktifkan "Hapus animasi" (Reduce Motion) lalu buka pengenalan | Ilustrasi langsung utuh, tanpa animasi | |
| E7 | Nyalakan TalkBack; masuk, buka Beranda, buat komentar | Semua tombol dan kolom dibacakan dengan nama yang jelas; status terpilih dibacakan | |
| E8 | Mode terang paksa atau tema kontras tinggi bila tersedia | Teks dan batas kontrol tetap terlihat | |
| E9 | Rotasi layar | Aplikasi dikunci potret; tidak crash | |

## F. Biaya dan baca (T16.4) — dari dashboard Supabase setelah sesi uji
| # | Periksa | Yang diharapkan | Hasil |
|---|---|---|---|
| F1 | Reports > API: jumlah permintaan saat membuka Beranda, komunitas, post | Tidak ada lonjakan berulang tanpa interaksi (tidak ada polling) | |
| F2 | Storage: ukuran foto avatar dan post | Puluhan sampai ratusan KB, bukan MB | |
| F3 | Batas paket gratis (DB, Storage, bandwidth, MAU) | Pemakaian masih jauh di bawah batas | |
| F4 | Storage setelah membatalkan unggahan dan menghapus post | Tidak ada berkas yatim yang menumpuk | |

## Uji akses antar-akun (otomatis, dijalankan manual)
1. Salin `.env.test.example` menjadi `.env.test`, isi dua akun yang sudah ada.
2. `npm run check:access`
3. Lampirkan keluarannya di laporan QA. **Semua pemeriksaan harus LULUS** sebelum rilis.
