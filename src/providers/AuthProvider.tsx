import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { clearAllDrafts } from '@/features/posts/draft';
import { clearSignedUrlCache } from '@/features/posts/useSignedUrls';
import { supabase } from '@/lib/supabase/client';

type Profile = { username: string; displayName: string };

type AuthState = {
  loading: boolean;
  bootstrapError: boolean;
  session: Session | null;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  introSeen: boolean;
  /** Hanya untuk menampilkan menu; hak akses sebenarnya dicek di server (is_staff). */
  isStaff: boolean;
  /** 'deleting' = penghapusan akun terputus dan harus dilanjutkan. Dimuat saat masuk, bukan dipantau terus. */
  accountStatus: string;
  markIntroSeen: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  profile: Profile | null;
  retry: () => void;
  completeOnboarding: () => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  // Data akun dikaitkan dengan userId pemiliknya; data milik akun lain/logout otomatis dianggap kosong.
  const [loaded, setLoaded] = useState<{ userId: string; onboardingCompleted: boolean; introSeen: boolean; isStaff: boolean; status: string; profile: Profile } | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  const account = loaded && loaded.userId === userId ? loaded : null;
  const bootstrapError = !!userId && failedFor === userId;

  // Muat data akun di efek terpisah (jangan await Supabase di dalam callback onAuthStateChange).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [acc, prof] = await Promise.all([
        supabase.from('accounts').select('onboarding_completed, intro_seen, role').eq('id', userId).single(),
        supabase.from('profiles').select('username, display_name, status').eq('id', userId).single(),
      ]);
      if (cancelled) return;
      if (acc.error || prof.error) return setFailedFor(userId);
      setLoaded({
        userId,
        onboardingCompleted: acc.data.onboarding_completed,
        introSeen: acc.data.intro_seen,
        isStaff: acc.data.role === 'moderator' || acc.data.role === 'admin',
        status: prof.data.status,
        profile: { username: prof.data.username, displayName: prof.data.display_name },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  const completeOnboarding = useCallback(async () => {
    const { error } = await supabase.rpc('complete_onboarding');
    if (error) return false;
    setLoaded((a) => (a ? { ...a, onboardingCompleted: true } : a));
    return true;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from('profiles').select('username, display_name').eq('id', userId).single();
    if (data) {
      setLoaded((a) => (a && a.userId === userId ? { ...a, profile: { username: data.username, displayName: data.display_name } } : a));
    }
  }, [userId]);

  const markIntroSeen = useCallback(async () => {
    setLoaded((a) => (a ? { ...a, introSeen: true } : a));
    await supabase.rpc('mark_intro_seen'); // non-kritis: gagal tidak menghalangi alur
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading: !sessionReady || (!!userId && !account && !bootstrapError),
      bootstrapError,
      session,
      emailVerified: !!session?.user.email_confirmed_at,
      onboardingCompleted: account?.onboardingCompleted ?? false,
      introSeen: account?.introSeen ?? false,
      isStaff: account?.isStaff ?? false,
      accountStatus: account?.status ?? 'active',
      markIntroSeen,
      refreshProfile,
      profile: account?.profile ?? null,
      retry: () => {
        setFailedFor(null);
        setAttempt((n) => n + 1);
      },
      completeOnboarding,
      signOut: async () => {
        // Bersihkan data lokal milik akun ini agar tidak bocor ke akun berikutnya.
        await Promise.all([clearAllDrafts(), Promise.resolve(clearSignedUrlCache())]);
        await supabase.auth.signOut();
      },
    }),
    [sessionReady, userId, account, bootstrapError, session, completeOnboarding, markIntroSeen, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
