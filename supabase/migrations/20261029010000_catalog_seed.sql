-- T13.1: katalog awal kecil. Angka spesifikasi HANYA yang konsisten di beberapa sumber pihak
-- ketiga (retailer/ulasan) saat dikumpulkan; halaman resmi produsen tidak ditemukan, jadi tiap
-- entri membawa "Catatan sumber" dan tautan sumber. Perangkat tanpa sumber yang jelas dimasukkan
-- tanpa spesifikasi (admin melengkapinya). Tidak ada harga. Aman dijalankan ulang.

create unique index devices_name_lower_unique on devices (name_lower);

insert into devices (name, brand, category, specs, source_url) values
  ('Moondrop Chu II', 'Moondrop', 'iem',
    jsonb_build_object(
      'Driver', 'Dinamis 10 mm',
      'Impedansi', '18 Ω ±15%',
      'Sensitivitas', '119 dB (satuan Vrms atau mW berbeda antar sumber)',
      'Konektor', '0,78 mm 2-pin',
      'Catatan sumber', 'Dari listing pihak ketiga; belum diverifikasi dari situs produsen.'),
    'https://www.audiophonics.fr/en/in-ear-earphones/moondrop-chu-ii-in-ear-monitors-iem-dynamic-10mm-119db-18-ohm-15hz-38khz-p-18075.html'),
  ('Simgot EW200', 'Simgot', 'iem',
    jsonb_build_object(
      'Driver', 'Dinamis 10 mm',
      'Impedansi', '16 Ω ±15%',
      'Sensitivitas', '126 dB/Vrms',
      'Konektor', '0,78 mm 2-pin',
      'Catatan sumber', 'Dari ulasan dan listing pihak ketiga; belum diverifikasi dari situs produsen.'),
    'https://www.headphonesty.com/2023/08/review-simgot-ew200-maze/'),
  ('Simgot EW300', 'Simgot', 'iem', '{}'::jsonb, null),
  ('7Hz Salnotes Zero 2', '7Hz', 'iem', '{}'::jsonb, null),
  ('Sennheiser HD 600', 'Sennheiser', 'headphone',
    jsonb_build_object(
      'Tipe', 'Terbuka (open-back), dinamis',
      'Impedansi', '300 Ω',
      'Sensitivitas', '97 dB (basis pengukuran berbeda antar sumber)',
      'Catatan sumber', 'Dari referensi pihak ketiga; belum diverifikasi dari situs produsen.'),
    'https://www.stereophile.com/content/sennheiser-hd-600-headphones-specifications'),
  ('Audio-Technica ATH-M50x', 'Audio-Technica', 'headphone',
    jsonb_build_object(
      'Tipe', 'Tertutup (closed-back), dinamis',
      'Driver', '45 mm',
      'Impedansi', '38 Ω',
      'Sensitivitas', '99 dB (basis pengukuran berbeda antar sumber)',
      'Respons frekuensi', '15 Hz – 28 kHz',
      'Catatan sumber', 'Dari listing pihak ketiga; belum diverifikasi dari situs produsen.'),
    'https://audiophonics.fr/en/audio-headphones/audio-technica-ath-m50x-closed-back-dynamic-circumaural-headphone-o45mm-38-99db-15hz-28khz-p-18000.html')
on conflict (name_lower) do nothing;
