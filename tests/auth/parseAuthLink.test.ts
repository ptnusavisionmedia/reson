import { describe, expect, it } from 'vitest';

import { parseAuthLink } from '../../src/features/auth/parseAuthLink';

describe('parseAuthLink', () => {
  it('mengabaikan tautan yang bukan callback auth', () => {
    expect(parseAuthLink('reson://home')).toEqual({ kind: 'none' });
    expect(parseAuthLink('bukan url')).toEqual({ kind: 'none' });
  });

  it('membaca kode PKCE', () => {
    expect(parseAuthLink('reson://auth/callback?code=abc-123')).toEqual({ kind: 'code', code: 'abc-123' });
    expect(parseAuthLink('reson:///auth/callback?code=abc-123')).toEqual({ kind: 'code', code: 'abc-123' });
  });

  it('membaca token dari fragmen (tautan tanpa PKCE)', () => {
    expect(parseAuthLink('reson://auth/callback#access_token=a&refresh_token=r&type=signup')).toEqual({
      kind: 'tokens',
      accessToken: 'a',
      refreshToken: 'r',
    });
  });

  it('access_denied tanpa error_code = dibatalkan pengguna, bukan galat', () => {
    expect(parseAuthLink('reson://auth/callback?error=access_denied')).toEqual({ kind: 'cancelled' });
  });

  it('tautan kedaluwarsa dikenali sebagai galat', () => {
    expect(parseAuthLink('reson://auth/callback#error=access_denied&error_code=otp_expired')).toEqual({ kind: 'error' });
    expect(parseAuthLink('reson://auth/callback?error=server_error&error_description=x')).toEqual({ kind: 'error' });
  });

  it('callback tanpa kode atau token tidak melakukan apa pun', () => {
    expect(parseAuthLink('reson://auth/callback')).toEqual({ kind: 'none' });
  });
});
