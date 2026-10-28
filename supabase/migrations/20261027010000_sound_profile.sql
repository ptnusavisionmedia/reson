-- T05: simpan Sound Profile (server-validated, revision naik tiap perubahan) dan penanda intro.

-- Perbaikan izin: Supabase memberi EXECUTE ke anon secara eksplisit, jadi `revoke from public`
-- saja tidak cukup. Fungsi yang butuh login dicabut dari anon.
revoke execute on function complete_onboarding() from anon;
revoke execute on function is_staff() from anon;

create function mark_intro_seen() returns void
language sql security definer set search_path = public as $$
  update accounts set intro_seen = true where id = auth.uid();
$$;

-- Daftar genre/konteks yang diizinkan harus sama dengan shared/validation/soundProfile.ts.
create function save_sound_profile(
  p_genres text[],
  p_bass smallint,
  p_vocals smallint,
  p_treble smallint,
  p_contexts text[],
  p_discoverable boolean
) returns sound_profiles
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  allowed_genres text[] := array['pop','rock','jazz','hiphop','elektronik','klasik','rnb','metal','indie','kpop','lofi','akustik','soundtrack','dangdut'];
  allowed_contexts text[] := array['perjalanan','kerja_belajar','gaming','olahraga','santai','menonton'];
  g text[] := coalesce(p_genres, '{}');
  c text[] := coalesce(p_contexts, '{}');
  result sound_profiles;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from profiles where id = uid and status = 'active') then
    raise exception 'account not active' using errcode = '42501';
  end if;
  if cardinality(g) > 5 or not (g <@ allowed_genres) or cardinality(g) <> (select count(distinct x) from unnest(g) x) then
    raise exception 'invalid genres' using errcode = '22023';
  end if;
  if cardinality(c) > 6 or not (c <@ allowed_contexts) or cardinality(c) <> (select count(distinct x) from unnest(c) x) then
    raise exception 'invalid contexts' using errcode = '22023';
  end if;
  if p_discoverable is null then raise exception 'discoverable required' using errcode = '22023'; end if;
  -- bass/vocals/treble: null = belum tahu; di luar 1..5 ditolak oleh CHECK tabel.

  insert into sound_profiles as sp (user_id, genres, bass, vocals, treble, contexts, discoverable)
  values (uid, g, p_bass, p_vocals, p_treble, c, p_discoverable)
  on conflict (user_id) do update set
    genres = excluded.genres,
    bass = excluded.bass,
    vocals = excluded.vocals,
    treble = excluded.treble,
    contexts = excluded.contexts,
    discoverable = excluded.discoverable,
    revision = sp.revision + 1,
    updated_at = now()
  returning * into result;
  return result;
end;
$$;

revoke execute on function mark_intro_seen() from public, anon;
revoke execute on function save_sound_profile(text[], smallint, smallint, smallint, text[], boolean) from public, anon;
grant execute on function mark_intro_seen() to authenticated;
grant execute on function save_sound_profile(text[], smallint, smallint, smallint, text[], boolean) to authenticated;
