import { supabase } from '@/lib/supabase/client';
import { serverErrorMessage } from '@/utils/errors';

type Result = { memberCount: number } | { error: string };

export async function joinCommunity(id: string): Promise<Result> {
  const { data, error } = await supabase.rpc('join_community', { p_community_id: id });
  return error ? { error: serverErrorMessage(error) } : { memberCount: data };
}

export async function leaveCommunity(id: string): Promise<Result> {
  const { data, error } = await supabase.rpc('leave_community', { p_community_id: id });
  return error ? { error: serverErrorMessage(error) } : { memberCount: data };
}
