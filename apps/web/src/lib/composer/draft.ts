import { POST_TYPES, type PostType } from '@shared/validation/post';

import type { ReviewForm, ShowcaseForm } from './forms';

// Draf lokal dipisah per akun dan dihapus saat logout agar tidak bocor ke akun berikutnya.
const PREFIX = 'reson:draft:post:';

export type PostDraft = {
  type: PostType;
  communityId: string | null;
  title: string;
  body: string;
  review?: ReviewForm;
  showcase?: ShowcaseForm;
};

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function loadDraft(uid: string): PostDraft | null {
  try {
    const raw = localStorage.getItem(PREFIX + uid);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<PostDraft>;
    if (!POST_TYPES.includes(d.type as PostType) || typeof d.title !== 'string' || typeof d.body !== 'string') return null;
    return {
      type: d.type as PostType,
      communityId: typeof d.communityId === 'string' ? d.communityId : null,
      title: d.title,
      body: d.body,
      review: isObject(d.review) ? (d.review as ReviewForm) : undefined,
      showcase: isObject(d.showcase) ? (d.showcase as ShowcaseForm) : undefined,
    };
  } catch {
    return null;
  }
}

export function saveDraft(uid: string, draft: PostDraft): void {
  try {
    localStorage.setItem(PREFIX + uid, JSON.stringify(draft));
  } catch {
    // draf hanya kenyamanan; gagal menyimpan tidak boleh mengganggu pengguna
  }
}

export function clearDraft(uid: string): void {
  try {
    localStorage.removeItem(PREFIX + uid);
  } catch {}
}

export function clearAllDrafts(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {}
}
