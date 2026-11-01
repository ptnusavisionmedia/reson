-- GA-02: provisioning akun Google (OAuth) yang kompatibel dengan APK lama.
--
-- Masalah: handle_new_user() mewajibkan metadata username. Login Google tidak membawanya,
-- sehingga signup pertama gagal di constraint profiles.username. Perbaikan:
--  * signup non-email tanpa username valid mendapat username sementara dari server,
--  * accounts.profile_completed menandai profil yang belum difinalisasi,
--  * is_email_verified() (gerbang semua RPC sosial) ikut mensyaratkan profil lengkap,
--  * finalize_profile() mengganti username sementara secara atomik, satu kali.
-- Akun email/password existing otomatis profile_completed = true (default kolom).

alter table accounts
  add column profile_completed boolean not null default true;

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  u text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  dn text;
  completed boolean := true;
begin
  -- Jalur email tetap ketat seperti sebelumnya: username buruk menggagalkan signup.
  if provider <> 'email' and u !~ '^[a-z0-9_]{3,24}$' then
    completed := false;
    loop
      u := 'user_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
      exit when not exists (select 1 from profiles where username = u);
    end loop;
  end if;

  dn := left(
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      case when provider <> 'email' then nullif(trim(new.raw_user_meta_data ->> 'full_name'), '') end,
      case when provider <> 'email' then nullif(trim(new.raw_user_meta_data ->> 'name'), '') end,
      u
    ),
    50
  );

  insert into profiles (id, username, display_name) values (new.id, u, dn);
  insert into accounts (id, profile_completed) values (new.id, completed);
  return new;
end;
$$;

-- Gerbang interaksi sosial: email terverifikasi DAN profil sudah difinalisasi.
-- Dilakukan di sini agar seluruh RPC sosial yang sudah ada langsung ikut terlindungi.
create or replace function is_email_verified() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select email_confirmed_at is not null from auth.users where id = auth.uid()), false)
     and coalesce((select profile_completed from accounts where id = auth.uid()), false);
$$;

-- Finalisasi profil akun OAuth: username final + nama tampilan, hanya sekali.
create function finalize_profile(p_username text, p_display_name text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  u text := lower(trim(coalesce(p_username, '')));
  dn text := left(trim(coalesce(p_display_name, '')), 50);
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from accounts where id = uid and profile_completed = false) then
    raise exception 'profile already completed' using errcode = '42501';
  end if;
  if u !~ '^[a-z0-9_]{3,24}$' then raise exception 'invalid username' using errcode = '22023'; end if;
  if dn = '' then raise exception 'invalid display name' using errcode = '22023'; end if;

  begin
    update profiles set username = u, display_name = dn, updated_at = now() where id = uid;
  exception when unique_violation then
    raise exception 'username taken' using errcode = '23505';
  end;
  update accounts set profile_completed = true where id = uid;
end;
$$;

revoke execute on function finalize_profile(text, text) from public, anon;
grant execute on function finalize_profile(text, text) to authenticated;
