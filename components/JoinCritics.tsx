"use client";
/**
 * File:        components/JoinCritics.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.3 — flat critic badge (logo style, arc lettering) instead of the 3D kit; was v1.1 — "კრიტიკოსი" (not "მსაჯი"), no 3D jury figures, one button style
 * Description: The closing section's one action: "გახდი კრიტიკოსი" (become a critic).
 *              A 3D "critic's kit" (notebook, magnifier, medal, khinkali — reusable later for the
 *              rating system), a short invitation and ONE button. The
 *              button opens a short form in place (name, email, district, one line), with a
 *              consent box linked to /privacy. Same validator as the server (lib/critics.ts).
 *              Honeypot field "website" is hidden from people and screen readers.
 */
import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { checkSignup, DISTRICTS, LIMITS } from "@/lib/critics.ts";
import { Words } from "./Words";

type Status = { kind: "closed" } | { kind: "open"; error: string | null; field: string | null } | { kind: "sending" } | { kind: "done"; already: boolean } | { kind: "down" };

export function JoinCritics() {
  const [status, setStatus] = useState<Status>({ kind: "closed" });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const raw = { name: f.get("name"), email: f.get("email"), district: f.get("district"), loves: f.get("loves"), consent: f.get("consent") === "on", website: f.get("website") };
    const check = checkSignup(raw);
    if (!check.ok) { setStatus({ kind: "open", error: check.message, field: check.field }); return; }
    setStatus({ kind: "sending" });
    const res = await fetch("/api/critics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(raw) });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setStatus({ kind: "done", already: Boolean(j.already) });
    else if (res.status === 503) setStatus({ kind: "down" });
    else setStatus({ kind: "open", error: j.error ?? "ვერ გაიგზავნა, სცადე ცოტა ხანში", field: j.field ?? null });
  }

  const bad = (name: string) => (status.kind === "open" && status.field === name ? true : undefined);

  return (
    <section className="join sect" id="join" aria-labelledby="join-title">
      <div className="container join__inner">
        <Image className="join__kit" src="/illustrations/critic-badge.svg" alt="" width={400} height={400} unoptimized />
        <h2 id="join-title" className="section-title display join__title"><Words caps parts={["გახდი ", ["კრიტიკოსი", "accent"]]} /></h2>
        <p className="join__lead">
          ჭამ, აკვირდები, გული გწყდება ცუდ ხინკალზე? ვეძებთ ადამიანებს, ვინც რესტორნებს შეამოწმებს და
          გულწრფელად დაწერს.
        </p>

        {status.kind === "closed" && (
          <button className="btn btn--lg" onClick={() => setStatus({ kind: "open", error: null, field: null })}>მინდა შეფასება ✦</button>
        )}

        {(status.kind === "open" || status.kind === "sending") && (
          <form className="join__form" onSubmit={submit} noValidate>
            <label>სახელი<input name="name" autoComplete="given-name" maxLength={LIMITS.name} required aria-invalid={bad("name")} /></label>
            <label>ელფოსტა<input name="email" type="email" autoComplete="email" maxLength={LIMITS.email} required aria-invalid={bad("email")} /></label>
            <label>უბანი <small>(არასავალდებულო)</small>
              <select name="district" defaultValue="" aria-invalid={bad("district")}>
                <option value="">—</option>
                {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label>რა გიყვარს ყველაზე? <small>(არასავალდებულო)</small><input name="loves" maxLength={LIMITS.loves} placeholder="მაგ. ხინკალი, რომელიც არ იღვრება" aria-invalid={bad("loves")} /></label>
            <input className="join__hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <label className="join__consent">
              <input type="checkbox" name="consent" aria-invalid={bad("consent")} />
              <span>ვეთანხმები, რომ ეს მონაცემები შეინახოთ მხოლოდ კრიტიკოსების შესარჩევად. <Link href="/privacy#critics">დეტალები</Link></span>
            </label>
            {status.kind === "open" && status.error && <p className="join__error" role="alert">{status.error}</p>}
            <button className="btn" type="submit" disabled={status.kind === "sending"}>{status.kind === "sending" ? "იგზავნება…" : "გაგზავნა"}</button>
          </form>
        )}

        {status.kind === "done" && (
          <p className="join__done" role="status">{status.already ? "უკვე სიაში ხარ — დაგიკავშირდებით." : "მადლობა! როცა პირველ შეფასებას დავგეგმავთ, მოგწერთ."} 🍴</p>
        )}
        {status.kind === "down" && <p className="join__done" role="status">ფორმა ჯერ არ არის ჩართული — ცოტა ხანში დაბრუნდი.</p>}
      </div>
    </section>
  );
}
