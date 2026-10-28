import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Avatar, Button, ErrorState, Input, Loading } from '@/components/ui';
import { avatarUrl } from '@/features/profiles/api';
import { colors, minTouchTarget, spacing } from '@/theme';
import { timeAgo } from '@/utils/time';
import { COMMENT_MAX, commentBodySchema } from '@shared/validation/comment';

import { createComment, deleteComment, editComment } from './api';
import { useComments, type CommentNode } from './useComments';

function LinkButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={{ minHeight: minTouchTarget, justifyContent: 'center', opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ color: colors.textSecondary }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Komentar satu tingkat balasan. Aksi memanggil server lalu memuat ulang daftar; `onChanged`
 * memberi tahu layar induk agar jumlah komentar di post ikut diperbarui.
 */
export function CommentSection({ postId, currentUserId, onChanged }: { postId: string; currentUserId: string | undefined; onChanged: () => void }) {
  const router = useRouter();
  const { status, tree, reload } = useComments(postId);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<CommentNode | null>(null);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pendingId = useRef<string | null>(null); // dipakai ulang saat retry; direset bila teks berubah

  async function refresh() {
    await reload();
    onChanged();
  }

  async function submit() {
    if (busy) return;
    const parsed = commentBodySchema.safeParse(body);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    setError(null);
    pendingId.current ??= Crypto.randomUUID();
    const err = await createComment({ id: pendingId.current, postId, parentId: replyTo?.id ?? null, body: parsed.data });
    setBusy(false);
    if (err) return setError(err);
    pendingId.current = null;
    setBody('');
    setReplyTo(null);
    await refresh();
  }

  async function saveEdit() {
    if (busy || !editing) return;
    const parsed = commentBodySchema.safeParse(editing.body);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    setError(null);
    const err = await editComment(editing.id, parsed.data);
    setBusy(false);
    if (err) return setError(err);
    setEditing(null);
    await refresh();
  }

  function confirmDelete(c: CommentNode) {
    Alert.alert('Hapus komentar?', c.replies.length ? 'Balasan di bawahnya tetap ada.' : 'Komentar akan dihapus.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const err = await deleteComment(c.id);
          setBusy(false);
          if (err) return setError(err);
          await refresh();
        },
      },
    ]);
  }

  function renderComment(c: CommentNode, isReply: boolean) {
    if (c.deleted) {
      return (
        <Text key={c.id} style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
          Komentar ini telah dihapus.
        </Text>
      );
    }
    const own = c.authorId === currentUserId;
    const edited = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime() > 2000;
    return (
      <View key={c.id} style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Avatar uri={avatarUrl(c.authorAvatarPath)} name={c.authorName} size={28} />
          <Text style={{ color: colors.text, fontWeight: '600' }}>{c.authorName}</Text>
          <Text style={{ color: colors.textSecondary }}>{`${timeAgo(c.createdAt)}${edited ? ' • diedit' : ''}`}</Text>
        </View>
        {editing?.id === c.id ? (
          <>
            <Input label="Ubah komentar" value={editing.body} onChangeText={(t) => setEditing({ id: c.id, body: t })} multiline maxLength={COMMENT_MAX} style={{ minHeight: 72, textAlignVertical: 'top' }} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Button title="Batal" variant="secondary" onPress={() => setEditing(null)} disabled={busy} /></View>
              <View style={{ flex: 1 }}><Button title="Simpan" onPress={saveEdit} loading={busy} /></View>
            </View>
          </>
        ) : (
          <>
            <Text style={{ color: colors.text }}>{c.body}</Text>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              {!isReply && <LinkButton label="Balas" onPress={() => setReplyTo(c)} disabled={busy} />}
              {own && <LinkButton label="Edit" onPress={() => setEditing({ id: c.id, body: c.body })} disabled={busy} />}
              {own && <LinkButton label="Hapus" onPress={() => confirmDelete(c)} disabled={busy} />}
              {!own && <LinkButton label="Laporkan" onPress={() => router.push({ pathname: '/report', params: { targetType: 'comment', targetId: c.id } })} disabled={busy} />}
            </View>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.md }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Komentar</Text>

      {status === 'loading' && <Loading />}
      {status === 'error' && tree.length === 0 && <ErrorState message="Tidak bisa memuat komentar." onRetry={reload} />}
      {status === 'ready' && tree.length === 0 && <Text style={{ color: colors.textSecondary }}>Belum ada komentar. Mulai percakapannya.</Text>}

      {tree.map((c) => (
        <View key={c.id} style={{ gap: spacing.sm }}>
          {renderComment(c, false)}
          {c.replies.length > 0 && (
            <View style={{ marginLeft: spacing.lg, gap: spacing.sm, borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: spacing.md }}>
              {c.replies.map((r) => renderComment(r, true))}
            </View>
          )}
        </View>
      ))}

      <View style={{ gap: spacing.sm }}>
        {replyTo && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textSecondary }}>{`Membalas ${replyTo.authorName}`}</Text>
            <LinkButton label="Batal" onPress={() => setReplyTo(null)} />
          </View>
        )}
        <Input
          label={replyTo ? 'Tulis balasan' : 'Tulis komentar'}
          value={body}
          onChangeText={(t) => {
            pendingId.current = null;
            setBody(t);
          }}
          multiline
          maxLength={COMMENT_MAX}
          style={{ minHeight: 72, textAlignVertical: 'top' }}
        />
        {!!error && <Text style={{ color: colors.accent }} accessibilityRole="alert">{error}</Text>}
        <Button title="Kirim" onPress={submit} loading={busy && !editing} />
      </View>
    </View>
  );
}
