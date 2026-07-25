import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// verify_jwt is intentionally OFF. The platform's built-in check only understands the
// legacy JWT-based anon key; a publishable (sb_publishable_*) key sent to a verify_jwt
// function is rejected as "Invalid JWT" before this code ever runs. Per Supabase's
// new-API-keys guidance we disable it and authorize here instead.
// Note the key is public either way — this is a bot speed bump, not access control.
function authorized(req: Request): boolean {
  const key = req.headers.get("apikey") ?? "";
  if (!key) return false;
  if (key.startsWith("sb_publishable_")) return true;
  const legacy = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  return legacy.length > 0 && key === legacy;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only", code: "method" }, 405);
  if (!authorized(req)) return json({ error: "Unauthorized.", code: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Malformed request.", code: "bad_body" }, 400);
  }

  // Trim the email: autofill and paste routinely append a space, which would otherwise
  // create an account at an address the user can never type back in.
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const uname = typeof body.username === "string" ? body.username.trim() : "";
  const ref = typeof body.ref === "string" ? body.ref.trim() : "";

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return json({ error: "Enter a valid email address.", code: "bad_email" }, 400);
  }
  if (password.length < 8) {
    return json({ error: "Password needs at least 8 characters.", code: "bad_password" }, 400);
  }
  if (password.length > 72) {
    return json({ error: "Password can be at most 72 characters.", code: "bad_password" }, 400);
  }
  if (uname.length < 3 || uname.length > 24) {
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
    // Distinct codes so the client can route the user instead of dead-ending them.
    // email_taken is also what a retried-after-success request sees, which is why the
    // client treats it as "go sign in" rather than as a failure.
    if (/already|registered|exists|duplicate/i.test(m)) {
      return json({
        error: "That email already has an account. Sign in instead.",
        code: "email_taken",
      }, 409);
    }
    if (/rate|too many/i.test(m)) {
      return json({
        error: "Too many signups right now. Try again in a few minutes.",
        code: "rate_limited",
      }, 429);
    }
    if (/password/i.test(m)) {
      return json({ error: "That password was rejected. Try a different one.", code: "bad_password" }, 400);
    }
    // Log the real cause server-side; never leak raw Postgres/GoTrue text to the UI.
    console.error("createUser failed:", m);
    return json({
      error: "Could not create your account. Please try again in a moment.",
      code: "create_failed",
    }, 502);
  }

  const userId = data?.user?.id ?? null;

  // The DB trigger assigns the final username: it sanitizes the request and appends a
  // numeric suffix if the name was taken. Read it back so the client can tell the user
  // what they actually got rather than silently renaming them.
  let assigned: string | null = null;
  if (userId) {
    const { data: prof } = await admin
      .from("profiles").select("username").eq("id", userId).maybeSingle();
    assigned = prof?.username ?? null;
  }

  // Referral attribution: best effort. Deliberately outside the account-creation path so
  // a referral problem can never turn a successful signup into a reported failure.
  if (ref && userId) {
    try {
      const { data: referrer } = await admin
        .from("profiles").select("id").eq("username", ref).maybeSingle();
      if (referrer && referrer.id !== userId) {
        await admin.from("profiles").update({ referred_by: referrer.id }).eq("id", userId);
      }
    } catch (e) {
      console.error("referral attribution failed (ignored):", e);
    }
  }

  return json({
    ok: true,
    username: assigned,
    requested: uname,
    renamed: assigned !== null && assigned !== uname,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
