import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@db';
import { soundProfileSchema, type SoundProfileInput } from '@shared/validation/soundProfile';

export type AccountState = { profileCompleted: boolean; onboardingCompleted: boolean; introSeen: boolean };

/** Status akun untuk guard UX. Otorisasi data sebenarnya tetap di RLS/RPC. */
export async function loadAccountState(supabase: SupabaseClient<Database>, userId: string): Promise<AccountState | null> {
  const { data } = await supabase.from('accounts').select('profile_completed, onboarding_completed, intro_seen').eq('id', userId).single();
  return data ? { profileCompleted: data.profile_completed, onboardingCompleted: data.onboarding_completed, introSeen: data.intro_seen } : null;
}

/** null = belum pernah mengisi (atau bentuk data tidak dikenal). */
export async function loadSoundProfile(supabase: SupabaseClient<Database>, userId: string): Promise<SoundProfileInput | null> {
  const { data } = await supabase.from('sound_profiles').select('genres, bass, vocals, treble, contexts, discoverable').eq('user_id', userId).maybeSingle();
  if (!data) return null;
  const parsed = soundProfileSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
