/**
 * File:        lib/catalog.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0 — phase 1 catalog: 27 dishes
 * Description: The dish catalog the wheel spins over. Plain typed data — the
 *              compiler is the validator (a typo in a tag or category won't build).
 *              `venue` says how to find venues for a dish in Overture data:
 *              `cats` = substrings of Overture taxonomy ids (e.g. "georgian" matches
 *              "georgian_restaurant"), `names` = substrings of the venue name.
 *              Target for launch is 40 dishes (cold-start plan §2).
 */

export type Category = "ცომეული" | "ხორცი" | "ზღვის" | "სალათი" | "სტრიტფუდი" | "დესერტი" | "საუზმე" | "კერძი";
export type Cuisine = "ქართული" | "აზიური" | "იტალიური" | "ახლოაღმოსავლური" | "სხვა";
export type MealTime = "საუზმე" | "სადილი" | "ვახშამი" | "ღამე";
export type Heaviness = "მსუბუქი" | "ნორმალური" | "მძიმე";
export type Tag = "supra" | "dumpling" | "bakery" | "homestyle" | "regional" | "lenten" | "grill" | "bowl" | "brunch" | "fast";
export type IconName = "khinkali" | "khachapuri" | "lobiani" | "mtsvadi" | "shawarma" | "pizza" | "sushi" | "salad" | "mascot";

export type Dish = {
  slug: string;
  name: string;
  category: Category;
  cuisine: Cuisine;
  price: 1 | 2 | 3;            // ₾ ≤15 · ₾₾ 15–35 · ₾₾₾ 35+ (assumption, verify on real menus)
  spicy: 0 | 1 | 2;
  vegetarian: boolean;
  vegan: boolean;
  meals: MealTime[];
  heaviness: Heaviness;
  baseWeight: 1 | 2 | 3;       // editorial popularity for the empty start
  tags: Tag[];
  icon: IconName;
  venue: { cats: string[]; names: string[] };
  search: string;              // what we type into Google Maps / delivery apps
};

const D = (d: Dish) => d;

export const DISHES: Dish[] = [
  D({ slug: "khinkali", name: "ხინკალი", category: "ხორცი", cuisine: "ქართული", price: 1, spicy: 0, vegetarian: false, vegan: false,
      meals: ["სადილი", "ვახშამი", "ღამე"], heaviness: "მძიმე", baseWeight: 3, tags: ["dumpling", "supra"], icon: "khinkali",
      venue: { cats: ["georgian"], names: ["ხინკ", "khinkal"] }, search: "ხინკალი" }),
  D({ slug: "khachapuri", name: "ხაჭაპური", category: "ცომეული", cuisine: "ქართული", price: 1, spicy: 0, vegetarian: true, vegan: false,
      meals: ["საუზმე", "სადილი", "ვახშამი"], heaviness: "მძიმე", baseWeight: 3, tags: ["bakery", "supra"], icon: "khachapuri",
      venue: { cats: ["georgian", "bakery"], names: ["ხაჭაპ", "khachap"] }, search: "ხაჭაპური" }),
  D({ slug: "lobiani", name: "ლობიანი", category: "ცომეული", cuisine: "ქართული", price: 1, spicy: 0, vegetarian: true, vegan: true,
      meals: ["საუზმე", "სადილი"], heaviness: "ნორმალური", baseWeight: 2, tags: ["bakery", "lenten", "fast"], icon: "lobiani",
      venue: { cats: ["bakery"], names: ["საცხობ", "პურ", "bakery", "lobian"] }, search: "ლობიანი" }),
  D({ slug: "mtsvadi", name: "მწვადი", category: "ხორცი", cuisine: "ქართული", price: 2, spicy: 0, vegetarian: false, vegan: false,
      meals: ["სადილი", "ვახშამი"], heaviness: "მძიმე", baseWeight: 3, tags: ["grill", "supra"], icon: "mtsvadi",
      venue: { cats: ["barbecue", "grill", "steakhouse", "georgian"], names: ["მწვად", "mtsvad", "grill"] }, search: "მწვადი" }),
  D({ slug: "shawarma", name: "შაურმა", category: "სტრიტფუდი", cuisine: "ახლოაღმოსავლური", price: 1, spicy: 1, vegetarian: false, vegan: false,
      meals: ["სადილი", "ვახშამი", "ღამე"], heaviness: "მძიმე", baseWeight: 3, tags: ["fast"], icon: "shawarma",
      venue: { cats: ["kebab", "shawarma", "doner", "middle_eastern"], names: ["შაურმ", "shaurm", "shawarm", "doner"] }, search: "შაურმა" }),
  D({ slug: "pizza", name: "პიცა", category: "სტრიტფუდი", cuisine: "იტალიური", price: 2, spicy: 0, vegetarian: true, vegan: false,
      meals: ["სადილი", "ვახშამი", "ღამე"], heaviness: "მძიმე", baseWeight: 2, tags: ["fast"], icon: "pizza",
      venue: { cats: ["pizza"], names: ["pizza", "პიც"] }, search: "პიცა" }),
  D({ slug: "sushi", name: "სუში", category: "ზღვის", cuisine: "აზიური", price: 3, spicy: 0, vegetarian: false, vegan: false,
      meals: ["სადილი", "ვახშამი"], heaviness: "მსუბუქი", baseWeight: 2, tags: [], icon: "sushi",
      venue: { cats: ["sushi", "japanese"], names: ["sushi", "სუშ"] }, search: "სუში" }),
  D({ slug: "salad-bowl", name: "სალათი / ბოული", category: "სალათი", cuisine: "სხვა", price: 2, spicy: 0, vegetarian: true, vegan: false,
      meals: ["სადილი"], heaviness: "მსუბუქი", baseWeight: 1, tags: ["bowl", "fast"], icon: "salad",
      venue: { cats: ["salad", "health", "poke", "vegan", "vegetarian"], names: ["salad", "bowl", "poke"] }, search: "სალათი ბოული" }),
  D({ slug: "chakapuli", name: "ჩაქაფული", category: "კერძი", cuisine: "ქართული", price: 2, spicy: 0, vegetarian: false, vegan: false,
      meals: ["სადილი", "ვახშამი"], heaviness: "ნორმალური", baseWeight: 1, tags: ["homestyle", "supra"], icon: "mtsvadi",
      venue: { cats: ["georgian"], names: [] }, search: "ჩაქაფული" }),
  D({ slug: "chakhokhbili", name: "ჩახოხბილი", category: "კერძი", cuisine: "ქართული", price: 2, spicy: 1, vegetarian: false, vegan: false,
      meals: ["სადილი", "ვახშამი"], heaviness: "ნორმალური", baseWeight: 1, tags: ["homestyle"], icon: "mtsvadi",
      venue: { cats: ["georgian"], names: [] }, search: "ჩახოხბილი" }),
  D({ slug: "lobio", name: "ლობიო ქოთანში", category: "კერძი", cuisine: "ქართული", price: 1, spicy: 0, vegetarian: true, vegan: true,
      meals: ["სადილი", "ვახშამი"], heaviness: "ნორმალური", baseWeight: 2, tags: ["lenten", "homestyle"], icon: "salad",
      venue: { cats: ["georgian"], names: [] }, search: "ლობიო ქოთანში" }),
  D({ slug: "pkhali", name: "ფხალი", category: "სალათი", cuisine: "ქართული", price: 1, spicy: 0, vegetarian: true, vegan: true,
      meals: ["სადილი", "ვახშამი"], heaviness: "მსუბუქი", baseWeight: 1, tags: ["lenten", "supra"], icon: "salad",
      venue: { cats: ["georgian"], names: [] }, search: "ფხალი" }),
  D({ slug: "badrijani", name: "ბადრიჯანი ნიგვზით", category: "სალათი", cuisine: "ქართული", price: 2, spicy: 0, vegetarian: true, vegan: true,
      meals: ["სადილი", "ვახშამი"], heaviness: "მსუბუქი", baseWeight: 1, tags: ["lenten", "supra"], icon: "salad",
      venue: { cats: ["georgian"], names: [] }, search: "ბადრიჯანი ნიგვზით" }),
  D({ slug: "elarji", name: "ელარჯი", category: "კერძი", cuisine: "ქართული", price: 1, spicy: 1, vegetarian: true, vegan: false,
      meals: ["სადილი", "ვახშამი"], heaviness: "მძიმე", baseWeight: 1, tags: ["regional"], icon: "khachapuri",
      venue: { cats: ["georgian"], names: ["მეგრ", "megrel", "samegrelo"] }, search: "ელარჯი" }),
  D({ slug: "kubdari", name: "კუბდარი", category: "ცომეული", cuisine: "ქართული", price: 2, spicy: 1, vegetarian: false, vegan: false,
      meals: ["სადილი", "ვახშამი"], heaviness: "მძიმე", baseWeight: 1, tags: ["regional", "bakery"], icon: "khachapuri",
      venue: { cats: ["georgian"], names: ["სვან", "svan"] }, search: "კუბდარი" }),
  D({ slug: "ojakhuri", name: "ოჯახური", category: "ხორცი", cuisine: "ქართული", price: 2, spicy: 0, vegetarian: false, vegan: false,
      meals: ["სადილი", "ვახშამი"], heaviness: "მძიმე", baseWeight: 2, tags: ["homestyle", "supra"], icon: "mtsvadi",
      venue: { cats: ["georgian"], names: [] }, search: "ოჯახური" }),
  D({ slug: "ostri", name: "ოსტრი", category: "ხორცი", cuisine: "ქართული", price: 2, spicy: 2, vegetarian: false, vegan: false,
      meals: ["სადილი", "ვახშამი"], heaviness: "მძიმე", baseWeight: 1, tags: ["homestyle"], icon: "mtsvadi",
      venue: { cats: ["georgian"], names: [] }, search: "ოსტრი" }),
  D({ slug: "kupati", name: "კუპატი", category: "ხორცი", cuisine: "ქართული", price: 2, spicy: 2, vegetarian: false, vegan: false,
      meals: ["სადილი", "ვახშამი"], heaviness: "მძიმე", baseWeight: 1, tags: ["regional", "grill"], icon: "mtsvadi",
      venue: { cats: ["georgian", "barbecue"], names: ["მეგრ", "megrel"] }, search: "კუპატი" }),
  D({ slug: "khashi", name: "ხაში", category: "კერძი", cuisine: "ქართული", price: 1, spicy: 0, vegetarian: false, vegan: false,
      meals: ["საუზმე"], heaviness: "მძიმე", baseWeight: 1, tags: ["homestyle"], icon: "khinkali",
      venue: { cats: ["georgian"], names: ["ხაშ", "khash"] }, search: "ხაში" }),
  D({ slug: "burger", name: "ბურგერი", category: "სტრიტფუდი", cuisine: "სხვა", price: 2, spicy: 0, vegetarian: false, vegan: false,
      meals: ["სადილი", "ვახშამი", "ღამე"], heaviness: "მძიმე", baseWeight: 2, tags: ["fast"], icon: "shawarma",
      venue: { cats: ["burger"], names: ["burger", "ბურგ"] }, search: "ბურგერი" }),
  D({ slug: "wok-ramen", name: "ვოკი / რამენი", category: "კერძი", cuisine: "აზიური", price: 2, spicy: 1, vegetarian: false, vegan: false,
      meals: ["სადილი", "ვახშამი"], heaviness: "ნორმალური", baseWeight: 2, tags: ["fast"], icon: "sushi",
      venue: { cats: ["ramen", "noodle", "chinese", "thai", "asian", "korean", "vietnamese"], names: ["wok", "ვოკ", "ramen", "noodle"] }, search: "ვოკი რამენი" }),
  D({ slug: "curry", name: "ინდური კარი", category: "კერძი", cuisine: "სხვა", price: 2, spicy: 2, vegetarian: true, vegan: false,
      meals: ["სადილი", "ვახშამი"], heaviness: "ნორმალური", baseWeight: 1, tags: [], icon: "mascot",
      venue: { cats: ["indian", "pakistani", "nepal"], names: ["india", "masala", "curry"] }, search: "ინდური რესტორანი" }),
  D({ slug: "tacos", name: "ტაკო", category: "სტრიტფუდი", cuisine: "სხვა", price: 2, spicy: 1, vegetarian: false, vegan: false,
      meals: ["სადილი", "ვახშამი", "ღამე"], heaviness: "ნორმალური", baseWeight: 1, tags: ["fast"], icon: "shawarma",
      venue: { cats: ["mexican", "taco"], names: ["taco", "mexic", "მექსიკ"] }, search: "ტაკო" }),
  D({ slug: "pasta", name: "პასტა", category: "კერძი", cuisine: "იტალიური", price: 2, spicy: 0, vegetarian: true, vegan: false,
      meals: ["სადილი", "ვახშამი"], heaviness: "ნორმალური", baseWeight: 2, tags: [], icon: "pizza",
      venue: { cats: ["italian", "pasta"], names: ["pasta", "trattoria", "პასტ"] }, search: "პასტა" }),
  D({ slug: "brunch", name: "ბრანჩი", category: "საუზმე", cuisine: "სხვა", price: 2, spicy: 0, vegetarian: true, vegan: false,
      meals: ["საუზმე"], heaviness: "ნორმალური", baseWeight: 2, tags: ["brunch"], icon: "mascot",
      venue: { cats: ["breakfast", "brunch", "cafe"], names: ["brunch", "ბრანჩ", "breakfast"] }, search: "ბრანჩი" }),
  D({ slug: "dessert", name: "ნამცხვარი", category: "დესერტი", cuisine: "სხვა", price: 1, spicy: 0, vegetarian: true, vegan: false,
      meals: ["საუზმე", "სადილი", "ვახშამი", "ღამე"], heaviness: "ნორმალური", baseWeight: 2, tags: ["brunch"], icon: "mascot",
      venue: { cats: ["dessert", "pastry", "patisserie", "cake", "ice_cream", "bakery"], names: ["cake", "dessert", "ნამცხ", "ტკბ"] }, search: "ნამცხვარი" }),
  D({ slug: "falafel", name: "ფალაფელი", category: "სტრიტფუდი", cuisine: "ახლოაღმოსავლური", price: 1, spicy: 0, vegetarian: true, vegan: true,
      meals: ["სადილი", "ვახშამი"], heaviness: "ნორმალური", baseWeight: 1, tags: ["fast", "lenten"], icon: "shawarma",
      venue: { cats: ["falafel", "middle_eastern", "vegan"], names: ["falafel", "ფალაფ"] }, search: "ფალაფელი" }),
];

const slugs = new Set(DISHES.map((d) => d.slug));
if (slugs.size !== DISHES.length) throw new Error("catalog: duplicate dish slug");
