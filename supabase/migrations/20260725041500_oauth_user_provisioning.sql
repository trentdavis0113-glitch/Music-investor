-- OAuth-aware user provisioning.
--
-- Google (and any other OAuth) signups never pass through the signup Edge Function, so
-- raw_user_meta_data has no `username` key. The earlier version fell straight through to
-- trader_<uuid8>, meaning every Google user landed with a machine name they never chose.
-- Google supplies: name, full_name, email, picture, avatar_url, email_verified.
--
-- Each candidate is sanitized BEFORE being chosen, and the first that survives with >= 3
-- characters wins. Sanitizing after choosing was wrong: a display name in a non-Latin
-- script (e.g. "李雷") is non-empty, so it won the selection, then sanitized to nothing —
-- making the email fallback unreachable and handing that user trader_<uuid8> even though
-- their email local part was perfectly usable.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_cands  text[];
  c        text;
  v_base   text;
  v_name   text;
  v_avatar text;
  v_season bigint;
  v_done   boolean := false;
  i        int;
begin
  -- Preference order: explicitly chosen username (email signup), OAuth display name,
  -- then the local part of the email address.
  v_cands := array[
    coalesce(new.raw_user_meta_data->>'username', ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  ];

  -- Spaces and punctuation are dropped so usernames stay URL-safe: they appear in
  -- /trader/:username and in ?ref= invite links. "Trent Davis" becomes "TrentDavis".
  foreach c in array v_cands loop
    c := nullif(trim(regexp_replace(c, '[^a-zA-Z0-9_.-]', '', 'g')), '');
    if c is not null and char_length(c) >= 3 then
      v_base := left(c, 24);
      exit;
    end if;
  end loop;

  if v_base is null then
    v_base := 'trader_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

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
      if exists (select 1 from public.profiles where id = new.id) then
        v_done := true;
        exit;
      end if;
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

  -- Keep the OAuth profile picture if one was supplied.
  begin
    v_avatar := coalesce(
      nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
      nullif(trim(new.raw_user_meta_data->>'picture'), '')
    );
    if v_avatar is not null then
      update public.profiles set avatar_url = v_avatar where id = new.id;
    end if;
  exception when others then null;
  end;

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
  exception when others then null;
  end;

  return new;
end $function$;
