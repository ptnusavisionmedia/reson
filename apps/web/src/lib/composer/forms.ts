import type { Ownership, ReviewDetails, ShowcaseDetails } from '@shared/validation/postDetails';
import type { PostType } from '@shared/validation/post';

// Bentuk form sama dengan app mobile (src/features/posts/PostTypeFields.tsx), tanpa impor React Native.

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

export const emptyReview: ReviewForm = {
  device: null,
  ownership: null,
  bassNotes: '',
  vocalNotes: '',
  trebleNotes: '',
  comfortNotes: '',
  pros: [],
  cons: [],
  companions: [],
  tracks: [],
};

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

export function detailsPayload(type: PostType, review: ReviewForm, showcase: ShowcaseForm): Record<string, unknown> {
  return type === 'review' ? reviewPayload(review) : type === 'showcase' ? showcasePayload(showcase) : {};
}
