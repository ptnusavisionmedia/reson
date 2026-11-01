'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import { addComment, removeComment, updateComment } from '@/app/actions';
import type { CommentNode } from '@/lib/data/comments';
import { timeAgo } from '@utils/time';
import { COMMENT_MAX, commentBodySchema } from '@shared/validation/comment';
import { useRouter } from 'next/navigation';

import { ConfirmDialog } from './confirm-dialog';

const linkBtn = 'min-h-11 text-sm text-muted hover:text-fg disabled:opacity-50';

function Avatar({ url, name }: { url: string | null; name: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (url) return <img src={url} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />;
  return (
    <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-line text-xs">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}

/** Komentar satu tingkat balasan. Setelah tiap aksi, halaman dimuat ulang dari server (jumlah ikut benar). */
export function CommentSection({ postId, currentUserId, tree, loadFailed }: { postId: string; currentUserId: string; tree: CommentNode[]; loadFailed: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<CommentNode | null>(null);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [deleting, setDeleting] = useState<CommentNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pendingId = useRef<string | null>(null); // dipakai ulang saat retry; direset bila teks berubah

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const parsed = commentBodySchema.safeParse(body);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    setError(null);
    pendingId.current ??= crypto.randomUUID();
    const res = await addComment({ id: pendingId.current, postId, parentId: replyTo?.id ?? null, body: parsed.data });
    setBusy(false);
    if (res.error) return setError(res.error);
    pendingId.current = null;
    setBody('');
    setReplyTo(null);
    router.refresh();
  }

  async function saveEdit() {
    if (busy || !editing) return;
    const parsed = commentBodySchema.safeParse(editing.body);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    setError(null);
    const res = await updateComment(postId, editing.id, parsed.data);
    setBusy(false);
    if (res.error) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (busy || !deleting) return;
    setBusy(true);
    setError(null);
    const res = await removeComment(postId, deleting.id);
    setBusy(false);
    setDeleting(null);
    if (res.error) return setError(res.error);
    router.refresh();
  }

  function renderComment(c: CommentNode, isReply: boolean) {
    if (c.deleted) {
      return (
        <p key={c.id} className="text-sm italic text-muted">
          Komentar ini telah dihapus.
        </p>
      );
    }
    const own = c.authorId === currentUserId;
    const edited = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime() > 2000;
    return (
      <div key={c.id} className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm">
          <Avatar url={c.authorAvatarUrl} name={c.authorName} />
          <span className="font-semibold">{c.authorName}</span>
          <span className="text-muted" suppressHydrationWarning>
            {timeAgo(c.createdAt)}
            {edited ? ' • diedit' : ''}
          </span>
        </div>
        {editing?.id === c.id ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={`edit-${c.id}`} className="text-sm text-muted">
              Ubah komentar
            </label>
            <textarea
              id={`edit-${c.id}`}
              value={editing.body}
              maxLength={COMMENT_MAX}
              onChange={(e) => setEditing({ id: c.id, body: e.target.value })}
              className="min-h-20 rounded-md border border-line-strong bg-surface p-3"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(null)} disabled={busy} className="min-h-11 rounded-md border border-line-strong px-4">
                Batal
              </button>
              <button type="button" onClick={saveEdit} disabled={busy} className="min-h-11 rounded-md bg-accent px-4 font-medium text-bg disabled:opacity-60">
                {busy ? 'Memproses…' : 'Simpan'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="whitespace-pre-wrap break-words">{c.body}</p>
            <div className="flex gap-4">
              {!isReply && (
                <button type="button" className={linkBtn} onClick={() => setReplyTo(c)} disabled={busy}>
                  Balas
                </button>
              )}
              {own ? (
                <>
                  <button type="button" className={linkBtn} onClick={() => setEditing({ id: c.id, body: c.body })} disabled={busy}>
                    Edit
                  </button>
                  <button type="button" className={linkBtn} onClick={() => setDeleting(c)} disabled={busy}>
                    Hapus
                  </button>
                </>
              ) : (
                <Link href={`/report?targetType=comment&targetId=${c.id}`} className={`${linkBtn} flex items-center`}>
                  Laporkan
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-4">
      <h2 id="comments-heading" className="text-lg font-semibold">
        Komentar
      </h2>

      {loadFailed && <p role="alert" className="text-sm text-accent">Tidak bisa memuat komentar. Muat ulang halaman.</p>}
      {!loadFailed && tree.length === 0 && <p className="text-muted">Belum ada komentar. Mulai percakapannya.</p>}

      {tree.map((c) => (
        <div key={c.id} className="flex flex-col gap-3">
          {renderComment(c, false)}
          {c.replies.length > 0 && (
            <div className="ml-6 flex flex-col gap-3 border-l border-line pl-4">{c.replies.map((r) => renderComment(r, true))}</div>
          )}
        </div>
      ))}

      <form onSubmit={submit} className="flex flex-col gap-2">
        {replyTo && (
          <div className="flex items-center justify-between text-sm text-muted">
            <span>Membalas {replyTo.authorName}</span>
            <button type="button" className={linkBtn} onClick={() => setReplyTo(null)}>
              Batal
            </button>
          </div>
        )}
        <label htmlFor="new-comment" className="text-sm text-muted">
          {replyTo ? 'Tulis balasan' : 'Tulis komentar'}
        </label>
        <textarea
          id="new-comment"
          value={body}
          maxLength={COMMENT_MAX}
          onChange={(e) => {
            pendingId.current = null;
            setBody(e.target.value);
          }}
          className="min-h-20 rounded-md border border-line-strong bg-surface p-3"
        />
        {error && (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="min-h-11 rounded-md bg-accent px-5 font-medium text-bg disabled:opacity-60">
          {busy && !editing ? 'Memproses…' : 'Kirim'}
        </button>
      </form>

      <ConfirmDialog
        open={!!deleting}
        title="Hapus komentar?"
        message={deleting && deleting.replies.length > 0 ? 'Balasan di bawahnya tetap ada.' : 'Komentar akan dihapus.'}
        confirmLabel="Hapus"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </section>
  );
}
