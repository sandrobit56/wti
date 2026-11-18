# რა ვჭამოთ? (WTI)

ბორბალი გირჩევს კერძს და გაჩვენებს, სად ჭამო ახლოს ან საიდან შეუკვეთო.
**ეტაპი 1:** ბორბალი + ლოკაცია + ფილტრები. პერსონის ტესტი, ბლოგები და „ჩანგლის“ რეიტინგი მომდევნო ეტაპებია.

## გაშვება

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # ბორბლის ლოგიკის ტესტები (node:test)
npm run check:quiz   # პერსონის ტესტის ბალანსი
npm run lint && npm run typecheck && npm run build
```

Node 22.18+ (TypeScript ფაილებს Node პირდაპირ უშვებს ტესტებისთვის).

## როგორ მუშაობს

| ფაილი | რას აკეთებს |
| --- | --- |
| `lib/catalog.ts` | 27 კერძი: ფასი, სიცხარე, დიეტა, დღის დრო, Overture-ის კატეგორიები |
| `lib/spin.ts` | სუფთა ლოგიკა: ჯერ გამარჯვებული, მერე ანიმაცია. მკაცრი ფილტრები (ბიუჯეტი, დიეტა, „დღეს არა“) + რბილი წონები |
| `lib/places.ts` | მანძილი, ადგილების დამთხვევა, Google Maps URL-ები, მიტანის ბმულები |
| `app/api/venues` | ახლომახლო ადგილები (სრული ბაზა სერვერზე რჩება) |
| `components/*` | ბორბალი, ფილტრის პანელი / ქვედა ფურცელი, შედეგის ბარათი |
| `scripts/import-venues.py` | Overture → `data/venues.json` |
| `lib/quiz.ts` | პერსონის ტესტი (ეტაპი 2, ჯერ UI-ში არ არის) |

## მონაცემები და კანონიერება

- **ადგილები:** [Overture Maps Places](https://docs.overturemaps.org/guides/places) — ლიცენზია წყაროს მიხედვით CDLA-Permissive-2.0 / Apache-2.0 / CC0, OSM-ის share-alike-ის გარეშე. თითო ჩანაწერს წყარო და ლიცენზია აქვს, attribution footer-შია.
- **„ყველა რესტორანი“:** Google [Maps URLs](https://developers.google.com/maps/documentation/urls) — უფასო, API გასაღების გარეშე, არაფერს ვინახავთ.
- **მიტანა:** Wolt / Glovo / Bolt Food-ს ღია API არ აქვთ, ამიტომ მხოლოდ მათ თბილისის გვერდებზე ვაგზავნით. Scraping არ ხდება.
- **პერსონალური მონაცემები:** ფილტრები, უბანი და „დღეს არა“ მხოლოდ ბრაუზერშია (`localStorage`, `wti:v1`). სერვერზე ლოკაცია არ ინახება.

## ადგილების ბაზის განახლება

GitHub Actions → **import-venues** → *Run workflow* (ან ავტომატურად ყოველი თვის 2-ში).
სკრიპტი ჩერდება შეცდომით, თუ Overture-ის სქემა შეიცვალა ან 100-ზე ნაკლები ადგილი დარჩა — ცარიელი ბაზა არასოდეს გამოქვეყნდება ჩუმად.

ლოკალურად:

```bash
pip install "overturemaps>=0.19"
overturemaps download --bbox=44.65,41.62,45.05,41.85 -f geojsonseq -t place -o raw-places.jsonl
python scripts/import-venues.py raw-places.jsonl
```

## ცნობილი შეზღუდვები (v1)

- კერძი ↔ ადგილი Overture-ის კატეგორიით და სახელით ემთხვევა (მაგ. ხინკალი → ქართული რესტორნები). ეს ევრისტიკაა; UI წერს „სავარაუდოდ“.
- მიტანის აპების ძიების ბმულების ფორმატი დოკუმენტირებული არ არის — ამჟამად ქალაქის გვერდებზე გადავდივართ.
- უბნების ცენტრები მიახლოებითია (±500 მ).
- ფასის ზღვრები (₾ ≤15, ₾₾ 15–35, ₾₾₾ 35+) ვარაუდია და რეალურ მენიუებზე უნდა გადამოწმდეს.

## Dish versions & photos (v4)
- `lib/variants.ts` — 363 real versions across 63 wheel types (our own descriptions, typical Tbilisi ₾ ranges).
- Photos: `scripts/fetch-photos.ts` (GitHub Action `fetch-photos`) takes each version's English Wikipedia lead image **only if it is on Wikimedia Commons under CC0 / PD / CC BY / CC BY-SA**, downloads a 640px copy to `public/photos/` and stores author + license in `data/photos.json`. The popup shows that credit under every photo — attribution is the license condition. No photo → icon.

## Security & privacy (v1)
- **Headers** (`next.config.ts`): CSP (own origin only + `www.google.com` frames), HSTS, `X-Frame-Options: DENY`, `nosniff`, strict Referrer-Policy, Permissions-Policy (geolocation self only), no `X-Powered-By`, `no-store` on `/api/*`.
  CSP uses `'unsafe-inline'` for Next's bootstrap scripts (Next 16 "Without Nonces"). **Switch to `proxy.ts` + nonces when accounts or user content arrive.**
- **Location**: GPS coarsened to ~110 m at the source (`lib/security.ts → coarse`), never written to localStorage.
- **APIs**: `/api/google-places` answers same-origin requests only (stops other sites spending our Google quota) + 5/min per IP; `/api/venues`, `/api/available` 60/min per IP. The real spending cap is the daily quota in Google Cloud.
- **Secrets**: `GOOGLE_PLACES_API_KEY` is server-only (never `NEXT_PUBLIC_`). The embed key is public by design and restricted to our domain + Maps Embed API in Google Cloud.
- **User data**: no accounts, no cookies, no analytics. localStorage keys start with `wti:`; `/privacy` explains everything and has a one-tap delete.
- **Dependencies**: Dependabot weekly (`.github/dependabot.yml`); `npm audit` clean at v1.
