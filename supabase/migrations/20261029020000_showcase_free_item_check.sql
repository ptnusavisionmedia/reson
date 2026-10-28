-- T13 perbaikan: item bebas pada showcase tidak boleh memakai nama perangkat yang sudah ada di katalog.
-- Pengecekan dilakukan setelah blok validasi utama agar pesannya tidak tertimpa "invalid details".

create or replace function prepare_post_details(p_type post_type, p_details jsonb) returns jsonb
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
  dup text;
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
  -- Item bebas tidak boleh memakai nama perangkat yang SUDAH ada di katalog: pemilih katalog wajib
  -- dipakai agar komponen terkait ke perangkat sebenarnya (dan tidak tampak "tidak diverifikasi").
  if p_type = 'showcase' then
    dup := (
      select e ->> 'label'
      from jsonb_array_elements(comps) e
      join devices dv on dv.status = 'active' and dv.name_lower = lower(regexp_replace(trim(e ->> 'label'), '\s+', ' ', 'g'))
      where e ->> 'deviceId' is null
      limit 1
    );
    if dup is not null then
      raise exception 'catalog device exists: %', dup using errcode = '23505';
    end if;
  end if;
  return jsonb_build_object('details', result, 'device_ids', to_jsonb(ids));
end;
$$;
revoke execute on function prepare_post_details(post_type, jsonb) from public, anon, authenticated;
