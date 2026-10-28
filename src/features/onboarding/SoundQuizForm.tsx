import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors, minTouchTarget, radius, spacing } from '@/theme';
import { CONTEXTS, GENRES, MAX_GENRES, emptySoundProfile, type SoundProfileInput } from '@shared/validation/soundProfile';

type Step = 'genres' | 'bass' | 'vocals' | 'treble' | 'contexts';
const STEPS: Step[] = ['genres', 'bass', 'vocals', 'treble', 'contexts'];

const TRAITS = {
  bass: { title: 'Seberapa kamu suka bass?', help: 'Bass adalah dentuman rendah, seperti drum kick dan gitar bass. 1 = ringan, 5 = sangat terasa.' },
  vocals: { title: 'Seberapa penting vokal terdengar jelas?', help: 'Vokal adalah suara penyanyi. 1 = tidak terlalu penting, 5 = sangat penting.' },
  treble: { title: 'Seberapa suka kamu bunyi tinggi yang tajam?', help: 'Treble adalah bunyi tinggi, seperti hi-hat dan denting. 1 = lembut, 5 = sangat berkilau.' },
} as const;

function Chip({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: minTouchTarget,
        paddingHorizontal: spacing.md,
        justifyContent: 'center',
        borderRadius: radius.sm,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.accent : colors.borderStrong,
        backgroundColor: colors.surface,
        opacity: disabled ? 0.4 : 1,
      }}>
      <Text style={{ color: colors.text }}>{selected ? `✓ ${label}` : label}</Text>
    </Pressable>
  );
}

/**
 * Kuis selera suara. State seluruh jawaban dipegang di sini, sehingga pindah langkah
 * (maju/mundur) tidak menghapus input. "Belum tahu" disimpan sebagai null.
 */
export function SoundQuizForm({ initial, submitLabel, onSubmit }: {
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

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={{ color: colors.textSecondary }}>{`Langkah ${index + 1} dari ${STEPS.length}`}</Text>

      {step === 'genres' && (
        <>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>Musik apa yang sering kamu dengar?</Text>
          <Text style={{ color: colors.textSecondary }}>{`Pilih sampai ${MAX_GENRES} genre. Boleh dikosongkan jika belum yakin.`}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {GENRES.map((g) => {
              const selected = value.genres.includes(g.id);
              return <Chip key={g.id} label={g.label} selected={selected} disabled={!selected && value.genres.length >= MAX_GENRES} onPress={() => toggle('genres', g.id)} />;
            })}
          </View>
          {value.genres.length >= MAX_GENRES && <Text style={{ color: colors.textSecondary }}>Maksimal 5 genre tercapai.</Text>}
        </>
      )}

      {(step === 'bass' || step === 'vocals' || step === 'treble') && (
        <>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{TRAITS[step].title}</Text>
          <Text style={{ color: colors.textSecondary }}>{TRAITS[step].help}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <View key={n} style={{ flex: 1 }}>
                <Chip label={String(n)} selected={value[step] === n} onPress={() => setValue((v) => ({ ...v, [step]: n }))} />
              </View>
            ))}
          </View>
          <Chip label="Belum tahu" selected={value[step] === null} onPress={() => setValue((v) => ({ ...v, [step]: null }))} />
        </>
      )}

      {step === 'contexts' && (
        <>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>Kapan kamu biasa mendengarkan?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {CONTEXTS.map((c) => (
              <Chip key={c.id} label={c.label} selected={value.contexts.includes(c.id)} onPress={() => toggle('contexts', c.id)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: minTouchTarget }}>
            <Text style={{ flex: 1, color: colors.text }}>Tampilkan Sound Profile saya dan ikut Match</Text>
            <Switch
              accessibilityLabel="Tampilkan Sound Profile dan ikut Match"
              value={value.discoverable}
              onValueChange={(d) => setValue((v) => ({ ...v, discoverable: d }))}
              trackColor={{ true: colors.accent, false: colors.borderStrong }}
            />
          </View>
        </>
      )}

      {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {index > 0 && <View style={{ flex: 1 }}><Button title="Kembali" variant="secondary" onPress={() => setIndex(index - 1)} disabled={saving} /></View>}
        <View style={{ flex: 2 }}>
          {last ? <Button title={submitLabel} onPress={submit} loading={saving} /> : <Button title="Lanjut" onPress={() => setIndex(index + 1)} />}
        </View>
      </View>
    </View>
  );
}
