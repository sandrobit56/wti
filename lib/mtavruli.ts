/**
 * File:        lib/mtavruli.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: Mkhedruli → Mtavruli (Georgian "capitals", Unicode 11, U+1C90–1CBA).
 *              CSS `text-transform: uppercase` does NOT do this in browsers (ICU leaves
 *              Georgian alone on purpose), so display titles convert in code. Mtavruli
 *              is a visual style only: callers keep the original text for screen readers.
 */
const MKHEDRULI_A = 0x10d0; // ა
const MKHEDRULI_LAST = 0x10fa; // ჺ (last letter with a Mtavruli pair)
const OFFSET = 0x1c90 - MKHEDRULI_A;

export function toMtavruli(text: string): string {
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    out += c >= MKHEDRULI_A && c <= MKHEDRULI_LAST ? String.fromCodePoint(c + OFFSET) : ch;
  }
  return out;
}
