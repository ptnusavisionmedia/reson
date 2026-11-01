import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@db';

export type DeviceOption = { id: string; name: string; brand: string; category: string };

export const PICKER_PAGE = 20;

export const DEVICE_CATEGORIES = [
  { id: 'iem', label: 'IEM' },
  { id: 'earbuds', label: 'Earbuds' },
  { id: 'headphone', label: 'Headphone' },
  { id: 'dac_amp', label: 'DAC / Amp' },
  { id: 'dap', label: 'DAP' },
] as const;
export const categoryLabel = (id: string) => DEVICE_CATEGORIES.find((c) => c.id === id)?.label ?? id;

export const DEVICE_PAGE = 20;

export type DeviceItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  specs: Record<string, string>;
  sourceUrl: string | null;
};

type DeviceRow = { id: string; name: string; brand: string; category: string; image_path: string | null; specs: unknown; source_url: string | null };
const DEVICE_SELECT = 'id, name, brand, category, image_path, specs, source_url';

function toDevice(supabase: SupabaseClient<Database>, r: DeviceRow): DeviceItem {
  const specs: Record<string, string> = {};
  if (r.specs && typeof r.specs === 'object' && !Array.isArray(r.specs)) {
    for (const [k, v] of Object.entries(r.specs as Record<string, unknown>)) {
      if (typeof v === 'string' || typeof v === 'number') specs[k] = String(v);
    }
  }
  return {
    id: r.id,
    name: r.name,
    brand: r.brand,
    category: r.category,
    imageUrl: r.image_path ? supabase.storage.from('device-images').getPublicUrl(r.image_path).data.publicUrl : null,
    specs,
    sourceUrl: r.source_url,
  };
}

/** Katalog dengan filter kategori, pagination offset. Pencarian awalan nama, bukan teks penuh. */
export async function searchDevicePage(
  supabase: SupabaseClient<Database>,
  opts: { q: string; category: string | null; offset: number },
): Promise<{ items: DeviceItem[]; error: boolean }> {
  let query = supabase.from('devices').select(DEVICE_SELECT).eq('status', 'active');
  const q = opts.q.trim().toLowerCase();
  if (q) query = query.ilike('name_lower', `${escapeLike(q)}%`);
  if (opts.category) query = query.eq('category', opts.category);
  const { data, error } = await query
    .order('name_lower', { ascending: true })
    .order('id', { ascending: true })
    .range(opts.offset, opts.offset + DEVICE_PAGE - 1);
  if (error) return { items: [], error: true };
  return { items: (data as DeviceRow[]).map((r) => toDevice(supabase, r)), error: false };
}

export async function fetchDevice(supabase: SupabaseClient<Database>, id: string): Promise<DeviceItem | null> {
  const { data } = await supabase.from('devices').select(DEVICE_SELECT).eq('id', id).eq('status', 'active').maybeSingle();
  return data ? toDevice(supabase, data as DeviceRow) : null;
}

export type UserRow = { id: string; username: string; displayName: string; avatarUrl: string | null };
export const USER_PAGE = 20;

/** Pencarian username berdasarkan awalan. Akun non-aktif sudah disaring RLS. */
export async function searchUserPage(supabase: SupabaseClient<Database>, q: string, offset: number): Promise<{ items: UserRow[]; error: boolean }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_path')
    .ilike('username', `${escapeLike(q.trim().toLowerCase())}%`)
    .order('username', { ascending: true })
    .range(offset, offset + USER_PAGE - 1);
  if (error) return { items: [], error: true };
  return {
    error: false,
    items: data.map((r) => ({
      id: r.id,
      username: r.username,
      displayName: r.display_name,
      avatarUrl: r.avatar_path ? supabase.storage.from('avatars').getPublicUrl(r.avatar_path).data.publicUrl : null,
    })),
  };
}

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
