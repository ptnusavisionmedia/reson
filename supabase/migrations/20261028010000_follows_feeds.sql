-- T10: follow/unfollow idempoten dan sumber feed (Untukmu, Mengikuti).

-- Ikuti. Penghitung kedua akun hanya berubah bila baris follow benar-benar baru. Kedua baris
-- profil diperbarui dalam SATU pernyataan UPDATE agar dua akun yang saling mengikuti pada saat
-- bersamaan mengunci baris dalam urutan yang sama (tanpa deadlock).
create function follow_user(p_user_id uuid) returns int
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

create function unfollow_user(p_user_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  n int;
  cnt int;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from profiles where id = p_user_id) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  delete from follows where follower_id = uid and following_id = p_user_id;
  get diagnostics n = row_count;
  if n > 0 then
    update profiles set
      follower_count = greatest(follower_count - case when id = p_user_id then 1 else 0 end, 0),
      following_count = greatest(following_count - case when id = uid then 1 else 0 end, 0)
    where id in (uid, p_user_id);
  end if;
  select follower_count into cnt from profiles where id = p_user_id;
  return cnt;
end;
$$;

-- Sumber feed. SECURITY INVOKER (default): RLS tetap berlaku, jadi hanya post published yang
-- terbaca. Pengurutan, kursor (created_at, id), dan batas halaman diterapkan klien pada hasilnya.
create function feed_for_you() returns setof posts
language sql stable set search_path = public as $$
  select p.* from posts p
  where p.status = 'published'
    and exists (select 1 from community_members m where m.community_id = p.community_id and m.user_id = auth.uid());
$$;

create function feed_following() returns setof posts
language sql stable set search_path = public as $$
  select p.* from posts p
  where p.status = 'published'
    and exists (select 1 from follows f where f.following_id = p.author_id and f.follower_id = auth.uid());
$$;

revoke execute on function follow_user(uuid) from public, anon;
revoke execute on function unfollow_user(uuid) from public, anon;
revoke execute on function feed_for_you() from public, anon;
revoke execute on function feed_following() from public, anon;
grant execute on function follow_user(uuid) to authenticated;
grant execute on function unfollow_user(uuid) to authenticated;
grant execute on function feed_for_you() to authenticated;
grant execute on function feed_following() to authenticated;
