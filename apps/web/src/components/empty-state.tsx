import Link from 'next/link';

export function EmptyState({ title, message, href, actionLabel }: { title: string; message?: string; href?: string; actionLabel?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {message && <p className="max-w-sm text-muted">{message}</p>}
      {href && actionLabel && (
        <Link href={href} className="min-h-11 rounded-md border border-line-strong px-5 py-3">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
      <EmptyState title="Segera hadir" message="Bagian ini belum tersedia di versi web. Sementara, buka lewat aplikasi Reson." />
    </>
  );
}
