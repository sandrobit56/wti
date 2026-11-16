/**
 * File:        lib/personas.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-16
 * Version:     v1.0 — 12 personas from the "12 პერსონა და ტესტი" doc
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
  tamada: { id: "tamada", name: "სუფრის თამადა", line: "სუფრა შენთვის ჭამა კი არა, ღონისძიებაა.", icon: "khachapuri", georgianHabit: true,
    matches: (d) => d.tags.includes("supra") || (d.cuisine === "ქართული" && d.heaviness === "მძიმე") },
  khinkali: { id: "khinkali", name: "ხინკლის მათემატიკოსი", line: "კუდებს ითვლი და ერთით მეტს უკვეთავ.", icon: "khinkali", georgianHabit: true,
    matches: (d) => d.tags.includes("dumpling") },
  bakery: { id: "bakery", name: "საცხობის მორბენალი", line: "საუზმე ცხელია, იაფია და ხელში ეტევა.", icon: "lobiani", georgianHabit: true,
    matches: (d) => d.tags.includes("bakery") },
  grandma: { id: "grandma", name: "ბებიის რეცეპტების მცველი", line: "ჩაქაფული, ჩახოხბილი, ელარჯი — სახლის გემო.", icon: "soup", georgianHabit: true,
    matches: (d) => d.tags.includes("homestyle") || d.tags.includes("regional") },
  green: { id: "green", name: "მწვანე სუფრის ოსტატი", line: "ფხალი, ლობიო, ბადრიჯანი — ხორცი არ გენატრება.", icon: "salad", georgianHabit: true,
    matches: (d) => d.vegan || d.tags.includes("lenten") },
  spice: { id: "spice", name: "ცხარის მონადირე", line: "აჯიკა სოუსი კი არა, ცხოვრების წესია.", icon: "soup", georgianHabit: true,
    matches: (d) => d.spicy >= 1 },
  mtsvadi: { id: "mtsvadi", name: "მწვადის მეფე", line: "ნაკვერჩხალი და ხორცი — დანარჩენი დეტალებია.", icon: "mtsvadi", georgianHabit: true,
    matches: (d) => d.tags.includes("grill") || d.category === "ხორცი" },
  shawarma: { id: "shawarma", name: "შაურმის ღამის რაინდი", line: "ქალაქი იძინებს, ჯიხური — არა.", icon: "shawarma", georgianHabit: true,
    matches: (d) => d.category === "სტრიტფუდი" || d.meals.includes("ღამე") },
  sushi: { id: "sushi", name: "სუშის დიპლომატი", line: "ჩხირები ჩანგალზე უკეთ გეხერხება.", icon: "sushi", georgianHabit: false,
    matches: (d) => d.cuisine === "აზიური" },
  lunch: { id: "lunch", name: "ლანჩის სტრატეგი", line: "40 წუთი, მსუბუქი, გემრიელი — და საქმეზე.", icon: "sandwich", georgianHabit: false,
    matches: (d) => (d.heaviness === "მსუბუქი" && d.meals.includes("სადილი")) || d.tags.includes("bowl") },
  brunch: { id: "brunch", name: "ბრანჩის რომანტიკოსი", line: "ყავა, კვერცხი, ნამცხვარი — დღე ლამაზად იწყება.", icon: "cake", georgianHabit: false,
    matches: (d) => d.tags.includes("brunch") || d.category === "დესერტი" },
  world: { id: "world", name: "მსოფლიო გემოს კოლექციონერი", line: "მენიუში ის გაინტერესებს, რაც ჯერ არ გაგისინჯავს.", icon: "taco", georgianHabit: false,
    matches: (d) => d.cuisine !== "ქართული" },
};
