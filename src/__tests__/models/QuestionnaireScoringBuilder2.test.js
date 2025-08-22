import { describe, it, expect } from "vitest";
import QuestionnaireScoringBuilder from "../../models/resultBuilders/QuestionnaireScoringBuilder";

function makePRNG(seed = 123456789) {
  let s = seed >>> 0;
  return () => (s = (1103515245 * s + 12345) >>> 0) / 0xffffffff;
}

const mkQ = ({ id, url, name, item = [] }) => ({ resourceType: "Questionnaire", id, url, name, item });
const mkQR = ({ id, questionnaire, authored, status = "completed", items = [] }) => ({
  resourceType: "QuestionnaireResponse",
  id,
  status,
  questionnaire,
  authored,
  item: items,
  meta: { lastUpdated: authored },
});

const QUESTION_ITEM = {
  linkId: "q1",
  text: "Feeling down…",
  type: "choice",
  answerOption: [
    { valueCoding: { code: "LA6568-5", display: "Not at all" } },
    { valueCoding: { code: "LA6569-3", display: "Several days" } },
  ],
};

function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildBundle({ count = 25, seed = 7 }) {
  const rnd = makePRNG(seed);
  const base = new Date("2024-01-01T00:00:00Z").getTime();

  const Q = mkQ({ id: "phq-9", url: "http://loinc.org/phq9", name: "PHQ-9", item: [QUESTION_ITEM] });

  const ids = Array.from({ length: count }, (_, i) => `qr-${String(i).padStart(3, "0")}`);
  const times = ids.map((_, i) => new Date(base + i * 86_400_000).toISOString());

  const qrsOrdered = ids.map((id, i) =>
    mkQR({
      id,
      questionnaire: Q.url,
      authored: times[i],
      items: [{ linkId: "q1", answer: [{ valueCoding: { code: rnd() < 0.5 ? "LA6568-5" : "LA6569-3" } }] }],
    }),
  );
  const entry = [{ resource: Q }, ...shuffle(qrsOrdered, rnd).map((r) => ({ resource: r }))];
  const bundle = { resourceType: "Bundle", type: "collection", entry };
  const expected = ids.slice().reverse();
  return { bundle, questionnaire: Q, expectedNewestFirst: expected };
}

describe("QuestionnaireScoringBuilder smoke (randomized, deterministic)", () => {
  it("sync & async paths sort newest-first and respect bundle override", async () => {
    const { bundle, questionnaire, expectedNewestFirst } = buildBundle({ count: 25, seed: 99 });
    const b = new QuestionnaireScoringBuilder({ questionnaireUrl: questionnaire.url, matchMode: "strict" }, bundle);

    const qrs = b.fromBundleForThisQuestionnaire();
    expect(qrs.map((x) => x.id)).toEqual(expectedNewestFirst);

    const summaries = b.summariesFromBundle(questionnaire);
    expect(summaries.responseData.map((s) => s.id)).toEqual(expectedNewestFirst);

    const grouped = await b.summariesByQuestionnaireFromBundleAsync();
    const pack =
      grouped[questionnaire.url] ??
      grouped[`Questionnaire/${questionnaire.id}`] ?? // if your QRs sometimes use this form
      null;
    expect((pack?.responseData ?? []).map((s) => s.id)).toEqual(expectedNewestFirst);

    // override: keep newest 10 only
    const newest10 = new Set(expectedNewestFirst.slice(0, 10));
    const override = {
      resourceType: "Bundle",
      type: "collection",
      entry: bundle.entry.filter(
        (e) => e.resource.resourceType !== "QuestionnaireResponse" || newest10.has(e.resource.id),
      ),
    };
    if (!override.entry.find((e) => e.resource.resourceType === "Questionnaire")) {
      override.entry.unshift({ resource: questionnaire });
    }

    const qrsOv = b.fromBundleForThisQuestionnaire({ completedOnly: true }, override).map((x) => x.id);
    expect(qrsOv).toEqual(expectedNewestFirst.slice(0, 10));

    const summariesOv = await b.summariesFromBundleAsync(questionnaire, {}, override);
    expect(summariesOv?.responseData?.map((s) => s.id)).toEqual(expectedNewestFirst.slice(0, 10));
  });
});
