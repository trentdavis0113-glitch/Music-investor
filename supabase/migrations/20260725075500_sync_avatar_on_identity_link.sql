-- handle_new_user() captures the OAuth picture, but it is an AFTER INSERT trigger on
-- auth.users — so it only fires for a brand-new account. When Google is linked to an
-- account that already exists (matching verified email), no user row is inserted and the
-- picture sits unused in auth.identities.identity_data while profiles.avatar_url stays
-- null. The leaderboard avatar then has nothing to show.
--
-- This mirrors the same capture onto identity creation, which covers linking.

create or replace function public.sync_identity_avatar()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_avatar text;
begin
  v_avatar := coalesce(
    nullif(trim(new.identity_data->>'avatar_url'), ''),
    nullif(trim(new.identity_data->>'picture'), '')
  );
  if v_avatar is not null then
    update public.profiles
       set avatar_url = v_avatar
     where id = new.user_id
       and avatar_url is distinct from v_avatar;
  end if;
  return new;
exception when others then
  -- Identity rows are written during sign-in. An avatar problem must never block a login.
  return new;
end $function$;

drop trigger if exists on_identity_created on auth.identities;
create trigger on_identity_created
  after insert on auth.identities
  for each row execute function public.sync_identity_avatar();

-- Backfill anyone who already linked before this existed.
update public.profiles p
   set avatar_url = src.avatar
  from (
    select i.user_id,
           coalesce(nullif(trim(i.identity_data->>'avatar_url'), ''),
                    nullif(trim(i.identity_data->>'picture'), '')) as avatar
      from auth.identities i
     where coalesce(nullif(trim(i.identity_data->>'avatar_url'), ''),
                    nullif(trim(i.identity_data->>'picture'), '')) is not null
  ) src
 where p.id = src.user_id
   and p.avatar_url is null;
