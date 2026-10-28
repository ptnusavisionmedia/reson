import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/, 'Username 3–24 karakter: huruf kecil, angka, atau underscore.');

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Format email tidak valid.'));

export const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter.')
  .max(72, 'Password maksimal 72 karakter.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password wajib diisi.'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  displayName: z.string().trim().min(1, 'Nama wajib diisi.').max(50, 'Nama maksimal 50 karakter.'),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export function fieldErrors(error: z.ZodError): Record<string, string | undefined> {
  const flat = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0]]));
}
