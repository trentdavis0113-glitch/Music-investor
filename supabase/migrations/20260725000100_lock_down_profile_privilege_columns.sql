-- Privilege escalation fix.
--
-- The "update own profile" RLS policy has no WITH CHECK, so Postgres falls back to its
-- USING clause (auth.uid() = id). That restricts WHICH ROW a user may update but says
-- nothing about WHICH COLUMNS, and `authenticated` held UPDATE on every column. Any
-- signed-in user could therefore run:
--     update profiles set is_admin = true where id = <self>
-- and then call admin_add_artist / review_claim / set_artist_metrics / admin_stats,
-- all of which gate on profiles.is_admin.
--
-- RLS cannot express column restrictions, so this is enforced with column-level grants.

revoke update on public.profiles from anon, authenticated;

-- Only the fields a user legitimately controls from the Portfolio page.
grant update (username, is_public, avatar_url) on public.profiles to authenticated;

-- anon can never satisfy the RLS USING clause (auth.uid() is null), so it gets nothing.
-- streak_days/last_active stay writable only through touch_streak(), and referred_by only
-- through the signup function — both run with elevated rights, so neither needs a grant.
