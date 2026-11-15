/**
 * File:        lib/quiz.ts
 * Application: რა ვჭამოთ? (WTI)
 * Author:      Sandro Germanishvili
 * Date:        2026-11-15
 * Version:     v1.0 — first persona quiz: 12 personas, 7 questions × 4 answers
 * Description: Persona quiz data + pure scoring function.
 *              Each answer gives (a) points to 1–2 personas and (b) optional
 *              "signals" that pre-fill the filter panel and tune wheel weights.
 *              No UI, no storage, no randomness — tested by scripts/simulate-quiz.ts.
 */

export const PERSONA_IDS = [
  "tamada", "khinkali", "bakery", "grandma", "green", "spice",
  "mtsvadi", "shawarma", "sushi", "lunch", "brunch", "world",
] as const;
export type PersonaId = (typeof PERSONA_IDS)[number];

/** What one answer tells us about filters/weights. One question owns each key. */
export type Signals = {
  priceMax?: 1 | 2 | 3;        // ₾ / ₾₾ / ₾₾₾
  spice?: 0 | 1 | 2;           // soft: 0 → spicy=2 ×0.3, 2 → spicy≥1 ×1.5
  vegetarian?: true;           // hard filter
  lenten?: true;               // soft: vegan / მარხვის კერძები ×1.5
  light?: true;                // მსუბუქი ×1.4, მძიმე ×0.6
  fast?: true;                 // "სწრაფი" chip
  novelty?: true;              // flatten base_weight, non-Georgian ×1.3
};

export type Answer = {
  id: string;
  label: string;
  points: Partial<Record<PersonaId, number>>;
  signals?: Signals;
};
export type Question = { id: string; text: string; answers: [Answer, Answer, Answer, Answer] };

export const QUESTIONS: Question[] = [
  { id: "q1", text: "კვირა დილაა. რით იწყებ?", answers: [
    { id: "q1a", label: "ცხელი ლობიანი საცხობიდან", points: { bakery: 3, grandma: 1 } },
    { id: "q1b", label: "ბრანჩი კაფეში, ყავით", points: { brunch: 3, lunch: 1 } },
    { id: "q1c", label: "ხაში — წუხანდელი სუფრის მერე", points: { tamada: 3, khinkali: 1 } },
    { id: "q1d", label: "ბაზარი, მერე სახლში ვამზადებთ", points: { grandma: 3, green: 1 } },
  ]},
  { id: "q2", text: "მეგობრები იკრიბებით. სად?", answers: [
    { id: "q2a", label: "ხინკლის სახლში, ლუდით", points: { khinkali: 3, tamada: 1 } },
    { id: "q2b", label: "გრძელ სუფრასთან, სადღეგრძელოებით", points: { tamada: 3, grandma: 1 } },
    { id: "q2c", label: "აგარაკზე, მწვადი ნაკვერჩხალზე", points: { mtsvadi: 3, tamada: 1 } },
    { id: "q2d", label: "ახალ ადგილას, სადაც ჯერ არ ვყოფილვართ", points: { world: 3, sushi: 1 }, signals: { novelty: true } },
  ]},
  { id: "q3", text: "სამუშაო დღე, 13:00. ლანჩი?", answers: [
    { id: "q3a", label: "ბიზნეს-ლანჩი ახლოს, სწრაფად", points: { lunch: 3, grandma: 1 }, signals: { fast: true } },
    { id: "q3b", label: "სუშის ან ვოკის სეტი მთელ გუნდზე", points: { sushi: 3, world: 1 } },
    { id: "q3c", label: "მეგრული სადილი, აჯიკით", points: { spice: 3, grandma: 1 } },
    { id: "q3d", label: "ლობიანი ხელში და გავიქეცი", points: { bakery: 3, shawarma: 1 }, signals: { fast: true } },
  ]},
  { id: "q4", text: "აჯიკა მაგიდაზეა. შენ?", answers: [
    { id: "q4a", label: "ყველაფერს ვუსვამ, პურსაც", points: { spice: 3, mtsvadi: 1 }, signals: { spice: 2 } },
    { id: "q4b", label: "ტაილანდური ან ინდური ცხარე მირჩევნია", points: { world: 2, spice: 2 }, signals: { spice: 2 } },
    { id: "q4c", label: "ცოტას, გემოსთვის", points: { tamada: 1, khinkali: 1 }, signals: { spice: 1 } },
    { id: "q4d", label: "ცხარე არ მიყვარს", points: { brunch: 1, lunch: 1 }, signals: { spice: 0 } },
  ]},
  { id: "q5", text: "რომელია შენზე?", answers: [
    { id: "q5a", label: "მარხვაშიც ვიცი, რა ვჭამო: ლობიო, ფხალი, მჭადი", points: { green: 3, grandma: 1 }, signals: { lenten: true } },
    { id: "q5b", label: "ხორცს არ ვჭამ", points: { green: 4 }, signals: { vegetarian: true } },
    { id: "q5c", label: "ხორცის გარეშე სადილი სადილი არაა", points: { mtsvadi: 3, khinkali: 1 } },
    { id: "q5d", label: "მთავარია, მსუბუქი იყოს", points: { lunch: 3, green: 1 }, signals: { light: true } },
  ]},
  { id: "q6", text: "ერთ ჩვეულებრივ ჭამაზე რამდენს ხარჯავ?", answers: [
    { id: "q6a", label: "15 ₾-მდე", points: { shawarma: 3, bakery: 1 }, signals: { priceMax: 1 } },
    { id: "q6b", label: "15–35 ₾", points: { grandma: 2, lunch: 1, khinkali: 1 }, signals: { priceMax: 2 } },
    { id: "q6c", label: "35–60 ₾", points: { sushi: 2, brunch: 2 }, signals: { priceMax: 3 } },
    { id: "q6d", label: "თუ ღირს, ფასს არ ვუყურებ", points: { tamada: 2, world: 2 }, signals: { priceMax: 3 } },
  ]},
  { id: "q7", text: "შუაღამეა და მოგშივდა.", answers: [
    { id: "q7a", label: "შაურმა, ორმაგი ცხარე სოუსით", points: { shawarma: 3, spice: 1 } },
    { id: "q7b", label: "სუშის ვუკვეთავ", points: { sushi: 2, world: 2 } },
    { id: "q7c", label: "ღამის ხინკალი — წმინდა საქმეა", points: { khinkali: 3, tamada: 1 } },
    { id: "q7d", label: "მაცივარში ნამცხვარი მელოდება", points: { brunch: 3, green: 1 } },
  ]},
];

export type QuizResult = {
  persona: PersonaId;
  runnerUp: PersonaId;
  scores: Record<PersonaId, number>;
  signals: Signals;
};

/**
 * answerIds: exactly one answer id per question, in question order.
 * Throws on bad input — a half-filled quiz must never produce a persona.
 * Blocked: personas that contradict hard signals are skipped.
 * Tie rule: higher score → more "primary" hits (≥3 pts) → last question's primary wins
 * (q7 → q2 are identity questions, so we walk answers backwards).
 */
export function scoreQuiz(answerIds: string[]): QuizResult {
  if (answerIds.length !== QUESTIONS.length) {
    throw new Error(`scoreQuiz: expected ${QUESTIONS.length} answers, got ${answerIds.length}`);
  }
  const scores = Object.fromEntries(PERSONA_IDS.map((p) => [p, 0])) as Record<PersonaId, number>;
  const primaries = Object.fromEntries(PERSONA_IDS.map((p) => [p, 0])) as Record<PersonaId, number>;
  const signals: Signals = {};
  const picked: Answer[] = [];

  QUESTIONS.forEach((q, i) => {
    const a = q.answers.find((x) => x.id === answerIds[i]);
    if (!a) throw new Error(`scoreQuiz: "${answerIds[i]}" is not an answer of ${q.id}`);
    picked.push(a);
    for (const [p, pts] of Object.entries(a.points) as [PersonaId, number][]) {
      scores[p] += pts;
      if (pts >= 3) primaries[p] += 1;
    }
    Object.assign(signals, a.signals);
  });

  const lastPrimaryIndex = (p: PersonaId) =>
    picked.findLastIndex((a) => (a.points[p] ?? 0) >= 2);

  // A persona must never contradict a hard filter (vegetarian ≠ "მწვადის მეფე").
  const blocked = new Set<PersonaId>([
    ...(signals.vegetarian ? (["mtsvadi", "shawarma"] as const) : []),
    ...(signals.spice === 0 ? (["spice"] as const) : []),
  ]);
  const ranked = PERSONA_IDS.filter((p) => !blocked.has(p)).sort((a, b) =>
    scores[b] - scores[a] ||
    primaries[b] - primaries[a] ||
    lastPrimaryIndex(b) - lastPrimaryIndex(a));

  return { persona: ranked[0], runnerUp: ranked[1], scores, signals };
}
