-- Server-side enforcement: only allow @concentrix.com signups.
-- Run once in Supabase SQL Editor. Backstop for the client-side check.
-- (To change the allowed domain, edit the '%@concentrix.com' pattern below.)

create or replace function public.enforce_allowed_email_domain()
returns trigger
language plpgsql
as $$
begin
  if new.email is null or lower(new.email) not like '%@concentrix.com' then
    raise exception 'signup_not_allowed: only @concentrix.com emails are permitted';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_allowed_email_domain on auth.users;
create trigger enforce_allowed_email_domain
  before insert on auth.users
  for each row execute function public.enforce_allowed_email_domain();
