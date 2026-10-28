-- T07: komunitas awal, gabung/keluar idempoten, dan post yang disematkan.

alter table communities
  add column pinned_post_ids uuid[] not null default '{}' check (cardinality(pinned_post_ids) <= 3);

-- Helper untuk semua RPC aksi sosial: verifikasi email wajib (PRD §4.2, §6.1).
create function is_email_verified() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select email_confirmed_at is not null from auth.users where id = auth.uid()), false);
$$;

-- Gabung idempoten: memanggil dua kali (atau bersamaan) hanya menambah memberCount sekali,
-- karena penghitung hanya naik bila baris keanggotaan benar-benar baru disisipkan.
create function join_community(p_community_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  inserted int;
  cnt int;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not is_email_verified() then raise exception 'email not verified' using errcode = '42501'; end if;
  if not exists (select 1 from profiles where id = uid and status = 'active') then
    raise exception 'account not active' using errcode = '42501';
  end if;
  if not exists (select 1 from communities where id = p_community_id and status = 'active') then
    raise exception 'community not found' using errcode = 'P0002';
  end if;

  insert into community_members (community_id, user_id) values (p_community_id, uid)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 then
    update communities set member_count = member_count + 1 where id = p_community_id;
  end if;
  select member_count into cnt from communities where id = p_community_id;
  return cnt;
end;
$$;

create function leave_community(p_community_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  removed int;
  cnt int;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from communities where id = p_community_id) then
    raise exception 'community not found' using errcode = 'P0002';
  end if;

  delete from community_members where community_id = p_community_id and user_id = uid;
  get diagnostics removed = row_count;
  if removed > 0 then
    update communities set member_count = greatest(member_count - 1, 0) where id = p_community_id;
  end if;
  select member_count into cnt from communities where id = p_community_id;
  return cnt;
end;
$$;

revoke execute on function is_email_verified() from public, anon;
revoke execute on function join_community(uuid) from public, anon;
revoke execute on function leave_community(uuid) from public, anon;
grant execute on function is_email_verified() to authenticated;
grant execute on function join_community(uuid) to authenticated;
grant execute on function leave_community(uuid) to authenticated;

-- Enam komunitas awal (data produk, bukan data demo). Aman dijalankan ulang.
insert into communities (slug, name, description, rules) values
  ('iem-earbuds', 'IEM & Earbuds', 'Diskusi in-ear monitor dan earbuds: kesan suara, kenyamanan, dan rekomendasi.',
    array['Hormati sesama anggota.', 'Sebutkan perangkat, sumber, dan konteks saat menceritakan kesan suara.', 'Kesan suara bersifat subjektif; hindari menyebutnya fakta.']),
  ('headphone-corner', 'Headphone Corner', 'Tempat membahas headphone over-ear dan on-ear, dari santai sampai serius.',
    array['Hormati sesama anggota.', 'Sebutkan perangkat, sumber, dan konteks saat menceritakan kesan suara.', 'Kesan suara bersifat subjektif; hindari menyebutnya fakta.']),
  ('portable-audio', 'Portable Audio', 'DAP, dongle DAC, dan perangkat audio portabel untuk dibawa bepergian.',
    array['Hormati sesama anggota.', 'Sebutkan perangkat dan konteks pemakaian saat bertanya atau bercerita.', 'Tidak ada promosi tanpa izin moderator.']),
  ('desk-setup', 'Desk Setup', 'Bagikan dan lihat setup audio di meja: dari yang sederhana sampai yang lengkap.',
    array['Hormati sesama anggota.', 'Cantumkan komponen setup dan alasan memilihnya.', 'Tidak ada promosi tanpa izin moderator.']),
  ('music-discovery', 'Music Discovery', 'Temukan musik baru dan bagikan lagu yang layak didengar.',
    array['Hormati sesama anggota.', 'Bagikan tautan lagu, bukan berkasnya.', 'Beri sedikit konteks mengapa lagu itu layak didengar.']),
  ('audio-pemula', 'Audio Pemula', 'Baru mengenal audio? Tanyakan apa saja di sini, tanpa takut pertanyaannya terlalu dasar.',
    array['Hormati sesama anggota.', 'Tidak ada pertanyaan yang terlalu dasar.', 'Jelaskan dengan bahasa sederhana.'])
on conflict (slug) do nothing;
