/** returnTo hanya boleh path internal ("/x"), bukan URL lain atau "//host". */
export function safeReturnTo(value: string | null | undefined, fallback = '/home'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}
