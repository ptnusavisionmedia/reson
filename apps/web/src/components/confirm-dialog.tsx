'use client';

import { useEffect, useRef } from 'react';

/**
 * Dialog konfirmasi aksesibel memakai <dialog> native: fokus terkunci di dalamnya, Escape menutup,
 * dan fokus kembali ke pemicu. Aksi destruktif tidak berjalan sebelum pengguna menekan konfirmasi.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onCancel={(e) => {
        e.preventDefault(); // Escape: tutup lewat state, kecuali sedang memproses
        if (!busy) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg border border-line bg-surface p-6 text-fg backdrop:bg-black/60"
    >
      <h2 id="confirm-title" className="text-lg font-semibold">
        {title}
      </h2>
      <p id="confirm-message" className="mt-2 text-muted">
        {message}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          disabled={busy}
          className="min-h-11 rounded-md border border-line-strong px-5 disabled:opacity-60"
        >
          Batal
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className="min-h-11 rounded-md bg-accent px-5 font-medium text-bg disabled:opacity-60">
          {busy ? 'Memproses…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
