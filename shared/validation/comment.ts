import { z } from 'zod';

export const COMMENT_MAX = 1000;

export const commentBodySchema = z
  .string()
  .trim()
  .min(1, 'Komentar tidak boleh kosong.')
  .max(COMMENT_MAX, 'Komentar maksimal 1.000 karakter.');
