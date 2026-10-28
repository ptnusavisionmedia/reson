import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/AuthProvider';

export type CommunityItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  rules: string[];
  pinnedPostIds: string[];
  memberCount: number;
  joined: boolean;
};

type State = { status: 'ready'; items: CommunityItem[] } | { status: 'error' };

/** Enam komunitas awal + status keanggotaan pengguna. Dimuat ulang diam-diam saat layar fokus. */
export function useCommunities() {
  const uid = useAuth().session?.user.id;
  const [state, setState] = useState<State | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    const [c, m] = await Promise.all([
      supabase.from('communities').select('id, slug, name, description, rules, pinned_post_ids, member_count').order('name'),
      supabase.from('community_members').select('community_id').eq('user_id', uid),
    ]);
    if (c.error || m.error) return setState({ status: 'error' });
    const joined = new Set(m.data.map((r) => r.community_id));
    setState({
      status: 'ready',
      items: c.data.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        rules: r.rules,
        pinnedPostIds: r.pinned_post_ids,
        memberCount: r.member_count,
        joined: joined.has(r.id),
      })),
    });
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const apply = useCallback((id: string, joined: boolean, memberCount: number) => {
    setState((s) => (s?.status === 'ready' ? { ...s, items: s.items.map((i) => (i.id === id ? { ...i, joined, memberCount } : i)) } : s));
  }, []);

  return { state, reload: load, apply };
}
