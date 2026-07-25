-- Signup smoke test. Run against the project with a service-role connection
-- (Supabase SQL editor, or `supabase db execute`). It creates two throwaway users,
-- asserts provisioning and permissions, and cleans up after itself.
--
-- Every statement below was executed against the live project on 2026-07-25 and passed.
-- Section D removes everything it created; if you interrupt the script, run section D alone.

------------------------------------------------------------------ A. provisioning
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('bbbbbbbb-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
  'zz_beta1@example.invalid','x',now(),now(),now(),'{}'::jsonb,'{"username":"BetaTester"}'::jsonb),
 ('bbbbbbbb-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated',
  'zz_beta2@example.invalid','x',now(),now(),now(),'{}'::jsonb,'{"username":"BetaTester"}'::jsonb);

-- EXPECT: profiles=1 and accounts=1 for each, cash=10000.00, correct_season=true,
--         and the second user renamed to BetaTester_1 (not silently trader_xxxxxxxx).
select u.email, p.username,
       (select count(*) from public.profiles       x where x.id = u.id)       as profiles,
       (select count(*) from public.season_accounts s where s.user_id = u.id) as accounts,
       (select s.cash from public.season_accounts s where s.user_id = u.id)   as cash,
       (select s.season_id = (select id from public.seasons
                              where now() between starts_at and ends_at
                              order by starts_at desc limit 1)
          from public.season_accounts s where s.user_id = u.id)               as correct_season
  from auth.users u
  left join public.profiles p on p.id = u.id
 where u.email like 'zz_beta%' order by u.email;

------------------------------------------------------------------ B. must be blocked
-- EXPECT every row BLOCKED.
create temp table sec(test text, outcome text) on commit drop;
do $$
declare v_uid uuid := 'bbbbbbbb-0000-4000-8000-000000000001';
        v_other uuid := 'bbbbbbbb-0000-4000-8000-000000000002'; n int;
begin
  begin set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub',v_uid,'role','authenticated')::text, true);
    update public.profiles set is_admin = true where id = v_uid;
    get diagnostics n = row_count; reset role;
    insert into sec values ('1 self_promote_is_admin','ALLOWED rows='||n);
  exception when others then reset role;
    insert into sec values ('1 self_promote_is_admin','BLOCKED: '||left(sqlerrm,70)); end;

  begin set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub',v_uid,'role','authenticated')::text, true);
    update public.profiles set username = 'hijacked' where id = v_other;
    get diagnostics n = row_count; reset role;
    insert into sec values ('2 edit_other_profile', case when n=0 then 'BLOCKED rows=0' else 'ALLOWED rows='||n end);
  exception when others then reset role;
    insert into sec values ('2 edit_other_profile','BLOCKED: '||left(sqlerrm,70)); end;

  begin set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub',v_uid,'role','authenticated')::text, true);
    update public.season_accounts set cash = 999999 where user_id = v_uid;
    get diagnostics n = row_count; reset role;
    insert into sec values ('3 credit_own_cash', case when n=0 then 'BLOCKED rows=0' else 'ALLOWED rows='||n end);
  exception when others then reset role;
    insert into sec values ('3 credit_own_cash','BLOCKED: '||left(sqlerrm,70)); end;

  begin set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub',v_uid,'role','authenticated')::text, true);
    insert into public.season_accounts (user_id, season_id, cash)
      select v_uid, id, 50000 from public.seasons order by starts_at desc limit 1;
    reset role; insert into sec values ('4 duplicate_season_account','ALLOWED');
  exception when others then reset role;
    insert into sec values ('4 duplicate_season_account','BLOCKED: '||left(sqlerrm,70)); end;

  begin set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub',v_uid,'role','authenticated')::text, true);
    perform public.admin_stats(); reset role;
    insert into sec values ('5 call_admin_stats','ALLOWED');
  exception when others then reset role;
    insert into sec values ('5 call_admin_stats','BLOCKED: '||left(sqlerrm,70)); end;
end $$;
select * from sec order by test;

------------------------------------------------------------------ C. must still work
-- EXPECT every row OK: rename, is_public toggle, idempotent ensure_account, a real trade.
create temp table pos(step text, outcome text) on commit drop;
do $$
declare v_uid uuid := 'bbbbbbbb-0000-4000-8000-000000000001';
        v_artist bigint; n int; r json; c numeric; sh numeric;
begin
  select a.id into v_artist from public.artists a
   where a.is_active and exists (select 1 from public.price_ticks t where t.artist_id=a.id)
   order by a.id limit 1;

  begin set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub',v_uid,'role','authenticated')::text, true);
    update public.profiles set username='BetaRenamed' where id=v_uid;
    get diagnostics n = row_count; reset role;
    insert into pos values ('rename own username', case when n=1 then 'OK' else 'FAILED' end);
  exception when others then reset role; insert into pos values ('rename own username','FAILED: '||left(sqlerrm,60)); end;

  begin set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub',v_uid,'role','authenticated')::text, true);
    update public.profiles set is_public=true where id=v_uid;
    get diagnostics n = row_count; reset role;
    insert into pos values ('toggle is_public', case when n=1 then 'OK' else 'FAILED' end);
  exception when others then reset role; insert into pos values ('toggle is_public','FAILED: '||left(sqlerrm,60)); end;

  begin set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub',v_uid,'role','authenticated')::text, true);
    r := public.ensure_account(); r := public.ensure_account(); reset role;
    select count(*) into n from public.season_accounts where user_id=v_uid;
    insert into pos values ('ensure_account x2 idempotent', case when n=1 then 'OK accounts=1' else 'FAILED accounts='||n end);
  exception when others then reset role; insert into pos values ('ensure_account x2 idempotent','FAILED: '||left(sqlerrm,60)); end;

  begin set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('sub',v_uid,'role','authenticated')::text, true);
    r := public.execute_trade(v_artist,'buy',5); reset role;
    select cash into c from public.season_accounts where user_id=v_uid;
    select shares into sh from public.holdings where user_id=v_uid and artist_id=v_artist;
    insert into pos values ('execute_trade buy 5','OK shares='||coalesce(sh,0)||' cash='||round(c,2));
  exception when others then reset role; insert into pos values ('execute_trade buy 5','FAILED: '||left(sqlerrm,60)); end;
end $$;
select * from pos;

------------------------------------------------------------------ D. cleanup
with victims as (select id from auth.users where email like 'zz_beta%')
, d1 as (delete from public.transactions        where user_id in (select id from victims) returning 1)
, d2 as (delete from public.holdings            where user_id in (select id from victims) returning 1)
, d3 as (delete from public.portfolio_snapshots where user_id in (select id from victims) returning 1)
, d4 as (delete from public.watchlists          where user_id in (select id from victims) returning 1)
, d5 as (delete from public.predictions         where user_id in (select id from victims) returning 1)
, d6 as (delete from public.artist_requests     where user_id in (select id from victims) returning 1)
, d7 as (delete from public.season_accounts     where user_id in (select id from victims) returning 1)
, d8 as (delete from public.profiles            where id      in (select id from victims) returning 1)
select (select count(*) from d7) accounts_removed, (select count(*) from d8) profiles_removed;

delete from auth.users where email like 'zz_beta%';

-- EXPECT leftover_users = 0
select count(*) as leftover_users from auth.users where email like 'zz_beta%';
