/**
 * File:        app/not-found.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-19
 * Version:     v1.0
 * Description: 404 in the brand voice — the mascot ate the page; one way back.
 */
import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container notfound">
      <Image className="notfound__mascot" src="/icons/mascot.svg" alt="" width={140} height={144} priority />
      <p className="caps">404</p>
      <h1>ეს გვერდი შეჭამეს</h1>
      <p>ბმული ძველია ან ასეთი გვერდი არ არსებობს. ბორბალი კი ადგილზეა.</p>
      <Link href="/" className="pill pill--dark">დაატრიალე ბორბალი</Link>
    </main>
  );
}
