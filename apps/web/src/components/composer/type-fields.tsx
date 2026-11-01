'use client';

import { useState } from 'react';

import type { DeviceRef, ReviewForm, ShowcaseForm } from '@/lib/composer/forms';
import { OWNERSHIP, REVIEW_LIMITS, SHOWCASE_LIMITS } from '@shared/validation/postDetails';

import { DevicePicker } from './device-picker';
import { Choice, SmallButton, TextArea, TextInput } from './fields';

function StringListEditor({ label, items, onChange, max, maxLength }: { label: string; items: string[]; onChange: (v: string[]) => void; max: number; maxLength: number }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm text-muted">
        {label} ({items.length}/{max})
      </legend>
      {items.map((v, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex-1">
            <TextInput label={`${label} ${i + 1}`} value={v} maxLength={maxLength} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          </div>
          <SmallButton onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Hapus ${label.toLowerCase()} ${i + 1}`}>
            Hapus
          </SmallButton>
        </div>
      ))}
      {items.length < max && <SmallButton onClick={() => onChange([...items, ''])}>Tambah {label.toLowerCase()}</SmallButton>}
    </fieldset>
  );
}

function DeviceField({ label, value, onPick }: { label: string; value: DeviceRef | null; onPick: (d: DeviceRef) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">{label}</p>
      {value && <p className="font-semibold">✓ {value.name}</p>}
      {open ? (
        <DevicePicker
          onPick={(d) => {
            onPick({ id: d.id, name: d.name });
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : (
        <div>
          <SmallButton onClick={() => setOpen(true)}>{value ? 'Ganti perangkat' : 'Pilih dari katalog'}</SmallButton>
        </div>
      )}
    </div>
  );
}

const NOTES = { maxLength: REVIEW_LIMITS.notes } as const;

export function ReviewFields({ value, onChange }: { value: ReviewForm; onChange: (v: ReviewForm) => void }) {
  const set = <K extends keyof ReviewForm>(k: K, v: ReviewForm[K]) => onChange({ ...value, [k]: v });
  const [pickingCompanion, setPickingCompanion] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <DeviceField label="Perangkat yang di-review (wajib)" value={value.device} onPick={(d) => set('device', d)} />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-muted">Status perangkat (wajib)</legend>
        <div className="flex flex-wrap gap-2">
          {OWNERSHIP.map((o) => (
            <Choice key={o.id} label={o.label} selected={value.ownership === o.id} onClick={() => set('ownership', o.id)} />
          ))}
        </div>
        {value.ownership === 'sponsored' && <p className="text-sm text-muted">Status sponsor akan ditampilkan jelas di review agar pembaca tahu.</p>}
      </fieldset>

      <p className="text-sm text-muted">Kesan suara bersifat subjektif dan bergantung pada telinga, sumber, dan musik yang kamu pakai.</p>
      <TextArea label="Kesan bass" value={value.bassNotes} onChange={(e) => set('bassNotes', e.target.value)} {...NOTES} />
      <TextArea label="Kesan vokal" value={value.vocalNotes} onChange={(e) => set('vocalNotes', e.target.value)} {...NOTES} />
      <TextArea label="Kesan treble" value={value.trebleNotes} onChange={(e) => set('trebleNotes', e.target.value)} {...NOTES} />
      <TextArea label="Kenyamanan" value={value.comfortNotes} onChange={(e) => set('comfortNotes', e.target.value)} {...NOTES} />

      <StringListEditor label="Kelebihan" items={value.pros} onChange={(v) => set('pros', v)} max={REVIEW_LIMITS.listItems} maxLength={REVIEW_LIMITS.listItemLength} />
      <StringListEditor label="Kekurangan" items={value.cons} onChange={(v) => set('cons', v)} max={REVIEW_LIMITS.listItems} maxLength={REVIEW_LIMITS.listItemLength} />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm text-muted">
          Perangkat pendamping ({value.companions.length}/{REVIEW_LIMITS.companions})
        </legend>
        {value.companions.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <span className="flex-1">{c.name}</span>
            <SmallButton onClick={() => set('companions', value.companions.filter((x) => x.id !== c.id))} aria-label={`Hapus ${c.name}`}>
              Hapus
            </SmallButton>
          </div>
        ))}
        {pickingCompanion ? (
          <DevicePicker
            excludeIds={[value.device?.id ?? '', ...value.companions.map((c) => c.id)]}
            onPick={(d) => {
              set('companions', [...value.companions, { id: d.id, name: d.name }]);
              setPickingCompanion(false);
            }}
            onClose={() => setPickingCompanion(false)}
          />
        ) : (
          value.companions.length < REVIEW_LIMITS.companions && <SmallButton onClick={() => setPickingCompanion(true)}>Tambah perangkat pendamping</SmallButton>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm text-muted">
          Lagu referensi ({value.tracks.length}/{REVIEW_LIMITS.tracks})
        </legend>
        {value.tracks.map((t, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-line p-3">
            <TextInput label={`Judul lagu ${i + 1}`} value={t.title} maxLength={REVIEW_LIMITS.trackTitle} onChange={(e) => set('tracks', value.tracks.map((y, j) => (j === i ? { ...y, title: e.target.value } : y)))} />
            <TextInput label={`Tautan lagu ${i + 1} (opsional)`} value={t.url} maxLength={REVIEW_LIMITS.trackUrl} type="url" placeholder="https://" onChange={(e) => set('tracks', value.tracks.map((y, j) => (j === i ? { ...y, url: e.target.value } : y)))} />
            <div>
              <SmallButton onClick={() => set('tracks', value.tracks.filter((_, j) => j !== i))}>Hapus lagu {i + 1}</SmallButton>
            </div>
          </div>
        ))}
        {value.tracks.length < REVIEW_LIMITS.tracks && <div><SmallButton onClick={() => set('tracks', [...value.tracks, { title: '', url: '' }])}>Tambah lagu referensi</SmallButton></div>}
        <p className="text-xs text-muted">Tautan dibuka di situs lain. Reson tidak menyimpan audio.</p>
      </fieldset>
    </div>
  );
}

export function ShowcaseFields({ value, onChange }: { value: ShowcaseForm; onChange: (v: ShowcaseForm) => void }) {
  const set = <K extends keyof ShowcaseForm>(k: K, v: ShowcaseForm[K]) => onChange({ ...value, [k]: v });
  const update = (i: number, patch: Partial<ShowcaseForm['components'][number]>) =>
    set('components', value.components.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.components.length) return;
    const next = [...value.components];
    [next[i], next[j]] = [next[j], next[i]];
    set('components', next);
  };
  const [pickingFor, setPickingFor] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <TextInput label="Tujuan setup" value={value.purpose} maxLength={SHOWCASE_LIMITS.purpose} placeholder="mis. mendengarkan santai di meja kerja" onChange={(e) => set('purpose', e.target.value)} />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm text-muted">
          Komponen berurutan, mis. HP → DAC → IEM ({value.components.length}/{SHOWCASE_LIMITS.components})
        </legend>
        {value.components.map((c, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-line p-3">
            <TextInput label={`Komponen ${i + 1}`} value={c.label} maxLength={SHOWCASE_LIMITS.label} onChange={(e) => update(i, { label: e.target.value })} />
            <p className="text-sm text-muted">{c.device ? `Dari katalog: ${c.device.name}` : 'Item bebas (belum dikaitkan ke katalog, tidak diverifikasi).'}</p>
            {pickingFor === i ? (
              <DevicePicker
                onPick={(d) => {
                  update(i, { device: { id: d.id, name: d.name }, label: c.label.trim() ? c.label : d.name });
                  setPickingFor(null);
                }}
                onClose={() => setPickingFor(null)}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                <SmallButton onClick={() => setPickingFor(i)}>{c.device ? 'Ganti katalog' : 'Pilih dari katalog'}</SmallButton>
                {c.device && <SmallButton onClick={() => update(i, { device: null })}>Jadikan item bebas</SmallButton>}
                <SmallButton onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Naikkan komponen ${i + 1}`}>↑</SmallButton>
                <SmallButton onClick={() => move(i, 1)} disabled={i === value.components.length - 1} aria-label={`Turunkan komponen ${i + 1}`}>↓</SmallButton>
                <SmallButton onClick={() => set('components', value.components.filter((_, j) => j !== i))} disabled={value.components.length === 1}>
                  Hapus
                </SmallButton>
              </div>
            )}
          </div>
        ))}
        {value.components.length < SHOWCASE_LIMITS.components && (
          <div><SmallButton onClick={() => set('components', [...value.components, { device: null, label: '' }])}>Tambah komponen</SmallButton></div>
        )}
      </fieldset>

      <TextArea label="Kesan pemilik" value={value.impressions} maxLength={SHOWCASE_LIMITS.impressions} onChange={(e) => set('impressions', e.target.value)} />
    </div>
  );
}
