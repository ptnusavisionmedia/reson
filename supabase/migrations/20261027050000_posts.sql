-- T08: post (discussion/question), foto di bucket privat, dan RPC buat/ubah/hapus.

-- ID post dibuat klien dan dipakai sebagai kunci idempotensi; kolom request_id tidak diperlukan.
alter table posts drop column request_id;
create index on posts using gin (image_paths);

-- Bucket PRIVAT: foto hanya terbaca (lewat signed URL) bila post-nya published, atau oleh
-- pemilik foto. Post hidden/deleted otomatis kehilangan akses media tanpa menghapus objek.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy post_images_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy post_images_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy post_images_select on storage.objects for select to authenticated
  using (
    bucket_id = 'post-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from posts p where p.status = 'published' and name = any (p.image_paths))
    )
  );

-- Terbitkan post. Idempoten: memanggil ulang dengan p_id yang sama (retry/ketuk ganda)
-- mengembalikan post yang sudah ada, bukan membuat duplikat.
create function create_post(
  p_id uuid,
  p_community_id uuid,
  p_type post_type,
  p_title text,
  p_body text,
  p_image_paths text[]
) returns posts
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  t text := trim(coalesce(p_title, ''));
  b text := trim(coalesce(p_body, ''));
  imgs text[] := coalesce(p_image_paths, '{}');
  img text;
  res posts;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_email_verified() then raise exception 'email not verified' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = uid and status = 'active') then
    raise exception 'account not active' using errcode = '42501';
  end if;
  if p_id is null then raise exception 'invalid id' using errcode = '22023'; end if;
  if p_type not in ('discussion', 'question') then raise exception 'unsupported type' using errcode = '22023'; end if;
  if char_length(t) not between 1 and 120 then raise exception 'invalid title' using errcode = '22023'; end if;
  if char_length(b) not between 1 and 5000 then raise exception 'invalid body' using errcode = '22023'; end if;
  if cardinality(imgs) > 4 or cardinality(imgs) <> (select count(distinct x) from unnest(imgs) x) then
    raise exception 'invalid images' using errcode = '22023';
  end if;
  foreach img in array imgs loop
    if split_part(img, '/', 1) <> uid::text or split_part(img, '/', 2) <> p_id::text
       or not exists (select 1 from storage.objects where bucket_id = 'post-images' and name = img) then
      raise exception 'invalid images' using errcode = '22023';
    end if;
  end loop;

  -- Replay: sudah ada milik pemanggil -> kembalikan apa adanya.
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

  -- ON CONFLICT menangani dua permintaan yang berpapasan: yang kalah tinggal membaca hasilnya.
  insert into posts (id, author_id, community_id, type, title, body, image_paths)
  values (p_id, uid, p_community_id, p_type, t, b, imgs)
  on conflict (id) do nothing;

  select * into res from posts where id = p_id;
  if res.author_id <> uid then raise exception 'conflict' using errcode = '23505'; end if;
  return res;
end;
$$;

-- Ubah isi saja. authorId, communityId, type tidak bisa diganti (PRD F05).
create function edit_post(p_id uuid, p_title text, p_body text) returns posts
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  t text := trim(coalesce(p_title, ''));
  b text := trim(coalesce(p_body, ''));
  res posts;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_email_verified() then raise exception 'email not verified' using errcode = '42501'; end if;
  if char_length(t) not between 1 and 120 then raise exception 'invalid title' using errcode = '22023'; end if;
  if char_length(b) not between 1 and 5000 then raise exception 'invalid body' using errcode = '22023'; end if;

  update posts set title = t, body = b, updated_at = now()
   where id = p_id and author_id = uid and status = 'published'
  returning * into res;
  if not found then raise exception 'post not found' using errcode = 'P0002'; end if;
  return res;
end;
$$;

-- Hapus (soft delete). Mengembalikan path foto agar klien membersihkan objek Storage.
-- Walau pembersihan gagal, foto sudah tidak terbaca orang lain karena post tidak lagi published.
create function delete_post(p_id uuid) returns text[]
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  paths text[];
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  update posts set status = 'deleted', updated_at = now()
   where id = p_id and author_id = uid and status <> 'deleted'
  returning image_paths into paths;
  if not found then raise exception 'post not found' using errcode = 'P0002'; end if;
  update communities set pinned_post_ids = array_remove(pinned_post_ids, p_id) where p_id = any (pinned_post_ids);
  return paths;
end;
$$;

revoke execute on function create_post(uuid, uuid, post_type, text, text, text[]) from public, anon;
revoke execute on function edit_post(uuid, text, text) from public, anon;
revoke execute on function delete_post(uuid) from public, anon;
grant execute on function create_post(uuid, uuid, post_type, text, text, text[]) to authenticated;
grant execute on function edit_post(uuid, text, text) to authenticated;
grant execute on function delete_post(uuid) to authenticated;
