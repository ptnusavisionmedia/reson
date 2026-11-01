'use client';

import { useState } from 'react';

import { setFollow } from '@/app/actions';

/** Ikuti/Berhenti mengikuti dengan perubahan seketika dan rollback bila server menolak. */
export function FollowButton({ targetId, initialFollowing }: { targetId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (busy) return;
    const previous = following;
    setFollowing(!previous);
    setBusy(true);
    setError(null);
    const res = await setFollow(targetId, !previous);
    setBusy(false);
    if (res.error !== undefined) {
      setFollowing(previous);
      setError(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={following}
        disabled={busy}
        className={`min-h-11 rounded-md px-5 font-medium disabled:opacity-60 ${following ? 'border border-line-strong bg-surface' : 'bg-accent text-bg'}`}
      >
        {following ? 'Berhenti mengikuti' : 'Ikuti'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
