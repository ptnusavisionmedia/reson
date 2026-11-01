'use client';

import { useEffect, useState } from 'react';

import { searchDevices, type DeviceOption } from '@/lib/data/devices';
import { createClient } from '@/lib/supabase/browser';

import { SmallButton, TextInput } from './fields';

const CATEGORY: Record<string, string> = { iem: 'IEM', earbuds: 'Earbuds', headphone: 'Headphone', dac_amp: 'DAC / Amp', dap: 'DAP' };

/** Pencarian katalog berdasarkan awalan nama. Bukan pencarian teks penuh. */
export function DevicePicker({ onPick, onClose, excludeIds = [] }: { onPick: (d: DeviceOption) => void; onClose: () => void; excludeIds?: string[] }) {
  const [q, setQ] = useState('');
  const [state, setState] = useState<{ q: string; items: DeviceOption[]; error: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await searchDevices(createClient(), q);
      if (!cancelled) setState({ q, ...res });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const loading = !state || state.q !== q;
  const items = (state?.items ?? []).filter((d) => !excludeIds.includes(d.id));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
      <TextInput label="Cari perangkat (awalan nama)" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div aria-live="polite" className="flex flex-col gap-2">
        {loading && <p className="text-sm text-muted">Memuat…</p>}
        {!loading && state?.error && <p className="text-sm text-accent">Tidak bisa memuat perangkat. Coba lagi.</p>}
        {!loading && !state?.error && items.length === 0 && (
          <p className="text-sm text-muted">Tidak ada perangkat yang cocok. Coba awalan nama lain.</p>
        )}
        {!loading &&
          items.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onPick(d)}
              className="flex min-h-11 flex-col items-start rounded-md border border-line bg-surface px-3 py-2 text-left hover:border-line-strong"
            >
              <span className="font-semibold">{d.name}</span>
              <span className="text-sm text-muted">
                {d.brand} • {CATEGORY[d.category] ?? d.category}
              </span>
            </button>
          ))}
      </div>
      <SmallButton onClick={onClose}>Tutup</SmallButton>
    </div>
  );
}
