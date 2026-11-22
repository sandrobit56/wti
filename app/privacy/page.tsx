/**
 * File:        app/privacy/page.tsx
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v1.1 — critic sign-up (the only personal data we keep, and only on request)
 * Description: Privacy page — what the app processes, where, and for how long, in
 *              plain Georgian; plus a button that deletes everything stored in this
 *              browser. Must stay in sync with lib/security.ts, components/Randomizer.tsx
 *              (storage) and the API routes. Update this page whenever data handling changes.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ClearData } from "@/components/ClearData";

export const metadata: Metadata = { title: "კონფიდენციალურობა", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <main className="container privacy">
      <Link href="/" className="link">← მთავარზე</Link>
      <h1>კონფიდენციალურობა</h1>
      <p className="privacy__lead">მოკლედ: ანგარიში არ გვაქვს, რეკლამა და თვალთვალი არ არის. სახელს და ელფოსტას ვინახავთ მხოლოდ მაშინ, თუ თავად შეავსებ „გახდი ჩანგლის კრიტიკოსი“ ფორმას.</p>

      <section>
        <h2>ლოკაცია</h2>
        <ul>
          <li>მხოლოდ მაშინ ვიყენებთ, როცა თავად დააჭერ „ჩემი ლოკაცია“-ს.</li>
          <li>კოორდინატებს ~110 მეტრამდე ვამრგვალებთ — უბნის დონე, არა მისამართი.</li>
          <li>ბრაუზერში არ ინახება: გვერდის განახლების მერე ხელახლა გკითხავთ.</li>
          <li>ჩვენს სერვერს ეგზავნება მხოლოდ ახლომდებარე ადგილების დასათვლელად და არ ინახება.</li>
          <li>„ახლოს მყოფი ადგილები Google-იდან“-ზე დაჭერისას იგივე გამრგვალებული წერტილი ეგზავნება Google-ს.</li>
        </ul>
      </section>

      <section>
        <h2>რას ინახავს შენი ბრაუზერი</h2>
        <p>ფილტრები, არჩეული უბანი, ტესტის პასუხები, ბოლო დატრიალებები, „დღეს არა“ და „არ მიყვარს“ სიები, თამაშის რეკორდი. ეს მხოლოდ ამ მოწყობილობაზეა — ჩვენს სერვერზე არ იგზავნება.</p>
        <ClearData />
      </section>

      <section id="critics">
        <h2>„გახდი ჩანგლის კრიტიკოსი“ ფორმა</h2>
        <ul>
          <li><b>რას ვინახავთ:</b> სახელს, ელფოსტას, უბანს და ერთ ხაზს (თუ შეავსებ), და თანხმობის დროს. ტელეფონს, მისამართს და ლოკაციას — არა.</li>
          <li><b>რისთვის:</b> მხოლოდ კრიტიკოსების შესარჩევად და დასაკავშირებლად. არ ვყიდით, არ ვაზიარებთ, რეკლამას არ ვგზავნით.</li>
          <li><b>სად:</b> Supabase-ის მონაცემთა ბაზაში (ევროპული სერვერი). ბრაუზერიდან წაკითხვა შეუძლებელია — წვდომა მხოლოდ ჩვენს სერვერს აქვს.</li>
          <li><b>წაშლა:</b> მოგვწერე, და შენს ჩანაწერს წავშლით. შერჩევის დასრულების შემდეგ შეურჩეველ განაცხადებს ვშლით.</li>
        </ul>
      </section>

      <section>
        <h2>სხვა სერვისები</h2>
        <ul>
          <li><b>Google Maps</b> — რუკა და ადგილების ძებნა. Google-ის წესები: <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">policies.google.com/privacy</a></li>
          <li><b>Wolt, Glovo, Bolt Food</b> — მხოლოდ ბმულები; მათ გვერდზე გადასვლისას მათი წესები მოქმედებს.</li>
          <li><b>Vercel</b> (ჰოსტინგი) — როგორც ნებისმიერ საიტს, ტექნიკური ჟურნალი აქვს (IP, მოთხოვნის დრო) უსაფრთხოებისთვის.</li>
        </ul>
      </section>
    </main>
  );
}
