/**
 * File:        app/api/critics/route.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: POST a critic sign-up → Supabase table `critic_signups` via the REST API.
 *              The secret key lives only in server env (SUPABASE_URL, SUPABASE_SECRET_KEY) and is
 *              sent on the `apikey` header only (new sb_secret_ keys are not JWTs). The table has
 *              RLS on and no policies, so nobody can read it from a browser.
 *              Guards: same-origin, 5 req/min per IP, honeypot field, shared validator.
 *              Duplicate email = success (no account enumeration, no error for the user).
 */
import { checkSignup } from "@/lib/critics.ts";
import { clientIp, isSameOrigin, rateLimiter } from "@/lib/security.ts";

const tooMany = rateLimiter(5);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "origin" }, { status: 403 });
  if (tooMany(clientIp(request))) return Response.json({ error: "rate" }, { status: 429 });

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return Response.json({ error: "not-configured" }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  if (typeof body.website === "string" && body.website !== "") return Response.json({ ok: true }); // bot filled the honeypot

  const check = checkSignup(body);
  if (!check.ok) return Response.json({ error: check.message, field: check.field }, { status: 400 });

  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json", Prefer: "return=minimal" };
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`; // legacy service_role JWT
  const res = await fetch(`${url}/rest/v1/critic_signups`, {
    method: "POST", headers,
    body: JSON.stringify({ ...check.value, consent_at: new Date().toISOString() }),
  });
  if (res.status === 409) return Response.json({ ok: true, already: true });
  if (!res.ok) {
    console.error("critics insert failed", res.status, await res.text());
    return Response.json({ error: "save failed" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
