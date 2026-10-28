import { useState } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/ui';
import { colors } from '@/theme';

import { joinCommunity, leaveCommunity } from './api';
import type { CommunityItem } from './useCommunities';

/** Tombol Gabung/Keluar. Server idempoten, jadi ketukan ganda aman; tombol tetap dikunci saat proses. */
export function JoinButton({ community, onChanged }: {
  community: CommunityItem;
  onChanged: (id: string, joined: boolean, memberCount: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = community.joined ? await leaveCommunity(community.id) : await joinCommunity(community.id);
    setBusy(false);
    if ('error' in res) return setError(res.error);
    onChanged(community.id, !community.joined, res.memberCount);
  }

  return (
    <>
      <Button title={community.joined ? 'Keluar' : 'Gabung'} variant={community.joined ? 'secondary' : 'primary'} onPress={toggle} loading={busy} />
      {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
    </>
  );
}
