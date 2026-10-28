import { supabase } from '@/lib/supabase/client';
import { serverErrorMessage } from '@/utils/errors';

export type ReportTargetType = 'post' | 'comment' | 'user';

export const REPORT_REASONS = ['Spam atau promosi', 'Pelecehan atau ujaran kasar', 'Konten tidak pantas', 'Informasi menyesatkan', 'Lainnya'] as const;

/** Mengembalikan pesan error, atau null bila laporan tersimpan. Laporan ganda yang masih terbuka diabaikan server. */
export async function createReport(type: ReportTargetType, targetId: string, reason: string): Promise<string | null> {
  const { error } = await supabase.rpc('create_report', { p_target_type: type, p_target_id: targetId, p_reason: reason });
  return error ? serverErrorMessage(error) : null;
}

export type ModerationTarget = {
  type: ReportTargetType;
  id?: string;
  status?: string;
  title?: string;
  body?: string;
  displayName?: string;
  bio?: string;
  imagePaths?: string[];
  authorId?: string;
  authorUsername?: string;
  postId?: string;
  missing?: boolean;
};

export async function moderationTarget(reportId: string): Promise<{ data: ModerationTarget } | { error: string }> {
  const { data, error } = await supabase.rpc('moderation_target', { p_report_id: reportId });
  return error ? { error: serverErrorMessage(error) } : { data: data as unknown as ModerationTarget };
}

export type ModerationAction = 'dismiss' | 'hide' | 'restore';

export async function moderateReport(reportId: string, action: ModerationAction, reason: string): Promise<string | null> {
  const { error } = await supabase.rpc('moderate_report', { p_report_id: reportId, p_action: action, p_reason: reason });
  return error ? serverErrorMessage(error) : null;
}
