import type { Metadata } from 'next';
import { z } from 'zod';

import { EmptyState } from '@/components/empty-state';
import { ReportForm } from '@/components/settings-client';

export const metadata: Metadata = { title: 'Laporkan • Reson', robots: { index: false } };

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ targetType?: string; targetId?: string }> }) {
  const { targetType, targetId } = await searchParams;
  if ((targetType !== 'post' && targetType !== 'comment' && targetType !== 'user') || !targetId || !z.uuid().safeParse(targetId).success) {
    return <EmptyState title="Laporan tidak valid" href="/home" actionLabel="Kembali ke Beranda" />;
  }
  return <ReportForm targetType={targetType} targetId={targetId} />;
}
