import { describe, expect, it } from 'vitest';

import { safeReturnTo } from '../../apps/web/src/lib/auth/return-to';

describe('safeReturnTo', () => {
  it('menerima path internal', () => {
    expect(safeReturnTo('/home')).toBe('/home');
    expect(safeReturnTo('/posts/abc?x=1')).toBe('/posts/abc?x=1');
    expect(safeReturnTo('/settings/delete-account?reauth=google')).toBe('/settings/delete-account?reauth=google');
  });

  it('menolak redirect ke luar situs', () => {
    expect(safeReturnTo('//evil.com')).toBe('/home');
    expect(safeReturnTo('https://evil.com')).toBe('/home');
    expect(safeReturnTo('http://evil.com/home')).toBe('/home');
    expect(safeReturnTo('/\\evil.com')).toBe('/home');
    expect(safeReturnTo('javascript:alert(1)')).toBe('/home');
  });

  it('memakai fallback untuk nilai kosong', () => {
    expect(safeReturnTo(null)).toBe('/home');
    expect(safeReturnTo(undefined)).toBe('/home');
    expect(safeReturnTo('')).toBe('/home');
    expect(safeReturnTo('', '/login')).toBe('/login');
  });
});
