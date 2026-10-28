-- T09: komentar (satu tingkat balasan), tombstone, like idempoten, dan statistik turunan.

create index on comments (parent_comment_id);

-- Komentar utama yang dihapus tetap terbaca sebagai tombstone (isi dikosongkan oleh delete_comment)
-- agar balasan tidak yatim. Klien hanya menampilkannya bila masih punya balasan aktif.
drop policy comments_read on comments;
create policy comments_read on comments for select to authenticated using (
  status in ('published', 'deleted')
  and exists (select 1 from posts p where p.id = post_id and p.status = 'published')
);

-- Status like milik sendiri (tombol "sudah disukai"). Penulis lain tidak bisa melihat siapa yang menyukai.
create policy post_likes_own_read on post_likes for select to authenticated using (user_id = auth.uid());

-- Hitung ulang dari data (bukan increment) sehingga tidak bisa melenceng karena retry/event ganda.
-- Hanya dipanggil dari RPC lain; tidak bisa dieksekusi klien.
create function refresh_post_comment_stats(p_post_id uuid) returns void
language sql security definer set search_path = public as $$
  update posts set
    comment_count = (select count(*) from comments c where c.post_id = posts.id and c.status = 'published'),
    has_answers = exists (
      select 1 from comments c
      where c.post_id = posts.id and c.status = 'published' and c.author_id <> posts.author_id
    )
  where id = p_post_id;
$$;

create function create_comment(p_id uuid, p_post_id uuid, p_parent_id uuid, p_body text) returns comments
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  b text := trim(coalesce(p_body, ''));
  postrow posts;
  parent comments;
  res comments;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_email_verified() then raise exception 'email not verified' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = uid and status = 'active') then
    raise exception 'account not active' using errcode = '42501';
  end if;
  if p_id is null then raise exception 'invalid id' using errcode = '22023'; end if;
  if char_length(b) not between 1 and 1000 then raise exception 'invalid body' using errcode = '22023'; end if;

  -- Kunci baris post agar komentar yang berpapasan menghitung statistik secara berurutan.
  select * into postrow from posts where id = p_post_id for update;
  if not found or postrow.status <> 'published' then raise exception 'post not found' using errcode = 'P0002'; end if;

  -- Replay (retry): kembalikan komentar yang sudah ada.
  select * into res from comments where id = p_id;
  if found then
    if res.author_id <> uid or res.post_id <> p_post_id then raise exception 'conflict' using errcode = '23505'; end if;
    return res;
  end if;

  if p_parent_id is not null then
    select * into parent from comments where id = p_parent_id;
    if not found or parent.post_id <> p_post_id or parent.parent_comment_id is not null or parent.status <> 'published' then
      raise exception 'invalid parent' using errcode = '22023';
    end if;
  end if;
  if (select count(*) from comments where author_id = uid and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate limited' using errcode = '54000';
  end if;

  insert into comments (id, post_id, author_id, parent_comment_id, body)
  values (p_id, p_post_id, uid, p_parent_id, b);
  perform refresh_post_comment_stats(p_post_id);

  select * into res from comments where id = p_id;
  return res;
end;
$$;

create function edit_comment(p_id uuid, p_body text) returns comments
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  b text := trim(coalesce(p_body, ''));
  res comments;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_email_verified() then raise exception 'email not verified' using errcode = '42501'; end if;
  if char_length(b) not between 1 and 1000 then raise exception 'invalid body' using errcode = '22023'; end if;

  update comments set body = b, updated_at = now()
   where id = p_id and author_id = uid and status = 'published'
  returning * into res;
  if not found then raise exception 'comment not found' using errcode = 'P0002'; end if;
  return res;
end;
$$;

-- Hapus idempoten. Isi dikosongkan; bila punya balasan, barisnya tetap sebagai tombstone.
create function delete_comment(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  c comments;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into c from comments where id = p_id and author_id = uid;
  if not found then raise exception 'comment not found' using errcode = 'P0002'; end if;
  if c.status <> 'published' then return; end if; -- sudah dihapus/disembunyikan: tidak ada yang dikerjakan

  perform 1 from posts where id = c.post_id for update;
  update comments set status = 'deleted', body = '', updated_at = now() where id = p_id;
  perform refresh_post_comment_stats(c.post_id);
end;
$$;

-- Like/unlike idempoten: penghitung hanya berubah bila baris like benar-benar bertambah/berkurang.
create function like_post(p_post_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  n int;
  cnt int;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_email_verified() then raise exception 'email not verified' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = uid and status = 'active') then
    raise exception 'account not active' using errcode = '42501';
  end if;
  if not exists (select 1 from posts where id = p_post_id and status = 'published') then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  insert into post_likes (post_id, user_id) values (p_post_id, uid) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then update posts set like_count = like_count + 1 where id = p_post_id; end if;
  select like_count into cnt from posts where id = p_post_id;
  return cnt;
end;
$$;

create function unlike_post(p_post_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  n int;
  cnt int;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from posts where id = p_post_id) then
    raise exception 'post not found' using errcode = 'P0002';
  end if;

  delete from post_likes where post_id = p_post_id and user_id = uid;
  get diagnostics n = row_count;
  if n > 0 then update posts set like_count = greatest(like_count - 1, 0) where id = p_post_id; end if;
  select like_count into cnt from posts where id = p_post_id;
  return cnt;
end;
$$;

revoke execute on function refresh_post_comment_stats(uuid) from public, anon, authenticated;
revoke execute on function create_comment(uuid, uuid, uuid, text) from public, anon;
revoke execute on function edit_comment(uuid, text) from public, anon;
revoke execute on function delete_comment(uuid) from public, anon;
revoke execute on function like_post(uuid) from public, anon;
revoke execute on function unlike_post(uuid) from public, anon;
grant execute on function create_comment(uuid, uuid, uuid, text) to authenticated;
grant execute on function edit_comment(uuid, text) to authenticated;
grant execute on function delete_comment(uuid) to authenticated;
grant execute on function like_post(uuid) to authenticated;
grant execute on function unlike_post(uuid) to authenticated;
