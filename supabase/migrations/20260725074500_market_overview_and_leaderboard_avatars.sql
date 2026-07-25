-- Collapses the market page's three queries into one server-aggregated call, and adds
-- avatar_url to the leaderboard.
--
-- Market.jsx pulled 2 days of raw price_ticks (~9,600 rows / 516 kB) and Ticker.jsx
-- pulled 1 day of the same table again (~4,800 rows / 258 kB), every 60 seconds, then
-- did the grouping, day-change and fair-value maths in JavaScript. That is ~774 kB per
-- poll per user for a page that renders roughly 50 rows. This returns exactly what the
-- UI draws: latest price, day change, fair-value gap and a 40-point sparkline. 24 kB.

create or replace function public.market_overview()
returns json
language sql
stable
security definer
set search_path to 'public'
as $function$
  with latest_metrics as (
    select distinct on (artist_id) artist_id, popularity, followers
      from metric_snapshots
     order by artist_id, captured_at desc
  ),
  day_bounds as (
    select artist_id,
           (array_agg(price order by ts asc))[1]  as open_price,
           (array_agg(price order by ts desc))[1] as close_price
      from price_ticks
     where ts >= date_trunc('day', now())
     group by artist_id
  ),
  any_latest as (
    select distinct on (artist_id) artist_id, price
      from price_ticks
     order by artist_id, ts desc
  ),
  spark as (
    select artist_id, array_agg(price order by ts asc) as points
      from (
        select artist_id, ts, price,
               row_number() over (partition by artist_id order by ts desc) as rn
          from price_ticks
         where ts >= now() - interval '2 days'
      ) recent
     where rn <= 40
     group by artist_id
  )
  select coalesce(json_agg(row_to_json(r) order by r.name), '[]'::json)
    from (
      select a.id,
             a.name,
             a.genre,
             a.image_url,
             a.symbol,
             a.metrics_verified,
             round(coalesce(d.close_price, al.price), 4) as latest,
             case
               when d.open_price is not null and d.open_price > 0
                 then round((((coalesce(d.close_price, al.price) - d.open_price) / d.open_price) * 100)::numeric, 4)
               else 0
             end as pct,
             case
               when lm.artist_id is not null and coalesce(d.close_price, al.price) > 0 then
                 round(
                   ((( 1 + (lm.popularity / 100.0) * 49
                         + least(sqrt(greatest(lm.followers, 0)) / 100.0, 25)
                     ) - coalesce(d.close_price, al.price))
                    / coalesce(d.close_price, al.price) * 100)::numeric, 4)
               else null
             end as gap,
             coalesce(s.points, array[]::numeric[]) as spark
        from artists a
        left join day_bounds     d  on d.artist_id  = a.id
        left join any_latest     al on al.artist_id = a.id
        left join latest_metrics lm on lm.artist_id = a.id
        left join spark          s  on s.artist_id  = a.id
       where a.is_active
         and coalesce(d.close_price, al.price) is not null
    ) r;
$function$;

grant execute on function public.market_overview() to anon, authenticated;


-- profiles.avatar_url is populated for OAuth signups but was never surfaced anywhere.
-- The column is already world-readable via the "public read profiles" policy, so this
-- exposes nothing new. Return type changes, so DROP + CREATE rather than CREATE OR
-- REPLACE; both run in one transaction, so the function is never missing to a caller.

drop function if exists public.get_leaderboard(bigint);

create function public.get_leaderboard(p_season_id bigint default null::bigint)
returns table(username text, portfolio_value numeric, rank bigint, avatar_url text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with season as (
    select coalesce(p_season_id, (
      select id from seasons where now() between starts_at and ends_at
       order by starts_at desc limit 1
    )) as id
  ),
  vals as (
    select p.username,
           p.avatar_url,
           sa.cash + coalesce(sum(h.shares * lp.price), 0) as portfolio_value
      from season_accounts sa
      join season s on sa.season_id = s.id
      join profiles p on p.id = sa.user_id
      left join holdings h
        on h.user_id = sa.user_id and h.season_id = sa.season_id and h.shares > 0
      left join lateral (
        select price from price_ticks pt
         where pt.artist_id = h.artist_id order by ts desc limit 1
      ) lp on true
     group by p.username, p.avatar_url, sa.cash
  )
  select username,
         round(portfolio_value, 2),
         rank() over (order by portfolio_value desc),
         avatar_url
    from vals
   order by portfolio_value desc
   limit 100;
$function$;

grant execute on function public.get_leaderboard(bigint) to anon, authenticated;
