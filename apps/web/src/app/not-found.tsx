import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4">
      <p className="font-mono text-sm tracking-widest text-accent">RESON</p>
      <h1 className="text-2xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="text-muted">Alamat ini tidak ada atau sudah dipindahkan.</p>
      <Link href="/home" className="flex min-h-11 w-fit items-center rounded-md bg-accent px-5 font-medium text-bg">
        Ke Beranda
      </Link>
    </main>
  );
}
