import { supabase } from '@/lib/supabase/client';
import { serverErrorMessage } from '@/utils/errors';

export const DEVICE_CATEGORIES = [
  { id: 'iem', label: 'IEM' },
  { id: 'earbuds', label: 'Earbuds' },
  { id: 'headphone', label: 'Headphone' },
  { id: 'dac_amp', label: 'DAC / Amp' },
  { id: 'dap', label: 'DAP' },
] as const;

export const categoryLabel = (id: string) => DEVICE_CATEGORIES.find((c) => c.id === id)?.label ?? id;

export type DeviceItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  imagePath: string | null;
  specs: Record<string, string>;
  sourceUrl: string | null;
};

type Row = {
  id: string;
  name: string;
  brand: string;
  category: string;
  image_path: string | null;
  specs: unknown;
  source_url: string | null;
};

export const DEVICE_SELECT = 'id, name, brand, category, image_path, specs, source_url';

export function toDevice(r: Row): DeviceItem {
  const specs: Record<string, string> = {};
  if (r.specs && typeof r.specs === 'object' && !Array.isArray(r.specs)) {
    for (const [k, v] of Object.entries(r.specs as Record<string, unknown>)) {
      if (typeof v === 'string' || typeof v === 'number') specs[k] = String(v);
    }
  }
  return { id: r.id, name: r.name, brand: r.brand, category: r.category, imagePath: r.image_path, specs, sourceUrl: r.source_url };
}

/** Karakter khusus LIKE (% _ \) di input pengguna diperlakukan sebagai teks biasa. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export const DEVICE_PAGE = 20;

/** Pencarian awalan (prefix) pada nama. Bukan pencarian teks penuh atau fuzzy. */
export async function searchDevices(opts: { q: string; category: string | null; offset: number }): Promise<{ items: DeviceItem[] } | { error: string }> {
  let query = supabase.from('devices').select(DEVICE_SELECT).eq('status', 'active');
  const q = opts.q.trim().toLowerCase();
  if (q) query = query.ilike('name_lower', `${escapeLike(q)}%`);
  if (opts.category) query = query.eq('category', opts.category);
  const { data, error } = await query
    .order('name_lower', { ascending: true })
    .order('id', { ascending: true })
    .range(opts.offset, opts.offset + DEVICE_PAGE - 1);
  if (error) {
    console.warn('[searchDevices]', error.code, error.message);
    return { error: 'Tidak bisa memuat perangkat.' };
  }
  return { items: (data as Row[]).map(toDevice) };
}

export async function devicesByIds(ids: string[]): Promise<Record<string, DeviceItem>> {
  if (ids.length === 0) return {};
  const { data } = await supabase.from('devices').select(DEVICE_SELECT).in('id', ids);
  return Object.fromEntries((data as Row[] | null ?? []).map((r) => [r.id, toDevice(r)]));
}

export async function suggestDevice(input: { name: string; brand: string; sourceUrl: string }): Promise<string | null> {
  const { error } = await supabase.rpc('suggest_device', {
    p_name: input.name,
    p_brand: input.brand,
    p_source_url: (input.sourceUrl.trim() || null) as string,
  });
  if (!error) return null;
  if (error.message.includes('device exists')) return 'Perangkat ini sudah ada di katalog.';
  if (error.message.includes('invalid suggestion')) return 'Nama, merek, atau tautan tidak valid.';
  return serverErrorMessage(error);
}

/** Normalisasi sama dengan server: huruf kecil, spasi ganda dirapatkan. */
export const normalizeName = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Mengembalikan label pertama dari item bebas yang namanya sudah ada di katalog (atau null).
 * Hanya pengecekan cepat agar pengguna tahu sebelum menerbitkan; server tetap penentu.
 */
export async function findCatalogConflict(freeLabels: string[]): Promise<string | null> {
  const wanted = freeLabels.map((l) => ({ label: l.trim(), key: normalizeName(l) })).filter((x) => x.key);
  if (!wanted.length) return null;
  const { data } = await supabase.from('devices').select('name_lower').eq('status', 'active').in('name_lower', wanted.map((w) => w.key));
  const hit = new Set((data ?? []).map((d) => d.name_lower as string));
  return wanted.find((w) => hit.has(w.key))?.label ?? null;
}

export const catalogConflictMessage = (label: string) =>
  `"${label}" sudah ada di katalog. Pilih dari katalog supaya komponen terhubung ke perangkatnya.`;
