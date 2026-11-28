"use client";
/**
 * File:        components/JoinCritics.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-27
 * Version:     v2.2 — Figma 211:8: the question is the headline (BPG, coral), serif line, one CTA;
 *              steps on the right; discobolus with sushi; v2.1 — stickers instead of 01/02/03, no kicker; v2.0 — editorial: kicker + title stay on the left (sticky), drop-cap manifesto and
 *              ruled numbered rows on the right, on cream paper; chapter label + how-it-works steps; one-strip title; v1.4 — word-mosaic pomegranate (collage) replaces the flat badge; v1.3 — flat critic badge (logo style, arc lettering) instead of the 3D kit; was v1.1 — "კრიტიკოსი" (not "მსაჯი"), no 3D jury figures, one button style
 * Description: The closing section's one action: "გახდი კრიტიკოსი" (become a critic).
 *              A 3D "critic's kit" (notebook, magnifier, medal, khinkali — reusable later for the
 *              rating system), a short invitation and ONE button. The
 *              button opens a short form in place (name, email, district, one line), with a
 *              consent box linked to /privacy. Same validator as the server (lib/critics.ts).
 *              Honeypot field "website" is hidden from people and screen readers.
 */
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { checkSignup, DISTRICTS, LIMITS } from "@/lib/critics.ts";
import Image from "next/image";
import { Lines } from "./Lines";
import { Sticker9 } from "./Stickers9";

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
    <section className="join9 sect" id="join" aria-labelledby="join-title">
      <Lines kind="page" />
      <Image className="join9__disco" src="/collage/discobolus-sushi.webp" alt="" aria-hidden="true" width={459} height={671} sizes="184px" />
      <div className="join9__inner">
        {/* editorial layout: the title + action stay put on the left while the manifesto reads on the right */}
        <div className="join9__side">
          <h2 id="join-title" className="join9__q">ჭამ, აკვირდები, გული გწყდება ცუდ ხინკალზე<em>?</em></h2>
          <p className="join9__body-text">ვეძებთ ადამიანებს, ვინც რესტორნებს ჩვეულებრივ სტუმრად შეამოწმებს და გულწრფელად დაწერს.</p>
          {status.kind === "closed" && (
            <button className="btn9 join9__cta" onClick={() => setStatus({ kind: "open", error: null, field: null })}>გახდი კრიტიკოსი</button>
          )}
        </div>
        <div className="join9__body">
          <ol className="rows9x">
            <li><Sticker9 kind="join" /><b>შემოგვიერთდი</b><em>ორი წუთი: სახელი, ელფოსტა და რა გიყვარს.</em></li>
            <li><Sticker9 kind="taste" /><b>გასინჯე</b><em>მიდი როგორც ჩვეულებრივი სტუმარი: ჭამე, დააკვირდი.</em></li>
            <li><Sticker9 kind="write" /><b>დაწერე პირდაპირ</b><em>რა იყო კარგი, რა — არა. შენი სიტყვა ბორბალსაც ასწავლის.</em></li>
          </ol>

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
            <button className="btn9" type="submit" disabled={status.kind === "sending"}>{status.kind === "sending" ? "იგზავნება…" : "გაგზავნა"}</button>
          </form>
        )}

        {status.kind === "done" && (
          <p className="join__done" role="status">{status.already ? "უკვე სიაში ხარ — დაგიკავშირდებით." : "მადლობა! როცა პირველ შეფასებას დავგეგმავთ, მოგწერთ."}</p>
        )}
        {status.kind === "down" && <p className="join__done" role="status">ფორმა ჯერ არ არის ჩართული — ცოტა ხანში დაბრუნდი.</p>}
        </div>
      </div>
    </section>
  );
}
