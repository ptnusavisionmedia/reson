// Jalur garis ilustrasi (viewBox 120x120), digambar sendiri. SETIAP string harus SATU subjalur
// (satu "M"), karena pola dash dimulai ulang di tiap subjalur dan animasi menggambar jalur satu per satu.
// Panjang tiap jalur dihitung oleh scripts/gen-illustration-lengths.ts ke illustrationLengths.ts.
export type IllustrationName = 'headphone' | 'iem' | 'waveform' | 'listener' | 'conversation';

export type Art = { paths: string[]; dot: [number, number] };

// Urutan array = urutan digambar.
export const ART: Record<IllustrationName, Art> = {
  headphone: {
    paths: [
      'M22 64 C22 30 98 30 98 64', // berhenti tepat di tepi atas earcup (y=64), tanpa menembus ke dalam
      'M22 64 Q12 64 12 74 V90 Q12 100 22 100 H28 V64 Z',
      'M98 64 Q108 64 108 74 V90 Q108 100 98 100 H92 V64 Z',
    ],
    dot: [60, 31],
  },
  iem: {
    paths: [
      'M24 90 C24 80 40 80 40 90 C40 102 24 102 24 90 Z',
      'M80 90 C80 80 96 80 96 90 C96 102 80 102 80 90 Z',
      'M32 80 C32 52 60 60 60 34',
      'M88 80 C88 52 60 60 60 34',
      'M60 34 V14',
    ],
    dot: [60, 14],
  },
  waveform: {
    paths: ['M8 60 H24 L32 38 L42 82 L52 28 L62 92 L72 44 L80 70 L88 60 H112'],
    dot: [112, 60],
  },
  listener: {
    paths: [
      'M44 46 A16 16 0 1 1 76 46 A16 16 0 1 1 44 46',
      'M24 112 C24 84 96 84 96 112',
      'M38 44 C38 14 82 14 82 44',
      'M34 42 H40 V56 H34 Z',
      'M80 42 H86 V56 H80 Z',
    ],
    dot: [60, 18],
  },
  conversation: {
    paths: [
      'M14 20 H72 V62 H40 L26 76 V62 H14 Z',
      'M52 74 H106 V100 H94 V112 L82 100 H52 Z',
    ],
    dot: [26, 76],
  },
};

/** Tanda logo Reson: headphone + titik coral. Sama dengan ilustrasi 'headphone'. */
export const LOGO = ART.headphone;
