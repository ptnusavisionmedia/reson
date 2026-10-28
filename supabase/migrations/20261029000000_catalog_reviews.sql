-- T13: katalog perangkat, review dan showcase pada sistem post yang sama, usulan perangkat.

create index on profiles (username text_pattern_ops);

-- Gambar perangkat: publik untuk dibaca, tanpa policy tulis untuk klien (hanya admin lewat dashboard).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('device-images', 'device-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Validasi + normalisasi detail review/showcase di server. Hanya kunci yang dikenal yang disimpan,
-- teks dipangkas dan dibatasi, dan SEMUA ID perangkat harus ada di katalog aktif. Mengembalikan
-- {details, device_ids}; device_ids diturunkan dari isi, bukan dikirim klien, sehingga indeks
-- referensi perangkat tidak bisa berbeda dari isi review/showcase.
create function prepare_post_details(p_type post_type, p_details jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d jsonb := coalesce(p_details, '{}'::jsonb);
  ids uuid[] := '{}';
  main_id uuid;
  own text;
  companions uuid[];
  pros text[];
  cons text[];
  tracks jsonb;
  comps jsonb;
  result jsonb;
begin
  if p_type in ('discussion', 'question') then
    return jsonb_build_object('details', '{}'::jsonb, 'device_ids', '[]'::jsonb);
  end if;

  begin
    if jsonb_typeof(d) <> 'object' then raise exception 'x'; end if;

    if p_type = 'review' then
      main_id := (d ->> 'deviceId')::uuid;
      own := d ->> 'ownership';
      if main_id is null or own is null or own not in ('owned', 'borrowed', 'sponsored') then raise exception 'x'; end if;

      companions := array(select distinct x::uuid from jsonb_array_elements_text(coalesce(d -> 'companionDeviceIds', '[]'::jsonb)) x);
      if cardinality(companions) > 5 or main_id = any (companions) then raise exception 'x'; end if;

      pros := array(select left(trim(x), 100) from jsonb_array_elements_text(coalesce(d -> 'pros', '[]'::jsonb)) x where trim(x) <> '');
      cons := array(select left(trim(x), 100) from jsonb_array_elements_text(coalesce(d -> 'cons', '[]'::jsonb)) x where trim(x) <> '');
      if cardinality(pros) > 5 or cardinality(cons) > 5 then raise exception 'x'; end if;

      tracks := coalesce((
        select jsonb_agg(jsonb_build_object('title', left(trim(e ->> 'title'), 100), 'url', nullif(left(trim(coalesce(e ->> 'url', '')), 300), '')))
        from jsonb_array_elements(coalesce(d -> 'referenceTracks', '[]'::jsonb)) e
        where trim(coalesce(e ->> 'title', '')) <> ''
      ), '[]'::jsonb);
      if jsonb_array_length(tracks) > 5 then raise exception 'x'; end if;
      if exists (select 1 from jsonb_array_elements(tracks) t where t ->> 'url' is not null and t ->> 'url' !~ '^https?://') then
        raise exception 'x';
      end if;

      ids := array[main_id] || companions;
      result := jsonb_build_object(
        'deviceId', main_id,
        'ownership', own,
        'bassNotes', nullif(left(trim(coalesce(d ->> 'bassNotes', '')), 500), ''),
        'vocalNotes', nullif(left(trim(coalesce(d ->> 'vocalNotes', '')), 500), ''),
        'trebleNotes', nullif(left(trim(coalesce(d ->> 'trebleNotes', '')), 500), ''),
        'comfortNotes', nullif(left(trim(coalesce(d ->> 'comfortNotes', '')), 500), ''),
        'pros', to_jsonb(pros),
        'cons', to_jsonb(cons),
        'companionDeviceIds', to_jsonb(companions),
        'referenceTracks', tracks
      );
    else
      -- showcase: nama setup = judul post; komponen berurutan (HP -> DAC -> IEM), posisi dinomori ulang.
      comps := coalesce((
        select jsonb_agg(jsonb_build_object('deviceId', nullif(s.e ->> 'deviceId', '')::uuid, 'label', left(trim(s.e ->> 'label'), 80), 'position', s.rn - 1) order by s.rn)
        from (
          select t.e, row_number() over (order by t.ord) as rn
          from jsonb_array_elements(coalesce(d -> 'components', '[]'::jsonb)) with ordinality as t(e, ord)
          where trim(coalesce(t.e ->> 'label', '')) <> ''
        ) s
      ), '[]'::jsonb);
      if jsonb_array_length(comps) not between 1 and 10 then raise exception 'x'; end if;
      ids := array(select distinct (e ->> 'deviceId')::uuid from jsonb_array_elements(comps) e where e ->> 'deviceId' is not null);
      result := jsonb_build_object(
        'purpose', nullif(left(trim(coalesce(d ->> 'purpose', '')), 200), ''),
        'impressions', nullif(left(trim(coalesce(d ->> 'impressions', '')), 1000), ''),
        'components', comps
      );
    end if;
  exception when others then
    raise exception 'invalid details' using errcode = '22023';
  end;

  if cardinality(ids) > 0 and (select count(*) from devices where id = any (ids) and status = 'active') <> cardinality(ids) then
    raise exception 'device not found' using errcode = 'P0002';
  end if;
  return jsonb_build_object('details', result, 'device_ids', to_jsonb(ids));
end;
$$;
revoke execute on function prepare_post_details(post_type, jsonb) from public, anon, authenticated;

-- create_post/edit_post diganti dengan versi yang menerima detail. Tanda tangan lama dihapus agar
-- tidak ada dua versi yang tersisa.
drop function create_post(uuid, uuid, post_type, text, text, text[]);
drop function edit_post(uuid, text, text);

create function create_post(
  p_id uuid,
  p_community_id uuid,
  p_type post_type,
  p_title text,
  p_body text,
  p_image_paths text[],
  p_details jsonb default '{}'::jsonb
) returns posts
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  t text := trim(coalesce(p_title, ''));
  b text := trim(coalesce(p_body, ''));
  imgs text[] := coalesce(p_image_paths, '{}');
  img text;
  prep jsonb;
  res posts;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_email_verified() then raise exception 'email not verified' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = uid and status = 'active') then
    raise exception 'account not active' using errcode = '42501';
  end if;
  if p_id is null then raise exception 'invalid id' using errcode = '22023'; end if;
  if char_length(t) not between 1 and 120 then raise exception 'invalid title' using errcode = '22023'; end if;
  -- Diskusi/pertanyaan wajib punya isi; review/showcase boleh hanya berisi detail terstruktur.
  if char_length(b) > 5000 or (p_type in ('discussion', 'question') and char_length(b) < 1) then
    raise exception 'invalid body' using errcode = '22023';
  end if;
  prep := prepare_post_details(p_type, p_details);
  if cardinality(imgs) > 4 or cardinality(imgs) <> (select count(distinct x) from unnest(imgs) x) then
    raise exception 'invalid images' using errcode = '22023';
  end if;
  foreach img in array imgs loop
    if split_part(img, '/', 1) <> uid::text or split_part(img, '/', 2) <> p_id::text
       or not exists (select 1 from storage.objects where bucket_id = 'post-images' and name = img) then
      raise exception 'invalid images' using errcode = '22023';
    end if;
  end loop;

  select * into res from posts where id = p_id;
  if found then
    if res.author_id <> uid then raise exception 'conflict' using errcode = '23505'; end if;
    return res;
  end if;

  if not exists (select 1 from communities where id = p_community_id and status = 'active') then
    raise exception 'community not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from community_members where community_id = p_community_id and user_id = uid) then
    raise exception 'not a member' using errcode = '42501';
  end if;
  if (select count(*) from posts where author_id = uid and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate limited' using errcode = '54000';
  end if;

  insert into posts (id, author_id, community_id, type, title, body, image_paths, details, device_ids)
  values (p_id, uid, p_community_id, p_type, t, b, imgs, prep -> 'details',
          array(select jsonb_array_elements_text(prep -> 'device_ids')::uuid))
  on conflict (id) do nothing;

  select * into res from posts where id = p_id;
  if res.author_id <> uid then raise exception 'conflict' using errcode = '23505'; end if;
  return res;
end;
$$;

-- Ubah isi saja. authorId, communityId, type tidak bisa diganti. p_details null = detail tidak diubah.
create function edit_post(p_id uuid, p_title text, p_body text, p_details jsonb default null) returns posts
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  t text := trim(coalesce(p_title, ''));
  b text := trim(coalesce(p_body, ''));
  cur posts;
  prep jsonb;
  res posts;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_email_verified() then raise exception 'email not verified' using errcode = '42501'; end if;

  select * into cur from posts where id = p_id and author_id = uid and status = 'published' for update;
  if not found then raise exception 'post not found' using errcode = 'P0002'; end if;

  if char_length(t) not between 1 and 120 then raise exception 'invalid title' using errcode = '22023'; end if;
  if char_length(b) > 5000 or (cur.type in ('discussion', 'question') and char_length(b) < 1) then
    raise exception 'invalid body' using errcode = '22023';
  end if;

  if p_details is not null and cur.type in ('review', 'showcase') then
    prep := prepare_post_details(cur.type, p_details);
    update posts set title = t, body = b, details = prep -> 'details',
                     device_ids = array(select jsonb_array_elements_text(prep -> 'device_ids')::uuid),
                     updated_at = now()
     where id = p_id returning * into res;
  else
    update posts set title = t, body = b, updated_at = now() where id = p_id returning * into res;
  end if;
  return res;
end;
$$;

revoke execute on function create_post(uuid, uuid, post_type, text, text, text[], jsonb) from public, anon;
revoke execute on function edit_post(uuid, text, text, jsonb) from public, anon;
grant execute on function create_post(uuid, uuid, post_type, text, text, text[], jsonb) to authenticated;
grant execute on function edit_post(uuid, text, text, jsonb) to authenticated;

-- Usulan perangkat untuk antrean admin. Tidak ada harga otomatis; admin memproses lewat dashboard.
create function suggest_device(p_name text, p_brand text, p_source_url text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  n text := trim(coalesce(p_name, ''));
  br text := trim(coalesce(p_brand, ''));
  url text := nullif(trim(coalesce(p_source_url, '')), '');
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_email_verified() then raise exception 'email not verified' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = uid and status = 'active') then
    raise exception 'account not active' using errcode = '42501';
  end if;
  if char_length(n) not between 2 and 100 or char_length(br) not between 1 and 60 then
    raise exception 'invalid suggestion' using errcode = '22023';
  end if;
  if url is not null and (char_length(url) > 300 or url !~ '^https?://') then
    raise exception 'invalid suggestion' using errcode = '22023';
  end if;
  if exists (select 1 from devices where name_lower = lower(n)) then
    raise exception 'device exists' using errcode = '23505';
  end if;
  if (select count(*) from device_suggestions where submitted_by = uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'rate limited' using errcode = '54000';
  end if;
  insert into device_suggestions (submitted_by, name, brand, source_url) values (uid, n, br, url);
end;
$$;
revoke execute on function suggest_device(text, text, text) from public, anon;
grant execute on function suggest_device(text, text, text) to authenticated;
