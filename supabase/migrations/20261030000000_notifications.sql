-- T14: notifikasi dalam aplikasi (follow, komentar, balasan). Dibuat server, idempoten.

-- Satu-satunya pintu pembuatan notifikasi. Hanya dipanggil dari RPC lain (tidak dari klien).
-- Dilewati bila: untuk diri sendiri, kedua akun saling blokir, penerima tidak aktif, atau penerima
-- mematikan jenis notifikasi itu. event_key unik, jadi retry/event ganda tidak membuat duplikat.
create function create_notification(
  p_user uuid, p_type text, p_actor uuid, p_post uuid, p_comment uuid, p_key text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_actor is null or p_user = p_actor then return; end if;
  if is_blocked_between(p_user, p_actor) then return; end if;
  if not exists (select 1 from profiles where id = p_user and status = 'active') then return; end if;
  if coalesce((select (notification_preferences ->> p_type)::boolean from accounts where id = p_user), true) = false then
    return;
  end if;
  insert into notifications (event_key, user_id, type, actor_id, post_id, comment_id)
  values (p_key, p_user, p_type, p_actor, p_post, p_comment)
  on conflict (event_key) do nothing;
end;
$$;
revoke execute on function create_notification(uuid, text, uuid, uuid, uuid, text) from public, anon, authenticated;

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
    -- Notifikasi hanya saat follow benar-benar baru; kunci event deterministik mencegah duplikat.
    perform create_notification(p_user_id, 'follow', uid, null, null, 'follow:' || uid || ':' || p_user_id);
  end if;
  select follower_count into cnt from profiles where id = p_user_id;
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

  -- Komentar utama memberi tahu penulis post. Balasan memberi tahu penulis komentar yang dibalas,
  -- dan penulis post (bila berbeda) sebagai komentar baru. Aksi untuk diri sendiri dilewati di create_notification.
  if p_parent_id is null then
    perform create_notification(postrow.author_id, 'comment', uid, p_post_id, p_id, 'comment:' || p_id);
  else
    perform create_notification(parent.author_id, 'reply', uid, p_post_id, p_id, 'reply:' || p_id);
    if postrow.author_id <> parent.author_id then
      perform create_notification(postrow.author_id, 'comment', uid, p_post_id, p_id, 'comment:' || p_id);
    end if;
  end if;

  select * into res from comments where id = p_id;
  return res;
end;
$$;

-- Penerima hanya melihat notifikasinya sendiri; yang berasal dari akun yang kemudian diblokir disembunyikan.
drop policy notifications_own_read on notifications;
create policy notifications_own_read on notifications for select to authenticated using (
  user_id = auth.uid() and (actor_id is null or not is_blocked_between(auth.uid(), actor_id))
);

create index on notifications (user_id, created_at desc) where read_at is null;
