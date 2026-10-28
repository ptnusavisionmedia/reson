import { describe, expect, it } from 'vitest';

import { notificationTarget, notificationText, type NotificationItem } from '../../src/features/notifications/text';

const base: NotificationItem = {
  id: 'n1',
  type: 'comment',
  actorId: 'u1',
  actorName: 'Pasus',
  postId: 'p1',
  postTitle: 'Apakah ini worth it?',
  readAt: null,
  createdAt: '2026-10-30T00:00:00Z',
};

describe('notificationText', () => {
  it('follow', () => {
    expect(notificationText({ ...base, type: 'follow', postId: null, postTitle: null })).toBe('Pasus mulai mengikutimu');
  });
  it('komentar pada post', () => {
    expect(notificationText(base)).toBe('Pasus mengomentari postmu "Apakah ini worth it?"');
  });
  it('balasan komentar', () => {
    expect(notificationText({ ...base, type: 'reply' })).toBe('Pasus membalas komentarmu di "Apakah ini worth it?"');
  });
  it('post yang sudah dihapus tidak menampilkan judul', () => {
    expect(notificationText({ ...base, postTitle: null })).toBe('Pasus mengomentari postmu (post sudah tidak tersedia)');
  });
  it('pelaku yang sudah menghapus akun tidak menampilkan identitas', () => {
    const t = notificationText({ ...base, actorId: null, actorName: null });
    expect(t).toContain('Akun yang sudah dihapus');
    expect(t).not.toContain('Pasus');
  });
});

describe('notificationTarget', () => {
  it('follow membuka profil pelaku', () => {
    expect(notificationTarget({ ...base, type: 'follow', postId: null, postTitle: null })).toEqual({ kind: 'user', id: 'u1' });
  });
  it('komentar dan balasan membuka post', () => {
    expect(notificationTarget(base)).toEqual({ kind: 'post', id: 'p1' });
    expect(notificationTarget({ ...base, type: 'reply' })).toEqual({ kind: 'post', id: 'p1' });
  });
  it('post yang sudah dihapus: dijelaskan, bukan dibuka', () => {
    expect(notificationTarget({ ...base, postTitle: null })).toEqual({ kind: 'unavailable', message: 'Post ini sudah dihapus atau disembunyikan.' });
    expect(notificationTarget({ ...base, postId: null, postTitle: null })).toMatchObject({ kind: 'unavailable' });
  });
  it('follow dari akun yang sudah dihapus: dijelaskan', () => {
    expect(notificationTarget({ ...base, type: 'follow', actorId: null, actorName: null, postId: null, postTitle: null })).toEqual({
      kind: 'unavailable',
      message: 'Akun ini sudah dihapus.',
    });
  });
});
