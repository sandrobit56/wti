/**
 * File:        lib/catalog.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v2.1 — 58 dishes (mushroom + cheese khinkali); price ranges in GEL; categories taken from the
 *              real Tbilisi Overture import (2,458 venues)
 * Description: The dish catalog. Plain typed data — the compiler validates it.
 *   venue.cats  substrings of Overture taxonomy ids present in data/venues.json
 *               (e.g. "sandwich" → "sandwich_shop", "japanese" → "japanese_restaurant")
 *   venue.names substrings of venue names, incl. Latin transliterations
 *   priceGel    typical price of ONE portion in Tbilisi, [min, max] ₾ — editorial
 *               estimate until inspectors record real menu prices
 * Data notes (learned from the first import):
 *   - Meta tags most Georgian restaurants ALSO as "middle_eastern_restaurant":
 *     never use "middle_eastern" as a cat.
 *   - Many khinkali houses are plain "restaurant": names carry "xinkl"/"hinkal".
 */

export type Category = "ცომეული" | "ხორცი" | "ზღვის" | "სალათი" | "სტრიტფუდი" | "დესერტი" | "საუზმე" | "კერძი" | "წვნიანი";
export type Cuisine = "ქართული" | "აზიური" | "იტალიური" | "ახლოაღმოსავლური" | "ამერიკული" | "ლათინური" | "ინდური" | "ევროპული";
export type MealTime = "საუზმე" | "სადილი" | "ვახშამი" | "ღამე";
export type Heaviness = "მსუბუქი" | "ნორმალური" | "მძიმე";
export type Tag = "supra" | "dumpling" | "bakery" | "homestyle" | "regional" | "lenten" | "grill" | "bowl" | "brunch" | "fast";
export type IconName =
  | "khinkali" | "khachapuri" | "lobiani" | "mtsvadi" | "shawarma" | "pizza" | "sushi" | "salad"
  | "sandwich" | "taco" | "noodles" | "soup" | "burger" | "cake" | "mascot";

export type Dish = {
  slug: string;
  name: string;
  category: Category;
  cuisine: Cuisine;
  priceGel: [number, number];
  spicy: 0 | 1 | 2;
  vegetarian: boolean;
  vegan: boolean;
  meals: MealTime[];
  heaviness: Heaviness;
  baseWeight: 1 | 2 | 3;
  tags: Tag[];
  icon: IconName;
  venue: { cats: string[]; names: string[] };
  search: string;
};

export type PriceBand = 1 | 2 | 3;

/** ₾ ≤ 15 · ₾₾ 15–35 · ₾₾₾ 35+ — by the middle of the range. */
export function priceBand(d: Dish): PriceBand {
  const mid = (d.priceGel[0] + d.priceGel[1]) / 2;
  return mid <= 15 ? 1 : mid <= 35 ? 2 : 3;
}

const ALL: MealTime[] = ["სადილი", "ვახშამი"];
const LATE: MealTime[] = ["სადილი", "ვახშამი", "ღამე"];
const GEO = ["georgian"];

type In = Omit<Dish, "meals" | "baseWeight" | "tags" | "spicy" | "vegetarian" | "vegan" | "heaviness"> &
  Partial<Pick<Dish, "meals" | "baseWeight" | "tags" | "spicy" | "vegetarian" | "vegan" | "heaviness">>;
const D = (d: In): Dish => ({
  meals: ALL, baseWeight: 1, tags: [], spicy: 0, vegetarian: false, vegan: false, heaviness: "ნორმალური", ...d,
});

export const DISHES: Dish[] = [
  // ── ქართული ───────────────────────────────────────────────
  D({ slug: "khinkali", name: "ხინკალი", category: "ხორცი", cuisine: "ქართული", priceGel: [8, 18], meals: LATE, heaviness: "მძიმე", baseWeight: 3, tags: ["dumpling", "supra"], icon: "khinkali", venue: { cats: GEO, names: ["ხინკ", "hinkal", "xinkl"] }, search: "ხინკალი" }),
  D({ slug: "khinkali-mushroom", name: "სოკოს ხინკალი", category: "კერძი", cuisine: "ქართული", priceGel: [8, 16], vegetarian: true, vegan: true, meals: LATE, tags: ["dumpling", "lenten"], icon: "khinkali", venue: { cats: GEO, names: ["ხინკ", "hinkal", "xinkl"] }, search: "სოკოს ხინკალი" }),
  D({ slug: "khinkali-cheese", name: "ყველის ხინკალი", category: "კერძი", cuisine: "ქართული", priceGel: [8, 16], vegetarian: true, meals: LATE, heaviness: "მძიმე", tags: ["dumpling"], icon: "khinkali", venue: { cats: GEO, names: ["ხინკ", "hinkal", "xinkl"] }, search: "ყველის ხინკალი" }),
  D({ slug: "khachapuri-imeruli", name: "იმერული ხაჭაპური", category: "ცომეული", cuisine: "ქართული", priceGel: [12, 22], vegetarian: true, meals: ["საუზმე", "სადილი", "ვახშამი"], heaviness: "მძიმე", baseWeight: 3, tags: ["bakery", "supra"], icon: "khachapuri", venue: { cats: [...GEO, "bakery"], names: ["ხაჭაპ", "achap"] }, search: "იმერული ხაჭაპური" }),
  D({ slug: "khachapuri-adjaruli", name: "აჭარული ხაჭაპური", category: "ცომეული", cuisine: "ქართული", priceGel: [15, 30], vegetarian: true, heaviness: "მძიმე", baseWeight: 3, tags: ["regional"], icon: "khachapuri", venue: { cats: GEO, names: ["აჭარ", "adjar", "achar", "ხაჭაპ", "achap"] }, search: "აჭარული ხაჭაპური" }),
  D({ slug: "khachapuri-megruli", name: "მეგრული ხაჭაპური", category: "ცომეული", cuisine: "ქართული", priceGel: [15, 28], vegetarian: true, heaviness: "მძიმე", baseWeight: 2, tags: ["regional", "supra"], icon: "khachapuri", venue: { cats: GEO, names: ["მეგრ", "megrel", "ხაჭაპ", "achap"] }, search: "მეგრული ხაჭაპური" }),
  D({ slug: "lobiani", name: "ლობიანი", category: "ცომეული", cuisine: "ქართული", priceGel: [4, 12], vegetarian: true, vegan: true, meals: ["საუზმე", "სადილი"], baseWeight: 2, tags: ["bakery", "lenten", "fast"], icon: "lobiani", venue: { cats: ["bakery"], names: ["საცხობ", "პურ", "bakery", "lobian", "tone"] }, search: "ლობიანი" }),
  D({ slug: "kubdari", name: "კუბდარი", category: "ცომეული", cuisine: "ქართული", priceGel: [15, 28], spicy: 1, heaviness: "მძიმე", tags: ["regional", "bakery"], icon: "lobiani", venue: { cats: GEO, names: ["სვან", "svan"] }, search: "კუბდარი" }),
  D({ slug: "mtsvadi", name: "მწვადი", category: "ხორცი", cuisine: "ქართული", priceGel: [18, 35], heaviness: "მძიმე", baseWeight: 3, tags: ["grill", "supra"], icon: "mtsvadi", venue: { cats: ["barbecue", "grill", "meat_restaurant", ...GEO], names: ["მწვად", "mtsvad", "mcvad", "grill"] }, search: "მწვადი" }),
  D({ slug: "kupati", name: "კუპატი", category: "ხორცი", cuisine: "ქართული", priceGel: [12, 22], spicy: 2, heaviness: "მძიმე", tags: ["regional", "grill"], icon: "mtsvadi", venue: { cats: [...GEO, "barbecue"], names: ["მეგრ", "megrel"] }, search: "კუპატი" }),
  D({ slug: "shkmeruli", name: "შქმერული", category: "ხორცი", cuisine: "ქართული", priceGel: [25, 45], heaviness: "მძიმე", baseWeight: 2, tags: ["regional", "supra"], icon: "soup", venue: { cats: GEO, names: ["შქმერ", "shkmer"] }, search: "შქმერული" }),
  D({ slug: "chakapuli", name: "ჩაქაფული", category: "კერძი", cuisine: "ქართული", priceGel: [18, 30], tags: ["homestyle", "supra"], icon: "soup", venue: { cats: GEO, names: [] }, search: "ჩაქაფული" }),
  D({ slug: "chakhokhbili", name: "ჩახოხბილი", category: "კერძი", cuisine: "ქართული", priceGel: [15, 28], spicy: 1, tags: ["homestyle"], icon: "soup", venue: { cats: GEO, names: [] }, search: "ჩახოხბილი" }),
  D({ slug: "chashushuli", name: "ჩაშუშული", category: "კერძი", cuisine: "ქართული", priceGel: [15, 28], spicy: 1, tags: ["homestyle"], icon: "soup", venue: { cats: GEO, names: [] }, search: "ჩაშუშული" }),
  D({ slug: "ojakhuri", name: "ოჯახური", category: "ხორცი", cuisine: "ქართული", priceGel: [15, 28], heaviness: "მძიმე", baseWeight: 2, tags: ["homestyle", "supra"], icon: "mtsvadi", venue: { cats: GEO, names: [] }, search: "ოჯახური" }),
  D({ slug: "ostri", name: "ოსტრი", category: "ხორცი", cuisine: "ქართული", priceGel: [15, 25], spicy: 2, heaviness: "მძიმე", tags: ["homestyle"], icon: "soup", venue: { cats: GEO, names: [] }, search: "ოსტრი" }),
  D({ slug: "kharcho", name: "ხარჩო", category: "წვნიანი", cuisine: "ქართული", priceGel: [12, 22], spicy: 2, tags: ["homestyle"], icon: "soup", venue: { cats: [...GEO, "soup"], names: [] }, search: "ხარჩო" }),
  D({ slug: "chikhirtma", name: "ჩიხირთმა", category: "წვნიანი", cuisine: "ქართული", priceGel: [8, 15], meals: ["საუზმე", "სადილი", "ვახშამი"], tags: ["homestyle"], icon: "soup", venue: { cats: [...GEO, "soup"], names: [] }, search: "ჩიხირთმა" }),
  D({ slug: "khashi", name: "ხაში", category: "წვნიანი", cuisine: "ქართული", priceGel: [8, 15], meals: ["საუზმე"], heaviness: "მძიმე", tags: ["homestyle"], icon: "soup", venue: { cats: GEO, names: ["ხაშ", "khash", "xash"] }, search: "ხაში" }),
  D({ slug: "lobio", name: "ლობიო ქოთანში", category: "კერძი", cuisine: "ქართული", priceGel: [8, 15], vegetarian: true, vegan: true, baseWeight: 2, tags: ["lenten", "homestyle"], icon: "soup", venue: { cats: GEO, names: [] }, search: "ლობიო ქოთანში" }),
  D({ slug: "pkhali", name: "ფხალი", category: "სალათი", cuisine: "ქართული", priceGel: [10, 18], vegetarian: true, vegan: true, heaviness: "მსუბუქი", tags: ["lenten", "supra"], icon: "salad", venue: { cats: GEO, names: [] }, search: "ფხალი" }),
  D({ slug: "badrijani", name: "ბადრიჯანი ნიგვზით", category: "სალათი", cuisine: "ქართული", priceGel: [12, 20], vegetarian: true, vegan: true, heaviness: "მსუბუქი", tags: ["lenten", "supra"], icon: "salad", venue: { cats: GEO, names: [] }, search: "ბადრიჯანი ნიგვზით" }),
  D({ slug: "elarji", name: "ელარჯი", category: "კერძი", cuisine: "ქართული", priceGel: [10, 18], spicy: 1, vegetarian: true, heaviness: "მძიმე", tags: ["regional"], icon: "khachapuri", venue: { cats: GEO, names: ["მეგრ", "megrel"] }, search: "ელარჯი" }),
  D({ slug: "mchadi-cheese", name: "მჭადი ყველით", category: "ცომეული", cuisine: "ქართული", priceGel: [6, 14], vegetarian: true, tags: ["homestyle"], icon: "lobiani", venue: { cats: GEO, names: [] }, search: "მჭადი ყველით" }),
  D({ slug: "tolma", name: "ტოლმა", category: "კერძი", cuisine: "ქართული", priceGel: [12, 22], tags: ["homestyle"], icon: "salad", venue: { cats: GEO, names: [] }, search: "ტოლმა" }),
  D({ slug: "satsivi", name: "საცივი", category: "კერძი", cuisine: "ქართული", priceGel: [18, 35], tags: ["supra"], icon: "soup", venue: { cats: GEO, names: [] }, search: "საცივი" }),

  // ── სტრიტფუდი / სწრაფი ───────────────────────────────────
  D({ slug: "shawarma", name: "შაურმა", category: "სტრიტფუდი", cuisine: "ახლოაღმოსავლური", priceGel: [8, 15], spicy: 1, meals: LATE, heaviness: "მძიმე", baseWeight: 3, tags: ["fast"], icon: "shawarma", venue: { cats: ["shawarma"], names: ["შაურმ", "shaurm", "shawarm"] }, search: "შაურმა" }),
  D({ slug: "doner", name: "დონერი", category: "სტრიტფუდი", cuisine: "ახლოაღმოსავლური", priceGel: [10, 18], meals: LATE, heaviness: "მძიმე", tags: ["fast"], icon: "shawarma", venue: { cats: ["doner", "kebab", "turkish"], names: ["doner", "döner", "დონერ", "kebab", "ქაბაბ"] }, search: "დონერი" }),
  D({ slug: "lahmacun", name: "ლაჰმაჯუნი / პიდე", category: "ცომეული", cuisine: "ახლოაღმოსავლური", priceGel: [8, 18], tags: ["fast"], icon: "pizza", venue: { cats: ["turkish"], names: ["lahmac", "pide", "ლაჰმაჯ", "türk", "turk"] }, search: "ლაჰმაჯუნი" }),
  D({ slug: "falafel", name: "ფალაფელი", category: "სტრიტფუდი", cuisine: "ახლოაღმოსავლური", priceGel: [8, 14], vegetarian: true, vegan: true, tags: ["fast", "lenten"], icon: "shawarma", venue: { cats: ["falafel", "lebanese", "israeli", "kosher"], names: ["falafel", "ფალაფ", "beirut", "saj"] }, search: "ფალაფელი" }),
  D({ slug: "hummus", name: "ჰუმუსი", category: "სალათი", cuisine: "ახლოაღმოსავლური", priceGel: [10, 20], vegetarian: true, vegan: true, heaviness: "მსუბუქი", tags: ["lenten"], icon: "salad", venue: { cats: ["lebanese", "israeli", "persian", "kosher", "greek"], names: ["hummus", "ჰუმუს", "beirut"] }, search: "ჰუმუსი" }),
  D({ slug: "burger", name: "ბურგერი", category: "სტრიტფუდი", cuisine: "ამერიკული", priceGel: [15, 30], meals: LATE, heaviness: "მძიმე", baseWeight: 2, tags: ["fast"], icon: "burger", venue: { cats: ["burger", "american", "diner"], names: ["burger", "ბურგ"] }, search: "ბურგერი" }),
  D({ slug: "fried-chicken", name: "შემწვარი ქათამი / ფრთები", category: "სტრიტფუდი", cuisine: "ამერიკული", priceGel: [12, 25], spicy: 1, meals: LATE, heaviness: "მძიმე", tags: ["fast"], icon: "burger", venue: { cats: ["chicken"], names: ["chicken", "wings", "kfc", "ქათამ"] }, search: "ქათმის ფრთები" }),
  D({ slug: "hot-dog", name: "ჰოთდოგი", category: "სტრიტფუდი", cuisine: "ამერიკული", priceGel: [6, 12], meals: LATE, tags: ["fast"], icon: "sandwich", venue: { cats: ["hot_dog"], names: ["hot dog", "hotdog", "ჰოთდოგ", "ჰოტ-დოგ"] }, search: "ჰოთდოგი" }),
  D({ slug: "sandwich", name: "სენდვიჩი", category: "სტრიტფუდი", cuisine: "ევროპული", priceGel: [10, 20], meals: ["საუზმე", "სადილი"], baseWeight: 2, tags: ["fast"], icon: "sandwich", venue: { cats: ["sandwich", "deli"], names: ["sandwich", "სენდვიჩ", "subway", "panini", "bagel"] }, search: "სენდვიჩი" }),
  D({ slug: "pizza", name: "პიცა", category: "სტრიტფუდი", cuisine: "იტალიური", priceGel: [15, 35], vegetarian: true, meals: LATE, heaviness: "მძიმე", baseWeight: 2, tags: ["fast"], icon: "pizza", venue: { cats: ["pizza"], names: ["pizza", "პიც"] }, search: "პიცა" }),

  // ── აზიური ───────────────────────────────────────────────
  D({ slug: "sushi", name: "სუში", category: "ზღვის", cuisine: "აზიური", priceGel: [25, 60], heaviness: "მსუბუქი", baseWeight: 2, icon: "sushi", venue: { cats: ["sushi", "japanese"], names: ["sushi", "სუშ"] }, search: "სუში" }),
  D({ slug: "ramen", name: "რამენი", category: "წვნიანი", cuisine: "აზიური", priceGel: [20, 35], spicy: 1, icon: "noodles", venue: { cats: ["ramen", "japanese"], names: ["ramen", "რამენ"] }, search: "რამენი" }),
  D({ slug: "wok", name: "ვოკი / ნუდლი", category: "კერძი", cuisine: "აზიური", priceGel: [15, 28], spicy: 1, baseWeight: 2, tags: ["fast"], icon: "noodles", venue: { cats: ["chinese", "east_asian", "asian", "noodle"], names: ["wok", "ვოკ", "noodle", "ნუდლ"] }, search: "ვოკი" }),
  D({ slug: "dumplings-asian", name: "გიოზა / დიმსამი", category: "კერძი", cuisine: "აზიური", priceGel: [15, 28], tags: ["dumpling"], icon: "khinkali", venue: { cats: ["chinese", "japanese", "dim_sum"], names: ["dumpling", "gyoza", "dim sum", "გიოზ"] }, search: "გიოზა" }),
  D({ slug: "pad-thai", name: "ფად თაი", category: "კერძი", cuisine: "აზიური", priceGel: [20, 35], spicy: 1, icon: "noodles", venue: { cats: ["thai", "southeast_asian"], names: ["thai", "ტაი", "ტაილანდ"] }, search: "ფად თაი" }),
  D({ slug: "pho", name: "ფო", category: "წვნიანი", cuisine: "აზიური", priceGel: [18, 30], icon: "noodles", venue: { cats: ["vietnamese", "southeast_asian"], names: ["pho", "vietnam", "ვიეტნამ"] }, search: "ფო ვიეტნამური" }),
  D({ slug: "bibimbap", name: "ბიბიმბაპი", category: "კერძი", cuisine: "აზიური", priceGel: [22, 35], spicy: 1, tags: ["bowl"], icon: "salad", venue: { cats: ["korean"], names: ["korea", "კორე", "kimchi", "bibimbap", "seoul"] }, search: "კორეული ბიბიმბაპი" }),
  D({ slug: "korean-chicken", name: "კორეული ქათამი", category: "ხორცი", cuisine: "აზიური", priceGel: [20, 35], spicy: 2, meals: LATE, heaviness: "მძიმე", icon: "burger", venue: { cats: ["korean"], names: ["korea", "კორე", "chimaek", "seoul"] }, search: "კორეული ქათამი" }),
  D({ slug: "poke", name: "პოკე ბოული", category: "სალათი", cuisine: "აზიური", priceGel: [20, 32], heaviness: "მსუბუქი", tags: ["bowl"], icon: "salad", venue: { cats: ["poke", "hawaiian", "health"], names: ["poke", "პოკე", "bowl"] }, search: "პოკე" }),
  D({ slug: "curry", name: "ინდური კარი", category: "კერძი", cuisine: "ინდური", priceGel: [20, 38], spicy: 2, vegetarian: true, icon: "soup", venue: { cats: ["indian", "south_asian", "pakistani", "nepal"], names: ["india", "masala", "curry", "ინდურ"] }, search: "ინდური რესტორანი" }),

  // ── ლათინური ─────────────────────────────────────────────
  D({ slug: "tacos", name: "ტაკო", category: "სტრიტფუდი", cuisine: "ლათინური", priceGel: [12, 25], spicy: 1, meals: LATE, tags: ["fast"], icon: "taco", venue: { cats: ["mexican", "latin_american", "taco"], names: ["taco", "mexic", "მექსიკ", "el chapo"] }, search: "ტაკო" }),
  D({ slug: "burrito", name: "ბურიტო / კესადია", category: "სტრიტფუდი", cuisine: "ლათინური", priceGel: [15, 25], spicy: 1, heaviness: "მძიმე", tags: ["fast"], icon: "taco", venue: { cats: ["mexican", "latin_american"], names: ["burrito", "quesadill", "კესად", "mexic", "მექსიკ"] }, search: "ბურიტო" }),

  // ── იტალიური / ევროპული ──────────────────────────────────
  D({ slug: "pasta", name: "პასტა", category: "კერძი", cuisine: "იტალიური", priceGel: [18, 35], vegetarian: true, baseWeight: 2, icon: "noodles", venue: { cats: ["italian", "pasta"], names: ["pasta", "trattoria", "პასტ"] }, search: "პასტა" }),
  D({ slug: "risotto", name: "რიზოტო", category: "კერძი", cuisine: "იტალიური", priceGel: [25, 42], vegetarian: true, icon: "soup", venue: { cats: ["italian"], names: ["risott", "trattoria"] }, search: "რიზოტო" }),
  D({ slug: "steak", name: "სტეიკი", category: "ხორცი", cuisine: "ევროპული", priceGel: [40, 95], heaviness: "მძიმე", tags: ["grill"], icon: "mtsvadi", venue: { cats: ["steakhouse", "meat_restaurant", "bar_and_grill"], names: ["steak", "სტეიკ"] }, search: "სტეიკი" }),
  D({ slug: "seafood", name: "თევზი / ზღვის პროდუქტი", category: "ზღვის", cuisine: "ევროპული", priceGel: [30, 70], heaviness: "მსუბუქი", icon: "sushi", venue: { cats: ["seafood", "fish"], names: ["fish", "თევზ", "seafood", "oyster"] }, search: "თევზის რესტორანი" }),
  D({ slug: "salad-bowl", name: "სალათი", category: "სალათი", cuisine: "ევროპული", priceGel: [14, 26], vegetarian: true, heaviness: "მსუბუქი", tags: ["bowl", "fast"], icon: "salad", venue: { cats: ["salad", "health", "vegan", "vegetarian", "special_diet"], names: ["salad", "სალათ"] }, search: "სალათი" }),

  // ── საუზმე / ტკბილი ─────────────────────────────────────
  D({ slug: "brunch", name: "ბრანჩი", category: "საუზმე", cuisine: "ევროპული", priceGel: [15, 30], vegetarian: true, meals: ["საუზმე"], baseWeight: 2, tags: ["brunch"], icon: "cake", venue: { cats: ["breakfast", "brunch"], names: ["brunch", "ბრანჩ", "breakfast"] }, search: "ბრანჩი" }),
  D({ slug: "syrniki", name: "სირნიკი / ბლინები", category: "საუზმე", cuisine: "ევროპული", priceGel: [10, 20], vegetarian: true, meals: ["საუზმე"], tags: ["brunch"], icon: "cake", venue: { cats: ["breakfast", "cafe", "coffee_shop"], names: ["syrnik", "pancake", "ბლინ", "სირნიკ"] }, search: "სირნიკი" }),
  D({ slug: "cake", name: "ნამცხვარი და ყავა", category: "დესერტი", cuisine: "ევროპული", priceGel: [8, 18], vegetarian: true, meals: ["საუზმე", "სადილი", "ვახშამი", "ღამე"], baseWeight: 2, tags: ["brunch"], icon: "cake", venue: { cats: ["dessert", "cupcake", "patisserie", "coffee_shop", "cafe"], names: ["cake", "dessert", "ნამცხ", "ტკბ"] }, search: "ნამცხვარი" }),
  D({ slug: "ice-cream", name: "ნაყინი", category: "დესერტი", cuisine: "ევროპული", priceGel: [4, 12], vegetarian: true, meals: ["სადილი", "ვახშამი", "ღამე"], heaviness: "მსუბუქი", icon: "cake", venue: { cats: ["ice_cream", "frozen_yogurt", "gelato"], names: ["gelat", "ice cream", "ნაყინ"] }, search: "ნაყინი" }),
  D({ slug: "donut", name: "დონატი", category: "დესერტი", cuisine: "ამერიკული", priceGel: [3, 9], vegetarian: true, meals: ["საუზმე", "სადილი", "ვახშამი"], tags: ["fast"], icon: "cake", venue: { cats: ["donut"], names: ["donut", "dunkin", "დონატ"] }, search: "დონატი" }),
];

const slugs = new Set(DISHES.map((d) => d.slug));
if (slugs.size !== DISHES.length) throw new Error("catalog: duplicate dish slug");
for (const d of DISHES) {
  if (d.priceGel[0] > d.priceGel[1]) throw new Error(`catalog: bad price range for ${d.slug}`);
  if (d.venue.cats.some((c) => c.includes("middle_eastern"))) throw new Error(`catalog: ${d.slug} uses middle_eastern (mislabelled in Meta data)`);
}
