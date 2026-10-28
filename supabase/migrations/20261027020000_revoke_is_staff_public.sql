-- is_staff dibuat tanpa REVOKE dari PUBLIC, jadi pencabutan dari anon belum berefek.
revoke execute on function is_staff() from public, anon;
grant execute on function is_staff() to authenticated;
