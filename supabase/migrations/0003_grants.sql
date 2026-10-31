-- Explicit table privileges. RLS policies decide which rows are visible; these grants let the roles touch the tables at all.
-- Logged-in photographers use `authenticated`; server routes that act for clients use `service_role`. `anon` gets nothing.

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;
