/**
 * File:        types/troika-three-text.d.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-22
 * Version:     v1.0
 * Description: The one troika API we call directly (it ships no types).
 */
declare module "troika-three-text" {
  export function configureTextBuilder(config: { useWorker?: boolean; defaultFontURL?: string }): void;
}
