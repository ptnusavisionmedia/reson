import Link from 'next/link';

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4">
      <h1 className="text-4xl font-semibold">Reson</h1>
      <p className="text-muted">Temukan orang yang mendengar seperti kamu.</p>
      <div className="flex gap-3">
        <Link href="/login" className="min-h-11 rounded-md bg-accent px-5 py-3 font-medium text-bg">
          Masuk
        </Link>
        <Link href="/register" className="min-h-11 rounded-md border border-line-strong px-5 py-3">
          Daftar
        </Link>
      </div>
    </main>
  );
}
