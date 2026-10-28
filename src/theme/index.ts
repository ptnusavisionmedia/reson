// Token awal dari PRD §3.2. Kontras harus diuji sebelum final.
export const colors = {
  background: '#111214',
  surface: '#1B1D20',
  text: '#EEECE8',
  textSecondary: '#A7A5A0',
  accent: '#E77768',
  border: '#2A2D31', // garis halus untuk kartu dan pemisah (non-interaktif)
  borderStrong: '#686C72', // batas kontrol interaktif: kontras >= 3:1 (WCAG 1.4.11)
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 6, md: 10 } as const;
export const minTouchTarget = 44;
