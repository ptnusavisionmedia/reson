// Tautan OAuth (reson://auth/callback?code=...) diselesaikan oleh openAuthSessionAsync di google.ts.
// Jangan biarkan router mencoba mencocokkannya sebagai layar; arahkan ke root, lalu guard memilih layar.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  if (path.includes('auth/callback')) return '/';
  return path;
}
