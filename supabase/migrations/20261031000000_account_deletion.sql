-- T15: penghapusan akun. Idempoten, bertahap, dan dapat dilanjutkan.
--
-- Alur: klien login ulang -> request_account_deletion (status 'deleting', menghentikan semua
-- aksi tulis karena RPC mensyaratkan 'active') -> klien menghapus foto di Storage (Storage tidak
-- bisa dibersihkan dari SQL tanpa meninggalkan berkas yatim) -> process_account_deletion dipanggil
-- berulang sampai 'done' (tiap panggilan berbatas) -> finalize_account_deletion menghapus akun Auth.
-- Bila terputus di tengah, akun tetap 'deleting' dan app menawarkan "Lanjutkan penghapusan".

-- Catatan proses. Sengaja TANPA foreign key agar baris ini bertahan setelah akun dihapus; isinya
-- hanya UID, status, dan waktu.
create table deletion_jobs (
  user_id uuid primary key,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed')),
  stage text not null default 'start',
  attempts int not null default 0,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table deletion_jobs enable row level security;
create policy deletion_jobs_own_read on deletion_jobs for select to authenticated using (user_id = auth.uid());
revoke all on deletion_jobs from anon, authenticated;
grant select on deletion_jobs to authenticated;

-- Komentar utama yang masih punya balasan orang lain dipertahankan sebagai tombstone tanpa isi dan
-- tanpa identitas (author_id menjadi null saat profil dihapus). Laporan moderasi dipertahankan tanpa
-- identitas pelapor sebagai catatan moderasi.
alter table comments alter column author_id drop not null;
alter table comments drop constraint comments_author_id_fkey;
alter table comments add constraint comments_author_id_fkey foreign key (author_id) references profiles (id) on delete set null;

alter table reports alter column reporter_id drop not null;
alter table reports drop constraint reports_reporter_id_fkey;
alter table reports add constraint reports_reporter_id_fkey foreign key (reporter_id) references profiles (id) on delete set null;

-- Masih ada data milik akun yang belum dibersihkan? Komentar milik akun yang sudah menjadi tombstone
-- dan masih punya balasan aktif orang lain sengaja tidak dihitung.
create function account_cleanup_pending(p_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from post_likes where user_id = p_uid)
      or exists (select 1 from follows where follower_id = p_uid or following_id = p_uid)
      or exists (select 1 from community_members where user_id = p_uid)
      or exists (select 1 from saved_posts where user_id = p_uid)
      or exists (select 1 from device_lists where user_id = p_uid)
      or exists (select 1 from blocks where blocker_id = p_uid or blocked_id = p_uid)
      or exists (select 1 from match_results where user_id = p_uid or candidate_id = p_uid)
      or exists (select 1 from notifications where user_id = p_uid)
      or exists (select 1 from device_suggestions where submitted_by = p_uid)
      or exists (select 1 from posts where author_id = p_uid)
      or exists (
        select 1 from comments c
        where c.author_id = p_uid
          and (c.status <> 'deleted' or c.body <> ''
               or not exists (select 1 from comments r where r.parent_comment_id = c.id and r.status = 'published' and r.author_id is distinct from p_uid))
      );
$$;

-- Satu langkah berbatas (maks 500 baris per jenis data). Mengembalikan 'continue' bila mungkin masih
-- ada sisa, 'done' bila bersih. Setiap langkah idempoten: aman diulang setelah gagal di tengah jalan.
create function deletion_step(p_uid uuid) returns text
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  -- Like milik akun: hapus dan koreksi penghitung post.
  with d as (delete from post_likes where ctid in (select ctid from post_likes where user_id = p_uid limit 500) returning post_id),
       c as (select post_id, count(*) as cnt from d group by post_id)
  update posts set like_count = greatest(like_count - c.cnt, 0) from c where posts.id = c.post_id;
  get diagnostics n = row_count;
  if n > 0 then return 'continue'; end if;

  -- Follow di kedua arah: hapus dan koreksi penghitung pihak lain.
  with d as (delete from follows where ctid in (select ctid from follows where follower_id = p_uid or following_id = p_uid limit 500)
             returning follower_id, following_id)
  update profiles p set
    follower_count = greatest(p.follower_count - (select count(*) from d where d.following_id = p.id), 0),
    following_count = greatest(p.following_count - (select count(*) from d where d.follower_id = p.id), 0)
  where p.id in (select follower_id from d union select following_id from d);
  get diagnostics n = row_count;
  if n > 0 then return 'continue'; end if;

  -- Keanggotaan komunitas: hapus dan koreksi memberCount.
  with d as (delete from community_members where ctid in (select ctid from community_members where user_id = p_uid limit 500) returning community_id),
       c as (select community_id, count(*) as cnt from d group by community_id)
  update communities set member_count = greatest(member_count - c.cnt, 0) from c where communities.id = c.community_id;
  get diagnostics n = row_count;
  if n > 0 then return 'continue'; end if;

  delete from saved_posts where ctid in (select ctid from saved_posts where user_id = p_uid limit 500);
  get diagnostics n = row_count; if n > 0 then return 'continue'; end if;
  delete from device_lists where ctid in (select ctid from device_lists where user_id = p_uid limit 500);
  get diagnostics n = row_count; if n > 0 then return 'continue'; end if;
  delete from blocks where ctid in (select ctid from blocks where blocker_id = p_uid or blocked_id = p_uid limit 500);
  get diagnostics n = row_count; if n > 0 then return 'continue'; end if;
  delete from match_results where ctid in (select ctid from match_results where user_id = p_uid or candidate_id = p_uid limit 500);
  get diagnostics n = row_count; if n > 0 then return 'continue'; end if;
  delete from notifications where ctid in (select ctid from notifications where user_id = p_uid limit 500);
  get diagnostics n = row_count; if n > 0 then return 'continue'; end if;
  delete from device_suggestions where ctid in (select ctid from device_suggestions where submitted_by = p_uid limit 500);
  get diagnostics n = row_count; if n > 0 then return 'continue'; end if;

  -- Komentar milik akun: kosongkan isi lebih dulu (konten dihapus), lalu hitung ulang statistik post.
  update comments set status = 'deleted', body = '', updated_at = now()
   where id in (select id from comments where author_id = p_uid and (status <> 'deleted' or body <> '') limit 500);
  get diagnostics n = row_count;
  if n > 0 then
    perform refresh_post_comment_stats(s.pid) from (select distinct post_id as pid from comments where author_id = p_uid) s;
    return 'continue';
  end if;
  -- Hapus yang tidak punya balasan aktif orang lain; sisanya tetap sebagai tombstone tanpa isi.
  delete from comments where id in (
    select c.id from comments c
    where c.author_id = p_uid
      and not exists (select 1 from comments r where r.parent_comment_id = c.id and r.status = 'published' and r.author_id is distinct from p_uid)
    limit 500
  );
  get diagnostics n = row_count; if n > 0 then return 'continue'; end if;

  -- Post milik akun (komentar dan like pada post itu ikut terhapus). Lepas dari daftar sematan dulu.
  update communities set pinned_post_ids = array(select x from unnest(pinned_post_ids) x where x not in (select id from posts where author_id = p_uid))
   where pinned_post_ids && array(select id from posts where author_id = p_uid);
  delete from posts where id in (select id from posts where author_id = p_uid limit 100);
  get diagnostics n = row_count; if n > 0 then return 'continue'; end if;

  return 'done';
end;
$$;

-- Finalisasi: hapus akun Auth. Profil, akun, dan Sound Profile ikut terhapus lewat ON DELETE CASCADE.
create function finalize_deletion_core(p_uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if account_cleanup_pending(p_uid) then raise exception 'cleanup incomplete' using errcode = '55000'; end if;
  delete from auth.users where id = p_uid;
  update deletion_jobs set status = 'completed', stage = 'done', completed_at = now() where user_id = p_uid;
end;
$$;

create function request_account_deletion() returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  st account_status;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select status into st from profiles where id = uid;
  if not found then raise exception 'account not found' using errcode = 'P0002'; end if;
  if st = 'deleting' then return; end if; -- sudah berjalan: idempoten (dipakai saat melanjutkan)

  -- Login ulang: sesi Auth harus dibuat dalam 5 menit terakhir. Token yang sekadar diperbarui
  -- tidak cukup; pengguna harus memasukkan password lagi (membuat sesi baru).
  if not exists (
    select 1 from auth.sessions
    where id = nullif(auth.jwt() ->> 'session_id', '')::uuid and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'reauth required' using errcode = '42501';
  end if;

  update profiles set status = 'deleting', updated_at = now() where id = uid;
  insert into deletion_jobs (user_id) values (uid) on conflict (user_id) do nothing;
end;
$$;

create function process_account_deletion() returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  result text;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from profiles where id = uid and status = 'deleting') then
    raise exception 'not deleting' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 15)); -- satu proses per akun
  update deletion_jobs set status = 'running', attempts = attempts + 1 where user_id = uid;
  result := deletion_step(uid);
  if result = 'done' then update deletion_jobs set stage = 'data_done' where user_id = uid; end if;
  return result;
end;
$$;

create function finalize_account_deletion() returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from profiles where id = uid and status = 'deleting') then
    raise exception 'not deleting' using errcode = '42501';
  end if;
  perform finalize_deletion_core(uid);
end;
$$;

-- Untuk permintaan yang masuk lewat email/web (lihat docs/account-deletion.md). Hanya bisa dijalankan
-- dari SQL Editor dashboard (peran postgres); tidak diberikan ke peran klien mana pun. Foto di Storage
-- dibersihkan terpisah lewat dashboard Storage karena tidak bisa dihapus dari SQL.
create function admin_delete_account(p_uid uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  i int := 0;
  r text;
begin
  if not exists (select 1 from profiles where id = p_uid) then raise exception 'account not found'; end if;
  update profiles set status = 'deleting', updated_at = now() where id = p_uid;
  insert into deletion_jobs (user_id) values (p_uid) on conflict (user_id) do nothing;
  loop
    r := deletion_step(p_uid);
    exit when r = 'done';
    i := i + 1;
    if i > 1000 then raise exception 'terlalu banyak iterasi'; end if;
  end loop;
  perform finalize_deletion_core(p_uid);
  return 'selesai';
end;
$$;

revoke execute on function account_cleanup_pending(uuid) from public, anon, authenticated;
revoke execute on function deletion_step(uuid) from public, anon, authenticated;
revoke execute on function finalize_deletion_core(uuid) from public, anon, authenticated;
revoke execute on function admin_delete_account(uuid) from public, anon, authenticated;
revoke execute on function request_account_deletion() from public, anon;
revoke execute on function process_account_deletion() from public, anon;
revoke execute on function finalize_account_deletion() from public, anon;
grant execute on function request_account_deletion() to authenticated;
grant execute on function process_account_deletion() to authenticated;
grant execute on function finalize_account_deletion() to authenticated;
