/**
 * File:        lib/critics.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: "გახდი კრიტიკოსი" sign-up: one validator shared by the form (instant hints)
 *              and the API route (the real gate). Minimal data on purpose: name, email, district,
 *              one line about what they love, and the time they consented. No phone, no address.
 */
import { NEIGHBORHOODS } from "./places.ts";

export const LIMITS = { name: 60, email: 254, loves: 140 } as const;
export const DISTRICTS: readonly string[] = NEIGHBORHOODS.map((n) => n.name);

export type Signup = { name: string; email: string; district: string | null; loves: string; consent: boolean };
export type Clean = { name: string; email: string; district: string | null; loves: string | null };
export type Check = { ok: true; value: Clean } | { ok: false; field: keyof Signup; message: string };

// Pragmatic: one @, a dot in the domain, no spaces. Real proof is a reply to our email later.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (s: unknown) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

export function checkSignup(raw: Partial<Record<keyof Signup, unknown>>): Check {
  const name = clean(raw.name), email = clean(raw.email).toLowerCase(), loves = clean(raw.loves);
  const district = clean(raw.district) || null;
  if (!name) return { ok: false, field: "name", message: "დაწერე სახელი" };
  if (name.length > LIMITS.name) return { ok: false, field: "name", message: `სახელი ${LIMITS.name} სიმბოლომდე` };
  if (!EMAIL.test(email) || email.length > LIMITS.email) return { ok: false, field: "email", message: "ელფოსტა არასწორია" };
  if (district && !DISTRICTS.includes(district)) return { ok: false, field: "district", message: "აირჩიე უბანი სიიდან" };
  if (loves.length > LIMITS.loves) return { ok: false, field: "loves", message: `${LIMITS.loves} სიმბოლომდე` };
  if (raw.consent !== true) return { ok: false, field: "consent", message: "საჭიროა თანხმობა" };
  return { ok: true, value: { name, email, district, loves: loves || null } };
}
