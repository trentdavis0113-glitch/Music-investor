-- Signup reliability: make new-user provisioning race-safe, non-failing, and complete.
--
-- Previously handle_new_user() could (a) silently discard the requested username and
-- substitute trader_<uuid8> with no way for the client to learn about it, and (b) hard-fail
-- the whole auth.users INSERT if its fallback insert also violated a constraint, because
-- that second insert sat outside the exception block. It also never provisioned the
-- season_accounts row, leaving the starting bankroll to a lazy ensure_account() call made
-- only from Portfolio/Artist.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_base   text;
  v_name   text;
  v_season bigint;
  v_done   boolean := false;
  i        int;
begin
  -- Sanitize the requested name. Spaces are dropped so usernames stay URL-safe:
  -- they appear in /trader/:username and in ?ref= invite links.
  v_base := nullif(trim(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', ''), '[^a-zA-Z0-9_.-]', '', 'g')), '');
  if v_base is null or char_length(v_base) < 3 then
    v_base := 'trader_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  v_base := left(v_base, 24);

  -- Claim a username. Each attempt is a real INSERT rather than a check-then-insert,
  -- so two concurrent signups racing for the same name resolve correctly.
  for i in 0..60 loop
    begin
      if i = 0 then
        v_name := v_base;
      else
        v_name := left(v_base, 24 - (char_length(i::text) + 1)) || '_' || i::text;
      end if;
      insert into public.profiles (id, username) values (new.id, v_name);
      v_done := true;
      exit;
    exception when unique_violation then
      -- Conflict on id means the profile already exists (replay); nothing left to do.
      if exists (select 1 from public.profiles where id = new.id) then
        v_done := true;
        exit;
      end if;
      -- Otherwise the username is taken: fall through and try the next suffix.
    end;
  end loop;

  -- Last resort. Must never raise: this trigger is AFTER INSERT ON auth.users, so any
  -- exception escaping here aborts account creation entirely.
  if not v_done then
    begin
      insert into public.profiles (id, username)
      values (new.id, 'trader_' || substr(replace(new.id::text, '-', ''), 1, 12))
      on conflict (id) do nothing;
    exception when others then null;
    end;
  end if;

  -- Provision the starting bankroll up front so a new trader is fully usable no matter
  -- which page they land on first.
  begin
    select id into v_season from public.seasons
     where now() between starts_at and ends_at
     order by starts_at desc limit 1;
    if v_season is not null then
      insert into public.season_accounts (user_id, season_id, cash)
      select new.id, v_season, s.starting_bankroll
        from public.seasons s where s.id = v_season
      on conflict (user_id, season_id) do nothing;
    end if;
  exception when others then null;  -- never block signup on bankroll setup
  end;

  return new;
end $function$;


-- Lets the signup form tell a user their username is taken BEFORE they submit,
-- instead of silently renaming them afterwards. Exact-match so it agrees with the
-- actual unique constraint on profiles.username.
create or replace function public.username_available(p_username text)
returns boolean
language sql
security definer
set search_path to 'public'
stable
as $function$
  select char_length(btrim(coalesce(p_username, ''))) between 3 and 24
     and btrim(p_username) ~ '^[a-zA-Z0-9_.-]+$'
     and not exists (
       select 1 from public.profiles where username = btrim(p_username)
     );
$function$;

grant execute on function public.username_available(text) to anon, authenticated;


-- Backfill: any existing trader missing a season account for the active season.
insert into public.season_accounts (user_id, season_id, cash)
select p.id, s.id, s.starting_bankroll
  from public.profiles p
 cross join lateral (
   select id, starting_bankroll from public.seasons
    where now() between starts_at and ends_at
    order by starts_at desc limit 1
 ) s
on conflict (user_id, season_id) do nothing;
