-- T11: blokir dua arah, laporan, dan moderasi (hide/restore/dismiss) dengan audit.

-- Satu-satunya definisi "terblokir": salah satu pihak memblokir yang lain. Security definer
-- karena pihak yang DIBLOKIR tidak boleh bisa membaca tabel blocks milik pemblokir.
create function is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;
revoke execute on function is_blocked_between(uuid, uuid) from public, anon;
grant execute on function is_blocked_between(uuid, uuid) to authenticated;

-- Penyaringan di RLS, bukan hanya di UI: post dan komentar pihak yang saling blokir tidak
-- terbaca di feed, daftar komunitas, detail, simpanan, maupun deep link.
drop policy posts_read on posts;
create policy posts_read on posts for select to authenticated using (
  status = 'published' and not is_blocked_between((select auth.uid()), author_id)
);

drop policy comments_read on comments;
create policy comments_read on comments for select to authenticated using (
  status in ('published', 'deleted')
  and not is_blocked_between((select auth.uid()), author_id)
  and exists (select 1 from posts p where p.id = post_id and p.status = 'published')
);

-- Moderator perlu melihat foto pada konten yang dilaporkan, termasuk yang sudah disembunyikan.
drop policy post_images_select on storage.objects;
create policy post_images_select on storage.objects for select to authenticated
  using (
    bucket_id = 'post-images'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or is_staff()
      or exists (select 1 from posts p where p.status = 'published' and name = any (p.image_paths))
    )
  );

-- Blokir/buka blokir. Memblokir juga memutus follow di kedua arah dan memperbaiki penghitung,
-- semuanya dalam satu pernyataan sehingga tidak ada keadaan setengah jadi.
create function block_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_user_id is null or p_user_id = uid then raise exception 'invalid target' using errcode = '22023'; end if;
  if not exists (select 1 from profiles where id = p_user_id) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  insert into blocks (blocker_id, blocked_id) values (uid, p_user_id) on conflict do nothing;

  with d1 as (delete from follows where follower_id = uid and following_id = p_user_id returning 1),
       d2 as (delete from follows where follower_id = p_user_id and following_id = uid returning 1)
  update profiles set
    follower_count = greatest(follower_count - case
      when id = p_user_id then (select count(*) from d1)
      when id = uid then (select count(*) from d2) else 0 end, 0),
    following_count = greatest(following_count - case
      when id = uid then (select count(*) from d1)
      when id = p_user_id then (select count(*) from d2) else 0 end, 0)
  where id in (uid, p_user_id);
end;
$$;

create function unblock_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  delete from blocks where blocker_id = uid and blocked_id = p_user_id;
end;
$$;

-- Aksi baru antara dua akun yang saling blokir ditolak di server (follow, like, komentar).
create or replace function follow_user(p_user_id uuid) returns int
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
  if p_user_id is null or p_user_id = uid then raise exception 'cannot follow self' using errcode = '22023'; end if;
  if not exists (select 1 from profiles where id = p_user_id and status = 'active') then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if is_blocked_between(uid, p_user_id) then raise exception 'blocked' using errcode = '42501'; end if;

  insert into follows (follower_id, following_id) values (uid, p_user_id) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then
    update profiles set
      follower_count = follower_count + case when id = p_user_id then 1 else 0 end,
      following_count = following_count + case when id = uid then 1 else 0 end
    where id in (uid, p_user_id);
  end if;
  select follower_count into cnt from profiles where id = p_user_id;
  return cnt;
end;
$$;

create or replace function like_post(p_post_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  author uuid;
  n int;
  cnt int;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_email_verified() then raise exception 'email not verified' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = uid and status = 'active') then
    raise exception 'account not active' using errcode = '42501';
  end if;
  select author_id into author from posts where id = p_post_id and status = 'published';
  if not found then raise exception 'post not found' using errcode = 'P0002'; end if;
  if is_blocked_between(uid, author) then raise exception 'blocked' using errcode = '42501'; end if;

  insert into post_likes (post_id, user_id) values (p_post_id, uid) on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then update posts set like_count = like_count + 1 where id = p_post_id; end if;
  select like_count into cnt from posts where id = p_post_id;
  return cnt;
end;
$$;

create or replace function create_comment(p_id uuid, p_post_id uuid, p_parent_id uuid, p_body text) returns comments
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

  select * into postrow from posts where id = p_post_id for update;
  if not found or postrow.status <> 'published' then raise exception 'post not found' using errcode = 'P0002'; end if;

  select * into res from comments where id = p_id;
  if found then
    if res.author_id <> uid or res.post_id <> p_post_id then raise exception 'conflict' using errcode = '23505'; end if;
    return res;
  end if;

  if is_blocked_between(uid, postrow.author_id) then raise exception 'blocked' using errcode = '42501'; end if;
  if p_parent_id is not null then
    select * into parent from comments where id = p_parent_id;
    if not found or parent.post_id <> p_post_id or parent.parent_comment_id is not null or parent.status <> 'published' then
      raise exception 'invalid parent' using errcode = '22023';
    end if;
    if is_blocked_between(uid, parent.author_id) then raise exception 'blocked' using errcode = '42501'; end if;
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

-- Laporan. Satu laporan terbuka per pelapor per target (ketukan ganda/retry tidak menggandakan).
create unique index reports_open_unique on reports (reporter_id, target_type, target_id) where status = 'open';

create function create_report(p_target_type text, p_target_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  r text := trim(coalesce(p_reason, ''));
  owner uuid;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_email_verified() then raise exception 'email not verified' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = uid and status = 'active') then
    raise exception 'account not active' using errcode = '42501';
  end if;
  if p_target_type not in ('post', 'comment', 'user') or p_target_id is null then
    raise exception 'invalid target' using errcode = '22023';
  end if;
  if char_length(r) not between 1 and 500 then raise exception 'invalid reason' using errcode = '22023'; end if;

  if p_target_type = 'post' then
    select author_id into owner from posts where id = p_target_id and status <> 'deleted';
  elsif p_target_type = 'comment' then
    select author_id into owner from comments where id = p_target_id and status <> 'deleted';
  else
    select id into owner from profiles where id = p_target_id;
  end if;
  if owner is null then raise exception 'target not found' using errcode = 'P0002'; end if;
  if owner = uid then raise exception 'invalid target' using errcode = '22023'; end if;
  if (select count(*) from reports where reporter_id = uid and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate limited' using errcode = '54000';
  end if;

  insert into reports (reporter_id, target_type, target_id, reason) values (uid, p_target_type, p_target_id, r)
  on conflict (reporter_id, target_type, target_id) where status = 'open' do nothing;
end;
$$;

-- Cuplikan target untuk moderator, termasuk yang sudah disembunyikan. Hanya staf (dicek di server).
create function moderation_target(p_report_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r reports;
  result jsonb;
begin
  if not is_staff() then raise exception 'not authorized' using errcode = '42501'; end if;
  select * into r from reports where id = p_report_id;
  if not found then raise exception 'report not found' using errcode = 'P0002'; end if;

  if r.target_type = 'post' then
    select jsonb_build_object('type', 'post', 'id', p.id, 'status', p.status, 'title', p.title, 'body', p.body,
             'imagePaths', to_jsonb(p.image_paths), 'authorId', p.author_id, 'authorUsername', pr.username)
      into result from posts p join profiles pr on pr.id = p.author_id where p.id = r.target_id;
  elsif r.target_type = 'comment' then
    select jsonb_build_object('type', 'comment', 'id', c.id, 'status', c.status, 'body', c.body,
             'postId', c.post_id, 'authorId', c.author_id, 'authorUsername', pr.username)
      into result from comments c join profiles pr on pr.id = c.author_id where c.id = r.target_id;
  else
    select jsonb_build_object('type', 'user', 'id', pr.id, 'status', pr.status, 'displayName', pr.display_name,
             'bio', pr.bio, 'authorUsername', pr.username)
      into result from profiles pr where pr.id = r.target_id;
  end if;
  return coalesce(result, jsonb_build_object('type', r.target_type, 'missing', true));
end;
$$;

-- Proses laporan: dismiss | hide | restore. Semua dicatat di moderation_audit.
-- hide pada pengguna = suspend (status suspended); akun staf tidak bisa dimoderasi.
create function moderate_report(p_report_id uuid, p_action text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  why text := trim(coalesce(p_reason, ''));
  r reports;
  post_of_comment uuid;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_staff() then raise exception 'not authorized' using errcode = '42501'; end if;
  if p_action not in ('dismiss', 'hide', 'restore') then raise exception 'invalid action' using errcode = '22023'; end if;
  if char_length(why) not between 3 and 500 then raise exception 'invalid reason' using errcode = '22023'; end if;

  select * into r from reports where id = p_report_id for update;
  if not found then raise exception 'report not found' using errcode = 'P0002'; end if;
  if r.status <> 'open' then raise exception 'report already resolved' using errcode = '23505'; end if;

  if p_action in ('hide', 'restore') then
    if r.target_type = 'post' then
      update posts set status = case when p_action = 'hide' then 'hidden'::post_status else 'published'::post_status end,
                       updated_at = now()
       where id = r.target_id and status = case when p_action = 'hide' then 'published'::post_status else 'hidden'::post_status end;
    elsif r.target_type = 'comment' then
      update comments set status = case when p_action = 'hide' then 'hidden'::post_status else 'published'::post_status end,
                          updated_at = now()
       where id = r.target_id and status = case when p_action = 'hide' then 'published'::post_status else 'hidden'::post_status end
      returning post_id into post_of_comment;
      if post_of_comment is not null then
        perform 1 from posts where id = post_of_comment for update;
        perform refresh_post_comment_stats(post_of_comment);
      end if;
    else
      if exists (select 1 from accounts where id = r.target_id and role in ('moderator', 'admin')) then
        raise exception 'cannot moderate staff' using errcode = '42501';
      end if;
      update profiles set status = case when p_action = 'hide' then 'suspended'::account_status else 'active'::account_status end,
                          updated_at = now()
       where id = r.target_id and status = case when p_action = 'hide' then 'active'::account_status else 'suspended'::account_status end;
    end if;
  end if;

  update reports set
    status = case when p_action = 'hide' then 'actioned'::report_status else 'dismissed'::report_status end,
    moderator_id = uid,
    resolution = why
  where id = p_report_id;

  insert into moderation_audit (actor_id, action, target_id, reason) values (uid, p_action, r.target_id, why);
end;
$$;

revoke execute on function block_user(uuid) from public, anon;
revoke execute on function unblock_user(uuid) from public, anon;
revoke execute on function follow_user(uuid) from public, anon;
revoke execute on function like_post(uuid) from public, anon;
revoke execute on function create_comment(uuid, uuid, uuid, text) from public, anon;
revoke execute on function create_report(text, uuid, text) from public, anon;
revoke execute on function moderation_target(uuid) from public, anon;
revoke execute on function moderate_report(uuid, text, text) from public, anon;
grant execute on function block_user(uuid) to authenticated;
grant execute on function unblock_user(uuid) to authenticated;
grant execute on function create_report(text, uuid, text) to authenticated;
grant execute on function moderation_target(uuid) to authenticated;
grant execute on function moderate_report(uuid, text, text) to authenticated;
