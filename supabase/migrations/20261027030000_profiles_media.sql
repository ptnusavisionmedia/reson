-- T06: avatar (Storage), edit profil lewat RPC tervalidasi, dan preferensi notifikasi privat.

-- Bucket avatar bersifat publik (keputusan v1): URL gambar dapat dibuka tanpa login bila
-- diketahui. Batas ukuran/tipe ditegakkan oleh bucket, bukan hanya klien.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Tulis/hapus hanya di folder milik sendiri: avatars/{uid}/{fileId}
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Edit profil hanya lewat RPC agar avatar_path tidak bisa menunjuk berkas milik orang lain.
drop policy profiles_update_own on profiles;
revoke update (display_name, bio, avatar_path) on profiles from authenticated;

create function update_my_profile(p_display_name text, p_bio text, p_avatar_path text)
returns profiles
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  dn text := trim(coalesce(p_display_name, ''));
  res profiles;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if char_length(dn) not between 1 and 50 then raise exception 'invalid display name' using errcode = '22023'; end if;
  if char_length(coalesce(p_bio, '')) > 300 then raise exception 'bio too long' using errcode = '22023'; end if;
  if p_avatar_path is not null and (
    split_part(p_avatar_path, '/', 1) <> uid::text
    or not exists (select 1 from storage.objects where bucket_id = 'avatars' and name = p_avatar_path)
  ) then
    raise exception 'invalid avatar' using errcode = '22023';
  end if;

  update profiles
     set display_name = dn, bio = coalesce(p_bio, ''), avatar_path = p_avatar_path, updated_at = now()
   where id = uid and status = 'active'
  returning * into res;
  if not found then raise exception 'account not active' using errcode = '42501'; end if;
  return res;
end;
$$;

create function update_notification_preferences(p_prefs jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_prefs is null or jsonb_typeof(p_prefs) <> 'object' or exists (
    select 1 from jsonb_each(p_prefs) e
    where e.key not in ('follow', 'comment', 'reply') or jsonb_typeof(e.value) <> 'boolean'
  ) then
    raise exception 'invalid preferences' using errcode = '22023';
  end if;
  update accounts set notification_preferences = p_prefs where id = uid;
end;
$$;

revoke execute on function update_my_profile(text, text, text) from public, anon;
revoke execute on function update_notification_preferences(jsonb) from public, anon;
grant execute on function update_my_profile(text, text, text) to authenticated;
grant execute on function update_notification_preferences(jsonb) to authenticated;
