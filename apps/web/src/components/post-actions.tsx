'use client';

import { useState } from 'react';

import { removePost, setLike, setSaved } from '@/app/actions';

import { ConfirmDialog } from './confirm-dialog';

const buttonBase = 'min-h-11 rounded-md bg-surface px-4';

/** Like optimistis: tampilan berubah seketika dan dikembalikan bila server menolak. */
export function LikeButton({ postId, initialLiked, initialCount }: { postId: string; initialLiked: boolean; initialCount: number }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (busy) return;
    const previous = { liked, count };
    const next = !liked;
    setLiked(next);
    setCount(Math.max(0, count + (next ? 1 : -1)));
    setBusy(true);
    setError(null);
    const res = await setLike(postId, next);
    setBusy(false);
    if (res.error !== undefined) {
      setLiked(previous.liked);
      setCount(previous.count);
      return setError(res.error);
    }
    setCount(res.count);
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={liked}
        className={`${buttonBase} ${liked ? 'border-2 border-accent' : 'border border-line-strong'}`}
      >
        {liked ? '♥ Disukai' : '♡ Suka'} • {count}
      </button>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

export function SaveButton({ postId, initialSaved }: { postId: string; initialSaved: boolean }) {
  const [saved, setSavedState] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (busy) return;
    const previous = saved;
    setSavedState(!previous);
    setBusy(true);
    setError(null);
    const res = await setSaved(postId, !previous);
    setBusy(false);
    if (res.error !== undefined) {
      setSavedState(previous);
      setError(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        className={`${buttonBase} ${saved ? 'border-2 border-accent' : 'border border-line-strong'}`}
      >
        {saved ? '✓ Tersimpan' : 'Simpan'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

export function DeletePostButton({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await removePost(postId); // sukses = redirect ke /home
    // Hanya galat yang kembali ke sini.
    if (res?.error) {
      setBusy(false);
      setOpen(false);
      setError(res.error);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 rounded-md border border-line-strong px-4">
        Hapus
      </button>
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={open}
        title="Hapus post?"
        message="Post dan fotonya akan dihapus dan tidak bisa dikembalikan."
        confirmLabel="Hapus"
        busy={busy}
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
