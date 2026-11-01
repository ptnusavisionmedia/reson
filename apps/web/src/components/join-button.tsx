'use client';

import { useState, useTransition } from 'react';

import { setMembership } from '@/app/actions';

/** Gabung/Keluar. Server idempoten; tombol dikunci selama proses supaya tidak terkirim ganda. */
export function JoinButton({ communityId, joined }: { communityId: string; joined: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await setMembership(communityId, !joined);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`min-h-11 rounded-md px-5 font-medium disabled:opacity-60 ${
          joined ? 'border border-line-strong bg-surface' : 'bg-accent text-bg'
        }`}
      >
        {pending ? 'Memproses…' : joined ? 'Keluar' : 'Gabung'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
