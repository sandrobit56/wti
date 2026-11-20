/**
 * File:        lib/personas.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-18
 * Version:     v1.4 — final 12 names + lines (Sandro, "საბოლოო 12 პერსონაჟი");
 *              v1.3 — Sandro's names: ჭამის ოსტატი, კუჭების მთვლელი, ცომის მოტრფიალე,
 *              წიწაკის რისხვა, შამფურის კაცი, შაურმის ხულიგანი, გემოებზე მონადირე;
 *              v1.1 — 8 persona names localized (კუდების მთვლელი, თონის სტუმარი, …);
 *              v1.0 — 12 personas from the "12 პერსონა და ტესტი" doc
 * Description: Persona card copy + the wheel rule. A dish that matches the
 *              persona's rule gets ×1.6 weight (lib/spin.ts). 8 personas are
 *              built on Georgian eating habits, 4 on non-Georgian ones.
 */
import type { Dish, IconName } from "./catalog.ts";
import type { PersonaId } from "./quiz.ts";

export type Persona = {
  id: PersonaId;
  name: string;
  line: string;          // one line for the shareable card
  icon: IconName;
  georgianHabit: boolean;
  matches: (d: Dish) => boolean;
};

export const PERSONA_BOOST = 1.6;

export const PERSONAS: Record<PersonaId, Persona> = {
  tamada: { id: "tamada", name: "სუფრის გადამრჩენი", line: "სუფრაზე საჭმელი რომ დარჩეს, შენ არ დაუშვებ. ბოლო ლუკმამდეც იბრძოლებ.", icon: "khachapuri", georgianHabit: true,
    matches: (d) => d.tags.includes("supra") || (d.cuisine === "ქართული" && d.heaviness === "მძიმე") },
  khinkali: { id: "khinkali", name: "კუჭების კოლექციონერი", line: "ხინკალს მანამდე ჭამ, სანამ ადგილი გაქვს. ბოლოს მაინც კიდევ ხუთს უკვეთავ.", icon: "khinkali", georgianHabit: true,
    matches: (d) => d.tags.includes("dumpling") },
  bakery: { id: "bakery", name: "ცხელ-ცხელის მოყვარული", line: "თონეს ისე ვერ ჩაუვლი, ცხელი ლობიანი ან ხაჭაპური რომ არ გამოაყოლო.", icon: "lobiani", georgianHabit: true,
    matches: (d) => d.tags.includes("bakery") },
  grandma: { id: "grandma", name: "ბებიას გაზრდილი", line: "შენთვის საუკეთესო რესტორანი მაინც ბებიას სამზარეულოა. თან იქ ულუფებიც დიდია.", icon: "soup", georgianHabit: true,
    matches: (d) => d.tags.includes("homestyle") || d.tags.includes("regional") },
  green: { id: "green", name: "ბადრიჯნის ერთგული", line: "სხვები მწვადს ეძებენ, შენ — ნიგვზიან ბადრიჯანს. და არც ნანობ.", icon: "salad", georgianHabit: true,
    matches: (d) => d.vegan || d.tags.includes("lenten") },
  spice: { id: "spice", name: "წიწაკის რისხვა", line: "სხვები წყალს ეძებენ, შენ კიდევ აჯიკას ამატებ.", icon: "soup", georgianHabit: true,
    matches: (d) => d.spicy >= 1 },
  mtsvadi: { id: "mtsvadi", name: "მწვადის მაესტრო", line: "მწვადს შენ წვავ. სხვებს მაქსიმუმ შამფურების მოტანის უფლება აქვთ.", icon: "mtsvadi", georgianHabit: true,
    matches: (d) => d.tags.includes("grill") || d.category === "ხორცი" },
  shawarma: { id: "shawarma", name: "შაურმის ხულიგანი", line: "ღამის ორ საათზეც ზუსტად იცი, სად აკეთებენ კარგ შაურმას.", icon: "shawarma", georgianHabit: true,
    matches: (d) => d.category === "სტრიტფუდი" || d.meals.includes("ღამე") },
  sushi: { id: "sushi", name: "სუშის კაცი", line: "სუშიზე უარს არ ამბობ. ჩხირებით ჭამაც უკვე ისე გეხერხება, თითქოს იქ გაიზარდე.", icon: "sushi", georgianHabit: false,
    matches: (d) => d.cuisine === "აზიური" },
  lunch: { id: "lunch", name: "საქმიანი მშიერი", line: "საქმე ბევრი გაქვს, დრო — ცოტა. მაგრამ სადილს არაფრის გამო არ გამოტოვებ.", icon: "sandwich", georgianHabit: false,
    matches: (d) => (d.heaviness === "მსუბუქი" && d.meals.includes("სადილი")) || d.tags.includes("bowl") },
  brunch: { id: "brunch", name: "ძილისგუდა გურმანი", line: "დილით ადრე ადგომა გეზარება, მაგრამ გემრიელი საუზმისთვის ძილს მაინც შეელევი.", icon: "cake", georgianHabit: false,
    matches: (d) => d.tags.includes("brunch") || d.category === "დესერტი" },
  world: { id: "world", name: "გემოს მაძიებელი", line: "მენიუში რაც არ გაგისინჯავს, პირველ რიგში იმას უკვეთავ. ხანდახან გიმართლებს კიდეც.", icon: "taco", georgianHabit: false,
    matches: (d) => d.cuisine !== "ქართული" },
};
