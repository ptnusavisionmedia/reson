import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Input } from '@/components/ui';
import type { DeviceItem } from '@/features/devices/api';
import { DevicePicker } from '@/features/devices/DevicePicker';
import { colors, minTouchTarget, radius, spacing } from '@/theme';
import {
  OWNERSHIP,
  REVIEW_LIMITS,
  SHOWCASE_LIMITS,
  type Ownership,
  type ReviewDetails,
  type ShowcaseDetails,
  type StoredReview,
  type StoredShowcase,
} from '@shared/validation/postDetails';

export type DeviceRef = { id: string; name: string };

export type ReviewForm = {
  device: DeviceRef | null;
  ownership: Ownership | null;
  bassNotes: string;
  vocalNotes: string;
  trebleNotes: string;
  comfortNotes: string;
  pros: string[];
  cons: string[];
  companions: DeviceRef[];
  tracks: { title: string; url: string }[];
};

export type ShowcaseForm = {
  purpose: string;
  impressions: string;
  components: { device: DeviceRef | null; label: string }[];
};

export const emptyReview: ReviewForm = { device: null, ownership: null, bassNotes: '', vocalNotes: '', trebleNotes: '', comfortNotes: '', pros: [], cons: [], companions: [], tracks: [] };
export const emptyShowcase: ShowcaseForm = { purpose: '', impressions: '', components: [{ device: null, label: '' }] };

/** Bentuk yang dikirim ke server. Nilai kosong tetap dikirim; server memangkas dan memvalidasi. */
export function reviewPayload(f: ReviewForm): Partial<Record<keyof ReviewDetails, unknown>> {
  return {
    deviceId: f.device?.id,
    ownership: f.ownership ?? undefined,
    bassNotes: f.bassNotes,
    vocalNotes: f.vocalNotes,
    trebleNotes: f.trebleNotes,
    comfortNotes: f.comfortNotes,
    pros: f.pros,
    cons: f.cons,
    companionDeviceIds: f.companions.map((c) => c.id),
    referenceTracks: f.tracks,
  };
}

export function showcasePayload(f: ShowcaseForm): Partial<Record<keyof ShowcaseDetails, unknown>> {
  return {
    purpose: f.purpose,
    impressions: f.impressions,
    components: f.components.map((c) => ({ deviceId: c.device?.id ?? null, label: c.label })),
  };
}

export function reviewFromStored(s: StoredReview, names: Record<string, string>): ReviewForm {
  const ref = (id: string): DeviceRef => ({ id, name: names[id] ?? 'Perangkat' });
  return {
    device: ref(s.deviceId),
    ownership: s.ownership,
    bassNotes: s.bassNotes ?? '',
    vocalNotes: s.vocalNotes ?? '',
    trebleNotes: s.trebleNotes ?? '',
    comfortNotes: s.comfortNotes ?? '',
    pros: s.pros,
    cons: s.cons,
    companions: s.companionDeviceIds.map(ref),
    tracks: s.referenceTracks.map((t) => ({ title: t.title, url: t.url ?? '' })),
  };
}

export function showcaseFromStored(s: StoredShowcase, names: Record<string, string>): ShowcaseForm {
  return {
    purpose: s.purpose ?? '',
    impressions: s.impressions ?? '',
    components: s.components.length
      ? s.components.map((c) => ({ device: c.deviceId ? { id: c.deviceId, name: names[c.deviceId] ?? c.label } : null, label: c.label }))
      : emptyShowcase.components,
  };
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: minTouchTarget,
        paddingHorizontal: spacing.md,
        justifyContent: 'center',
        borderRadius: radius.sm,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.accent : colors.borderStrong,
        backgroundColor: colors.surface,
      }}>
      <Text style={{ color: colors.text }}>{selected ? `✓ ${label}` : label}</Text>
    </Pressable>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={{ color: colors.textSecondary }}>{children}</Text>;
}

function StringListEditor({ label, items, onChange, max, maxLength, placeholder }: {
  label: string; items: string[]; onChange: (v: string[]) => void; max: number; maxLength: number; placeholder: string;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Label>{`${label} (${items.length}/${max})`}</Label>
      {items.map((v, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Input label={`${label} ${i + 1}`} value={v} onChangeText={(t) => onChange(items.map((x, j) => (j === i ? t : x)))} maxLength={maxLength} placeholder={placeholder} />
          </View>
          <Button title="Hapus" variant="secondary" onPress={() => onChange(items.filter((_, j) => j !== i))} />
        </View>
      ))}
      {items.length < max && <Button title={`Tambah ${label.toLowerCase()}`} variant="secondary" onPress={() => onChange([...items, ''])} />}
    </View>
  );
}

function DeviceField({ label, value, onPick, onClear }: { label: string; value: DeviceRef | null; onPick: (d: DeviceItem) => void; onClear?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: spacing.sm }}>
      <Label>{label}</Label>
      {value && <Text style={{ color: colors.text, fontWeight: '600' }}>{`✓ ${value.name}`}</Text>}
      {open ? (
        <DevicePicker
          onPick={(d) => {
            onPick(d);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}><Button title={value ? 'Ganti perangkat' : 'Pilih dari katalog'} variant="secondary" onPress={() => setOpen(true)} /></View>
          {value && onClear && <Button title="Lepas" variant="secondary" onPress={onClear} />}
        </View>
      )}
    </View>
  );
}

export function ReviewFields({ value, onChange }: { value: ReviewForm; onChange: (v: ReviewForm) => void }) {
  const set = <K extends keyof ReviewForm>(k: K, v: ReviewForm[K]) => onChange({ ...value, [k]: v });
  const [pickingCompanion, setPickingCompanion] = useState(false);
  return (
    <View style={{ gap: spacing.md }}>
      <DeviceField label="Perangkat yang di-review (wajib)" value={value.device} onPick={(d) => set('device', { id: d.id, name: d.name })} />

      <Label>Status perangkat (wajib)</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {OWNERSHIP.map((o) => (
          <Chip key={o.id} label={o.label} selected={value.ownership === o.id} onPress={() => set('ownership', o.id)} />
        ))}
      </View>
      {value.ownership === 'sponsored' && (
        <Text style={{ color: colors.textSecondary }}>Status sponsor akan ditampilkan jelas di review agar pembaca tahu.</Text>
      )}

      <Text style={{ color: colors.textSecondary }}>Kesan suara bersifat subjektif dan bergantung pada telinga, sumber, dan musik yang kamu pakai.</Text>
      <Input label="Kesan bass" value={value.bassNotes} onChangeText={(t) => set('bassNotes', t)} multiline maxLength={REVIEW_LIMITS.notes} style={{ minHeight: 64, textAlignVertical: 'top' }} />
      <Input label="Kesan vokal" value={value.vocalNotes} onChangeText={(t) => set('vocalNotes', t)} multiline maxLength={REVIEW_LIMITS.notes} style={{ minHeight: 64, textAlignVertical: 'top' }} />
      <Input label="Kesan treble" value={value.trebleNotes} onChangeText={(t) => set('trebleNotes', t)} multiline maxLength={REVIEW_LIMITS.notes} style={{ minHeight: 64, textAlignVertical: 'top' }} />
      <Input label="Kenyamanan" value={value.comfortNotes} onChangeText={(t) => set('comfortNotes', t)} multiline maxLength={REVIEW_LIMITS.notes} style={{ minHeight: 64, textAlignVertical: 'top' }} />

      <StringListEditor label="Kelebihan" items={value.pros} onChange={(v) => set('pros', v)} max={REVIEW_LIMITS.listItems} maxLength={REVIEW_LIMITS.listItemLength} placeholder="Satu poin singkat" />
      <StringListEditor label="Kekurangan" items={value.cons} onChange={(v) => set('cons', v)} max={REVIEW_LIMITS.listItems} maxLength={REVIEW_LIMITS.listItemLength} placeholder="Satu poin singkat" />

      <View style={{ gap: spacing.sm }}>
        <Label>{`Perangkat pendamping (${value.companions.length}/${REVIEW_LIMITS.companions})`}</Label>
        {value.companions.map((c) => (
          <View key={c.id} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <Text style={{ flex: 1, color: colors.text }}>{c.name}</Text>
            <Button title="Hapus" variant="secondary" onPress={() => set('companions', value.companions.filter((x) => x.id !== c.id))} />
          </View>
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
          value.companions.length < REVIEW_LIMITS.companions && <Button title="Tambah perangkat pendamping" variant="secondary" onPress={() => setPickingCompanion(true)} />
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Label>{`Lagu referensi (${value.tracks.length}/${REVIEW_LIMITS.tracks})`}</Label>
        {value.tracks.map((t, i) => (
          <View key={i} style={{ gap: spacing.sm }}>
            <Input label={`Judul lagu ${i + 1}`} value={t.title} onChangeText={(x) => set('tracks', value.tracks.map((y, j) => (j === i ? { ...y, title: x } : y)))} maxLength={REVIEW_LIMITS.trackTitle} />
            <Input label={`Tautan lagu ${i + 1} (opsional)`} value={t.url} onChangeText={(x) => set('tracks', value.tracks.map((y, j) => (j === i ? { ...y, url: x } : y)))} maxLength={REVIEW_LIMITS.trackUrl} autoCapitalize="none" keyboardType="url" placeholder="https://" />
            <Button title="Hapus lagu" variant="secondary" onPress={() => set('tracks', value.tracks.filter((_, j) => j !== i))} />
          </View>
        ))}
        {value.tracks.length < REVIEW_LIMITS.tracks && <Button title="Tambah lagu referensi" variant="secondary" onPress={() => set('tracks', [...value.tracks, { title: '', url: '' }])} />}
        <Text style={{ color: colors.textSecondary }}>Tautan dibuka di aplikasi luar. Reson tidak menyimpan audio.</Text>
      </View>
    </View>
  );
}

export function ShowcaseFields({ value, onChange }: { value: ShowcaseForm; onChange: (v: ShowcaseForm) => void }) {
  const set = <K extends keyof ShowcaseForm>(k: K, v: ShowcaseForm[K]) => onChange({ ...value, [k]: v });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.components.length) return;
    const next = [...value.components];
    [next[i], next[j]] = [next[j], next[i]];
    set('components', next);
  };
  const update = (i: number, patch: Partial<ShowcaseForm['components'][number]>) => set('components', value.components.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const [pickingFor, setPickingFor] = useState<number | null>(null);

  return (
    <View style={{ gap: spacing.md }}>
      <Input label="Tujuan setup" value={value.purpose} onChangeText={(t) => set('purpose', t)} maxLength={SHOWCASE_LIMITS.purpose} placeholder="mis. mendengarkan santai di meja kerja" />

      <Label>{`Komponen berurutan, mis. HP → DAC → IEM (${value.components.length}/${SHOWCASE_LIMITS.components})`}</Label>
      {value.components.map((c, i) => (
        <View key={i} style={{ gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md }}>
          <Input label={`Komponen ${i + 1}`} value={c.label} onChangeText={(t) => update(i, { label: t })} maxLength={SHOWCASE_LIMITS.label} />
          {c.device ? (
            <Text style={{ color: colors.textSecondary }}>{`Dari katalog: ${c.device.name}`}</Text>
          ) : (
            <Text style={{ color: colors.textSecondary }}>Item bebas (belum dikaitkan ke katalog, tidak diverifikasi).</Text>
          )}
          {pickingFor === i ? (
            <DevicePicker
              onPick={(d) => {
                update(i, { device: { id: d.id, name: d.name }, label: c.label.trim() ? c.label : d.name });
                setPickingFor(null);
              }}
              onClose={() => setPickingFor(null)}
            />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Button title={c.device ? 'Ganti katalog' : 'Pilih dari katalog'} variant="secondary" onPress={() => setPickingFor(i)} />
              {c.device && <Button title="Jadikan item bebas" variant="secondary" onPress={() => update(i, { device: null })} />}
              <Button title="↑" variant="secondary" onPress={() => move(i, -1)} disabled={i === 0} />
              <Button title="↓" variant="secondary" onPress={() => move(i, 1)} disabled={i === value.components.length - 1} />
              <Button title="Hapus" variant="secondary" onPress={() => set('components', value.components.filter((_, j) => j !== i))} disabled={value.components.length === 1} />
            </View>
          )}
        </View>
      ))}
      {value.components.length < SHOWCASE_LIMITS.components && (
        <Button title="Tambah komponen" variant="secondary" onPress={() => set('components', [...value.components, { device: null, label: '' }])} />
      )}
      <Input label="Kesan pemilik" value={value.impressions} onChangeText={(t) => set('impressions', t)} multiline maxLength={SHOWCASE_LIMITS.impressions} style={{ minHeight: 96, textAlignVertical: 'top' }} />
    </View>
  );
}
