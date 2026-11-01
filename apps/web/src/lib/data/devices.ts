import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@db';

export type DeviceOption = { id: string; name: string; brand: string; category: string };

export const PICKER_PAGE = 20;

/** Karakter khusus LIKE (% _ \) di input pengguna diperlakukan sebagai teks biasa. */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Normalisasi sama dengan server: huruf kecil, spasi ganda dirapatkan. */
export const normalizeName = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Pencarian awalan (prefix) pada nama. Bukan pencarian teks penuh atau fuzzy. */
export async function searchDevices(supabase: SupabaseClient<Database>, q: string): Promise<{ items: DeviceOption[]; error: boolean }> {
  let query = supabase.from('devices').select('id, name, brand, category').eq('status', 'active');
  const term = q.trim().toLowerCase();
  if (term) query = query.ilike('name_lower', `${escapeLike(term)}%`);
  const { data, error } = await query.order('name_lower', { ascending: true }).order('id', { ascending: true }).limit(PICKER_PAGE);
  if (error) return { items: [], error: true };
  return { items: data, error: false };
}

/**
 * Label pertama dari item bebas yang namanya sudah ada di katalog (atau null).
 * Pengecekan cepat agar pengguna tahu sebelum menerbitkan; server tetap penentu.
 */
export async function findCatalogConflict(supabase: SupabaseClient<Database>, freeLabels: string[]): Promise<string | null> {
  const wanted = freeLabels.map((l) => ({ label: l.trim(), key: normalizeName(l) })).filter((x) => x.key);
  if (!wanted.length) return null;
  const { data } = await supabase.from('devices').select('name_lower').eq('status', 'active').in('name_lower', wanted.map((w) => w.key));
  const hit = new Set((data ?? []).map((d) => d.name_lower as string));
  return wanted.find((w) => hit.has(w.key))?.label ?? null;
}

export const catalogConflictMessage = (label: string) =>
  `"${label}" sudah ada di katalog. Pilih dari katalog supaya komponen terhubung ke perangkatnya.`;
