-- T12: Taste Match (PRD F09). Skor dihitung di server; hasil di-cache privat per pengguna.
-- Implementasi referensi: shared/matching/score.ts (dipakai unit test). Jaga keduanya tetap sama;
-- scripts/match-parity.ts membandingkan fungsi ini dengan referensi memakai fixture yang sama.

create type match_calc as (
  score numeric,
  coverage numeric,
  label text,
  shared_genres text[],
  shared_prefs text[],
  differences text[]
);

-- Fungsi MURNI: tidak membaca tabel apa pun, sehingga aman dieksekusi siapa saja dan bisa diuji
-- langsung. Nilai null (belum tahu) tidak dinilai; bobot dinormalisasi pada komponen yang tersedia.
create function taste_match_compute(
  a_genres text[], a_bass smallint, a_vocals smallint, a_treble smallint, a_contexts text[],
  b_genres text[], b_bass smallint, b_vocals smallint, b_treble smallint, b_contexts text[]
) returns match_calc
language plpgsql immutable as $$
declare
  ag text[] := coalesce(a_genres, '{}');
  bg text[] := coalesce(b_genres, '{}');
  ac text[] := coalesce(a_contexts, '{}');
  bc text[] := coalesce(b_contexts, '{}');
  sims numeric[] := '{}';
  prefs text[] := '{}';
  diffs text[] := '{}';
  sg text[] := '{}';
  sc text[] := '{}';
  d numeric;
  n_dims int;
  sound numeric;
  genre numeric;
  ctx numeric;
  inter int;
  uni int;
  acc numeric := 0;
  w numeric := 0;
  cov numeric;
  sco numeric;
  lbl text;
  x text;
begin
  if a_bass is not null and b_bass is not null then
    d := abs(a_bass - b_bass); sims := array_append(sims, 1 - d / 4);
    if d <= 1 then prefs := array_append(prefs, 'bass'); else diffs := array_append(diffs, 'bass'); end if;
  end if;
  if a_vocals is not null and b_vocals is not null then
    d := abs(a_vocals - b_vocals); sims := array_append(sims, 1 - d / 4);
    if d <= 1 then prefs := array_append(prefs, 'vocals'); else diffs := array_append(diffs, 'vocals'); end if;
  end if;
  if a_treble is not null and b_treble is not null then
    d := abs(a_treble - b_treble); sims := array_append(sims, 1 - d / 4);
    if d <= 1 then prefs := array_append(prefs, 'treble'); else diffs := array_append(diffs, 'treble'); end if;
  end if;

  n_dims := coalesce(cardinality(sims), 0);
  if n_dims > 0 then
    sound := (select avg(v) from unnest(sims) v);
    acc := acc + 0.5 * sound; w := w + 0.5;
  end if;

  if cardinality(ag) > 0 and cardinality(bg) > 0 then
    sg := array(select distinct g from unnest(ag) g where g = any (bg) order by g);
    inter := cardinality(sg);
    uni := (select count(*) from (select unnest(ag) union select unnest(bg)) u);
    genre := inter::numeric / uni;
    acc := acc + 0.3 * genre; w := w + 0.3;
    if inter = 0 then diffs := array_append(diffs, 'genre'); end if;
  end if;

  if cardinality(ac) > 0 and cardinality(bc) > 0 then
    sc := array(select distinct c from unnest(ac) c where c = any (bc) order by c);
    inter := cardinality(sc);
    uni := (select count(*) from (select unnest(ac) union select unnest(bc)) u);
    ctx := inter::numeric / uni;
    acc := acc + 0.2 * ctx; w := w + 0.2;
    foreach x in array sc loop prefs := array_append(prefs, 'ctx:' || x); end loop;
  end if;

  cov := round(0.5 * (n_dims / 3.0) + case when genre is not null then 0.3 else 0 end + case when ctx is not null then 0.2 else 0 end, 6);
  sco := round(case when w > 0 then acc / w else 0 end, 6);

  if cov < 0.6 then lbl := 'Kecocokan awal';
  elsif sco >= 0.8 then lbl := 'Sangat dekat';
  elsif sco >= 0.6 then lbl := 'Cukup dekat';
  else lbl := 'Sebagian selera sama';
  end if;

  return row(sco, cov, lbl, sg, prefs, diffs)::match_calc;
end;
$$;
grant execute on function taste_match_compute(text[], smallint, smallint, smallint, text[], text[], smallint, smallint, smallint, text[]) to anon, authenticated;

-- Hitung ulang hasil Match untuk pemanggil. Hasil dianggap segar bila revision profil pemilik
-- sama, versi algoritma sama, dan belum kedaluwarsa (TTL 24 jam); selain itu dihitung ulang.
-- Laju dibatasi: tanpa p_force, hasil segar tidak dihitung ulang; dengan p_force, paling cepat
-- tiap 10 menit. Kandidat dibatasi 200: 150 dengan genre bersama + 50 sampel eksplorasi
-- (urutan md5 stabil, bukan acak, supaya input yang sama memberi hasil yang sama).
-- Mengembalikan 'refreshed' | 'fresh' | 'cooldown'.
create function refresh_matches(p_force boolean default false) returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  me sound_profiles;
  last_at timestamptz;
  is_fresh boolean;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from profiles where id = uid and status = 'active') then
    raise exception 'account not active' using errcode = '42501';
  end if;
  select * into me from sound_profiles where user_id = uid;
  if not found then raise exception 'no sound profile' using errcode = 'P0002'; end if;
  if not me.discoverable then raise exception 'match disabled' using errcode = '42501'; end if;

  -- Serialkan refresh milik pengguna yang sama (ketukan ganda / dua perangkat).
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 12));

  select max(computed_at) into last_at from match_results where user_id = uid;
  select exists (
    select 1 from match_results
    where user_id = uid and viewer_revision = me.revision and algorithm_version = 1 and expires_at > now()
  ) into is_fresh;

  if is_fresh and not p_force then return 'fresh'; end if;
  if is_fresh and p_force and last_at > now() - interval '10 minutes' then return 'cooldown'; end if;

  delete from match_results where user_id = uid;

  insert into match_results (
    user_id, candidate_id, score, coverage, label, shared_genres, shared_preferences, differences,
    algorithm_version, viewer_revision, candidate_revision, expires_at
  )
  with pool as (
    select s.*, cardinality(array(select unnest(s.genres) intersect select unnest(me.genres))) as shared_count
    from sound_profiles s
    join profiles p on p.id = s.user_id and p.status = 'active'
    where s.discoverable and s.user_id <> uid and not is_blocked_between(uid, s.user_id)
  ),
  picked as (
    (select user_id from pool where shared_count > 0 order by shared_count desc, md5(user_id::text || uid::text) limit 150)
    union
    (select user_id from pool where shared_count = 0 order by md5(user_id::text || uid::text) limit 50)
  )
  select uid, c.user_id, m.score, m.coverage, m.label, m.shared_genres, m.shared_prefs, m.differences,
         1, me.revision, c.revision, now() + interval '24 hours'
  from picked
  join sound_profiles c on c.user_id = picked.user_id
  cross join lateral taste_match_compute(
    me.genres, me.bass, me.vocals, me.treble, me.contexts,
    c.genres, c.bass, c.vocals, c.treble, c.contexts
  ) m;

  return 'refreshed';
end;
$$;
revoke execute on function refresh_matches(boolean) from public, anon;
grant execute on function refresh_matches(boolean) to authenticated;

-- Baca hasil Match. SECURITY INVOKER: RLS tetap berlaku. Setiap baris divalidasi ulang saat dibaca
-- (revision kandidat, status akun, discoverable, blokir), jadi hasil lama tidak menampilkan
-- akun yang sudah berubah, menonaktifkan Match, atau terblokir.
create function get_my_matches(p_label text default null, p_limit int default 20, p_offset int default 0)
returns table (
  candidate_id uuid, username text, display_name text, avatar_path text,
  label text, coverage real, shared_genres text[], shared_preferences text[], differences text[],
  bass smallint, vocals smallint, treble smallint, genres text[], contexts text[], computed_at timestamptz
)
language sql stable set search_path = public as $$
  select m.candidate_id, p.username, p.display_name, p.avatar_path,
         m.label, m.coverage, m.shared_genres, m.shared_preferences, m.differences,
         s.bass, s.vocals, s.treble, s.genres, s.contexts, m.computed_at
  from match_results m
  join sound_profiles me on me.user_id = m.user_id
  join sound_profiles s on s.user_id = m.candidate_id
  join profiles p on p.id = m.candidate_id
  where m.user_id = auth.uid()
    and me.discoverable
    and m.viewer_revision = me.revision
    and m.algorithm_version = 1
    and m.expires_at > now()
    and s.revision = m.candidate_revision
    and s.discoverable
    and p.status = 'active'
    and not is_blocked_between(auth.uid(), m.candidate_id)
    and (p_label is null or m.label = p_label)
  order by m.score desc, m.candidate_id
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
$$;
revoke execute on function get_my_matches(text, int, int) from public, anon;
grant execute on function get_my_matches(text, int, int) to authenticated;
