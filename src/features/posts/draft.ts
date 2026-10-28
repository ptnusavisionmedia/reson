import AsyncStorage from '@react-native-async-storage/async-storage';

import { POST_TYPES, type PostType } from '@shared/validation/post';

import type { ReviewForm, ShowcaseForm } from './PostTypeFields';

// Draf lokal dipisah per akun dan dihapus saat logout agar tidak bocor ke akun berikutnya.
const PREFIX = 'draft:post:';

export type PostDraft = {
  type: PostType;
  communityId: string | null;
  title: string;
  body: string;
  review?: ReviewForm;
  showcase?: ShowcaseForm;
};

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export async function loadDraft(uid: string): Promise<PostDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + uid);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<PostDraft>;
    if (!POST_TYPES.includes(d.type as PostType) || typeof d.title !== 'string' || typeof d.body !== 'string') return null;
    return {
      type: d.type as PostType,
      communityId: typeof d.communityId === 'string' ? d.communityId : null,
      title: d.title,
      body: d.body,
      // Bentuk form detail hanya diterima bila berupa objek; field yang hilang dilengkapi nilai kosong di layar.
      review: isObject(d.review) ? (d.review as ReviewForm) : undefined,
      showcase: isObject(d.showcase) ? (d.showcase as ShowcaseForm) : undefined,
    };
  } catch {
    return null;
  }
}

export async function saveDraft(uid: string, draft: PostDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + uid, JSON.stringify(draft));
  } catch {
    // draf hanya kenyamanan; gagal menyimpan tidak boleh mengganggu pengguna
  }
}

export async function clearDraft(uid: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + uid);
  } catch {}
}

export async function clearAllDrafts(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith(PREFIX)));
  } catch {}
}
