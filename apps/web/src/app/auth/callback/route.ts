import { NextResponse, type NextRequest } from 'next/server';

import { safeReturnTo } from '@/lib/auth/return-to';
import { createClient } from '@/lib/supabase/server';

// Supabase -> Reson: tukar code PKCE menjadi sesi cookie, lalu ke tujuan internal.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeReturnTo(searchParams.get('next'));
  const code = searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
