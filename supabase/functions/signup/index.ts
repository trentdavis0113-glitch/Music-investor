import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROJECT_REF = "uajheoltstvftdmnigaw";

/**
 * verify_jwt is intentionally OFF. Supabase's built-in check only understands the legacy
 * JWT-based anon key; a publishable (sb_publishable_*) key sent to a verify_jwt function is
 * rejected as "Invalid JWT" before this code runs. So we authorize here instead.
 *
 * Accepts the key from EITHER the `apikey` header (new frontend, publishable key) OR the
 * `Authorization: Bearer` header (the frontend currently deployed on Netlify, legacy anon
 * JWT). Both must keep working: the deployed bundle and the repo are not in sync, and a
 * check that only understood one of them would take signup down for live users.
 *
 * The key is public in every case, so this is a bot speed bump, not access control.
 */
function authorized(req: Request): boolean {
  const candidates = [
    req.headers.get("apikey") ?? "",
    (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim(),
  ].filter((k) => k.length > 0);

  if (candidates.length === 0) return false;

  const legacy = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  return candidates.some((k) => {
    if (k.startsWith("sb_publishable_")) return true;
    if (legacy.length > 0 && k === legacy) return true;
    // Fall back to inspecting the JWT payload, so this keeps working even if
    // SUPABASE_ANON_KEY is not injected into the function environment.
    return isProjectJwt(k);
  });
}

function isProjectJwt(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const pad = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(pad + "=".repeat((4 - (pad.length % 4)) % 4)));
    return payload?.ref === PROJECT_REF && typeof payload?.role === "string";
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only", code: "method" }, 405);

  if (!authorized(req)) {
    console.warn(JSON.stringify({ evt: "signup.unauthorized", hasApikey: !!req.headers.get("apikey"), hasAuth: !!req.headers.get("authorization") }));
    return json({ error: "Unauthorized.", code: "unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    console.warn(JSON.stringify({ evt: "signup.validation_failed", reason: "bad_body" }));
    return json({ error: "Malformed request.", code: "bad_body" }, 400);
  }

  // Trim: autofill and paste routinely append a space, which would otherwise create an
  // account at an address the user can never type back in.
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const uname = typeof body.username === "string" ? body.username.trim() : "";
  const ref = typeof body.ref === "string" ? body.ref.trim() : "";

  console.log(JSON.stringify({ evt: "signup.received", emailDomain: email.split("@")[1] ?? null, unameLen: uname.length, hasRef: !!ref }));

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    console.warn(JSON.stringify({ evt: "signup.validation_failed", reason: "bad_email" }));
    return json({ error: "Enter a valid email address.", code: "bad_email" }, 400);
  }
  if (password.length < 8) {
    console.warn(JSON.stringify({ evt: "signup.validation_failed", reason: "password_short" }));
    return json({ error: "Password needs at least 8 characters.", code: "bad_password" }, 400);
  }
  if (password.length > 72) {
    console.warn(JSON.stringify({ evt: "signup.validation_failed", reason: "password_long" }));
    return json({ error: "Password can be at most 72 characters.", code: "bad_password" }, 400);
  }
  if (uname.length < 3 || uname.length > 24) {
    console.warn(JSON.stringify({ evt: "signup.validation_failed", reason: "bad_username" }));
    return json({ error: "Username needs 3 to 24 characters.", code: "bad_username" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: uname },
  });

  if (error) {
    const m = error.message ?? "";
    if (/already|registered|exists|duplicate/i.test(m)) {
      console.log(JSON.stringify({ evt: "signup.auth_user_failed", reason: "email_taken" }));
      return json({ error: "That email already has an account. Sign in instead.", code: "email_taken" }, 409);
    }
    if (/rate|too many/i.test(m)) {
      console.warn(JSON.stringify({ evt: "signup.auth_user_failed", reason: "rate_limited" }));
      return json({ error: "Too many signups right now. Try again in a few minutes.", code: "rate_limited" }, 429);
    }
    if (/password/i.test(m)) {
      console.warn(JSON.stringify({ evt: "signup.auth_user_failed", reason: "password_rejected" }));
      return json({ error: "That password was rejected. Try a different one.", code: "bad_password" }, 400);
    }
    console.error(JSON.stringify({ evt: "signup.auth_user_failed", reason: "unexpected", detail: m }));
    return json({ error: "Could not create your account. Please try again in a moment.", code: "create_failed" }, 502);
  }

  const userId = data?.user?.id ?? null;
  console.log(JSON.stringify({ evt: "signup.auth_user_created", userId }));

  // The DB trigger assigns the final username (sanitized, numeric suffix if taken) and
  // provisions the season account. Read both back so we can report provisioning health
  // and tell the user which name they actually got.
  let assigned: string | null = null;
  let provisioned = false;
  if (userId) {
    const [{ data: prof }, { count }] = await Promise.all([
      admin.from("profiles").select("username").eq("id", userId).maybeSingle(),
      admin.from("season_accounts").select("user_id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    assigned = prof?.username ?? null;
    provisioned = (count ?? 0) > 0;
    console.log(JSON.stringify({
      evt: "signup.provisioned",
      userId,
      profile: !!assigned,
      assignedUsername: assigned,
      renamed: assigned !== null && assigned !== uname,
      seasonAccounts: count ?? 0,
    }));
    if (!assigned || !provisioned) {
      console.error(JSON.stringify({ evt: "signup.provisioning_incomplete", userId, profile: !!assigned, seasonAccounts: count ?? 0 }));
    }
  }

  // Referral attribution: best effort, deliberately outside the account-creation path so
  // it can never turn a successful signup into a reported failure.
  if (ref && userId) {
    try {
      const { data: referrer } = await admin.from("profiles").select("id").eq("username", ref).maybeSingle();
      if (referrer && referrer.id !== userId) {
        await admin.from("profiles").update({ referred_by: referrer.id }).eq("id", userId);
      } else {
        console.log(JSON.stringify({ evt: "signup.referral_skipped", reason: referrer ? "self" : "unknown_referrer" }));
      }
    } catch (e) {
      console.error(JSON.stringify({ evt: "signup.referral_failed", detail: String(e) }));
    }
  }

  return json({
    ok: true,
    username: assigned,
    requested: uname,
    renamed: assigned !== null && assigned !== uname,
    provisioned,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
