-- Referral attribution previously lived only in the signup Edge Function, which OAuth
-- signups never touch — so anyone arriving via ?ref=someone and choosing "Continue with
-- Google" was silently unattributed. The client calls this once after a session appears.
--
-- Deliberately one-shot and self-proof: it only fills referred_by when it is still null,
-- so it cannot be replayed to re-point an existing attribution.

create or replace function public.claim_referral(p_ref text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid      uuid := (select auth.uid());
  v_referrer uuid;
begin
  if v_uid is null then return false; end if;

  p_ref := nullif(btrim(coalesce(p_ref, '')), '');
  if p_ref is null then return false; end if;

  -- Already attributed: never overwrite.
  if exists (select 1 from public.profiles where id = v_uid and referred_by is not null) then
    return false;
  end if;

  select id into v_referrer from public.profiles where username = p_ref;
  if v_referrer is null or v_referrer = v_uid then return false; end if;

  update public.profiles set referred_by = v_referrer
   where id = v_uid and referred_by is null;

  return found;
end $function$;

revoke all on function public.claim_referral(text) from public;
grant execute on function public.claim_referral(text) to authenticated;
