-- T04: provisioning akun atomik, cek username, dan penanda onboarding.

-- Profil + akun dibuat dalam transaksi yang sama dengan auth.users. Jika username
-- bentrok atau tidak valid, signup ikut gagal, jadi tidak ada akun Auth tanpa profil.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  u text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  dn text := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), u), 50);
begin
  insert into profiles (id, username, display_name) values (new.id, u, dn);
  insert into accounts (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Cek ketersediaan untuk UX. Penjaga sebenarnya tetap UNIQUE pada profiles.username.
create function username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where username = lower(trim(p_username)));
$$;

create function complete_onboarding() returns void
language sql security definer set search_path = public as $$
  update accounts set onboarding_completed = true where id = auth.uid();
$$;

revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function username_available(text) from public;
revoke execute on function complete_onboarding() from public;
grant execute on function username_available(text) to anon, authenticated;
grant execute on function complete_onboarding() to authenticated;
