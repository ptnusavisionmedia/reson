import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth-ui';
import { FinishOnboardingButton } from '@/components/onboarding-client';
import { loadAccountState, loadSoundProfile } from '@/lib/auth/onboarding';
import { describeProfile } from '@/lib/data/match';
import { createClient } from '@/lib/supabase/server';
import { isInitialProfile } from '@shared/validation/soundProfile';

export default async function QuizResultPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  const account = await loadAccountState(supabase, auth.user.id);
  if (account && !account.profileCompleted) redirect('/complete-profile');
  if (account?.onboardingCompleted) redirect('/home');

  const profile = await loadSoundProfile(supabase, auth.user.id);
  if (!profile) {
    return (
      <AuthShell title="Sound Profile">
        <p className="text-muted">Belum ada jawaban tersimpan.</p>
        <Link href="/sound-quiz" className="flex min-h-11 items-center justify-center rounded-md bg-accent px-5 font-medium text-bg">
          Isi kuis
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Selera suaramu">
      <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
        {isInitialProfile(profile) && <span className="w-fit rounded-md border border-line px-2 py-0.5 text-xs text-muted">Profil awal</span>}
        <ul className="flex flex-col gap-1">
          {describeProfile(profile).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
      <p className="text-sm text-muted">Ini hanya gambaran selera, bukan penilaian kemampuan mendengar. Kamu bisa mengubahnya kapan saja dari profil.</p>
      <FinishOnboardingButton />
      <Link href="/sound-quiz" className="flex min-h-11 items-center justify-center rounded-md border border-line-strong px-5">
        Ubah jawaban
      </Link>
    </AuthShell>
  );
}
