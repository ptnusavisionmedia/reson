import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { Database } from '@db';

const PUBLIC = ['/', '/robots.txt', '/login', '/register', '/forgot-password', '/update-password', '/privacy', '/delete-account'];
const isPublic = (p: string) => PUBLIC.includes(p) || p.startsWith('/auth/');

/** Segarkan cookie sesi di setiap request dan jaga rute privat. Otorisasi data tetap di RLS/RPC. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;
  const path = request.nextUrl.pathname;

  const redirect = (to: string, search = '') => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = search;
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!signedIn && !isPublic(path)) return redirect('/login', `?returnTo=${encodeURIComponent(path + request.nextUrl.search)}`);
  // update-password dan callback tetap terjangkau saat sudah punya sesi (recovery).
  if (signedIn && (path === '/login' || path === '/register')) return redirect('/home');
  return response;
}
