'use client';

import { useEffect, useRef, useState } from 'react';

import { CONTEXTS, GENRES, MAX_GENRES, emptySoundProfile, type SoundProfileInput } from '@shared/validation/soundProfile';

import { Choice, SmallButton } from './composer/fields';

type Step = 'genres' | 'bass' | 'vocals' | 'treble' | 'contexts';
const STEPS: Step[] = ['genres', 'bass', 'vocals', 'treble', 'contexts'];

const TRAITS = {
  bass: { title: 'Seberapa kamu suka bass?', help: 'Bass adalah dentuman rendah, seperti drum kick dan gitar bass. 1 = ringan, 5 = sangat terasa.' },
  vocals: { title: 'Seberapa penting vokal terdengar jelas?', help: 'Vokal adalah suara penyanyi. 1 = tidak terlalu penting, 5 = sangat penting.' },
  treble: { title: 'Seberapa suka kamu bunyi tinggi yang tajam?', help: 'Treble adalah bunyi tinggi, seperti hi-hat dan denting. 1 = lembut, 5 = sangat berkilau.' },
} as const;

/**
 * Kuis selera suara. State seluruh jawaban dipegang di sini, sehingga pindah langkah
 * (maju/mundur) tidak menghapus input. "Belum tahu" disimpan sebagai null.
 */
export function SoundQuizForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: SoundProfileInput | null;
  submitLabel: string;
  onSubmit: (value: SoundProfileInput) => Promise<string | null>;
}) {
  const [value, setValue] = useState<SoundProfileInput>(initial ?? emptySoundProfile);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  // Pindah langkah: fokus ke judul langkah baru (bukan saat pertama tampil).
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [index]);

  const toggle = (key: 'genres' | 'contexts', id: string) =>
    setValue((v) => ({ ...v, [key]: v[key].includes(id) ? v[key].filter((x) => x !== id) : [...v[key], id] }));

  async function submit() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const err = await onSubmit(value);
    setSaving(false);
    if (err) setError(err);
  }

  const h2 = 'text-xl font-semibold outline-none';

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted" aria-live="polite">
        Langkah {index + 1} dari {STEPS.length}
      </p>

      {step === 'genres' && (
        <>
          <h2 ref={heading} tabIndex={-1} className={h2}>
            Musik apa yang sering kamu dengar?
          </h2>
          <p className="text-muted">Pilih sampai {MAX_GENRES} genre. Boleh dikosongkan jika belum yakin.</p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => {
              const selected = value.genres.includes(g.id);
              return <Choice key={g.id} label={g.label} selected={selected} disabled={!selected && value.genres.length >= MAX_GENRES} onClick={() => toggle('genres', g.id)} />;
            })}
          </div>
          {value.genres.length >= MAX_GENRES && <p className="text-sm text-muted">Maksimal 5 genre tercapai.</p>}
        </>
      )}

      {(step === 'bass' || step === 'vocals' || step === 'treble') && (
        <>
          <h2 ref={heading} tabIndex={-1} className={h2}>
            {TRAITS[step].title}
          </h2>
          <p className="text-muted">{TRAITS[step].help}</p>
          <div className="grid grid-cols-5 gap-2 [&>button]:w-full">
            {[1, 2, 3, 4, 5].map((n) => (
              <Choice key={n} label={String(n)} selected={value[step] === n} onClick={() => setValue((v) => ({ ...v, [step]: n }))} />
            ))}
          </div>
          <div>
            <Choice label="Belum tahu" selected={value[step] === null} onClick={() => setValue((v) => ({ ...v, [step]: null }))} />
          </div>
        </>
      )}

      {step === 'contexts' && (
        <>
          <h2 ref={heading} tabIndex={-1} className={h2}>
            Kapan kamu biasa mendengarkan?
          </h2>
          <div className="flex flex-wrap gap-2">
            {CONTEXTS.map((c) => (
              <Choice key={c.id} label={c.label} selected={value.contexts.includes(c.id)} onClick={() => toggle('contexts', c.id)} />
            ))}
          </div>
          <label className="flex min-h-11 items-center justify-between gap-4">
            <span>Tampilkan Sound Profile saya dan ikut Match</span>
            <input
              type="checkbox"
              role="switch"
              checked={value.discoverable}
              onChange={(e) => setValue((v) => ({ ...v, discoverable: e.target.checked }))}
              className="h-6 w-6 accent-[#e77768]"
            />
          </label>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        {index > 0 && (
          <SmallButton onClick={() => setIndex(index - 1)} disabled={saving}>
            Kembali
          </SmallButton>
        )}
        {last ? (
          <button type="button" onClick={submit} disabled={saving} className="min-h-11 flex-1 rounded-md bg-accent px-5 font-medium text-bg disabled:opacity-60">
            {saving ? 'Menyimpan…' : submitLabel}
          </button>
        ) : (
          <button type="button" onClick={() => setIndex(index + 1)} className="min-h-11 flex-1 rounded-md bg-accent px-5 font-medium text-bg">
            Lanjut
          </button>
        )}
      </div>
    </div>
  );
}
