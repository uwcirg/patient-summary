import { describe, it, expect } from "vitest";
import QuestionnaireScoringBuilder from "../../models/resultBuilders/QuestionnaireScoringBuilder";

const mkQR = ({ id, questionnaire, authored, status = "completed", items = [] }) => ({
  resourceType: "QuestionnaireResponse",
  id,
  status,
  questionnaire,
  authored,
  item: items,
  meta: { lastUpdated: authored },
});
const mkQ = ({ id, url, name, item = [] }) => ({ resourceType: "Questionnaire", id, url, name, item });

const Q = mkQ({
  id: "phq-9",
  url: "http://loinc.org/phq9",
  name: "PHQ-9",
  item: [{ linkId: "q1", text: "t", type: "choice", answerOption: [{ valueCoding: { code: "LA6568-5" } }] }],
});
const QR1 = mkQR({
  id: "r1",
  questionnaire: Q.url,
  authored: "2021-01-01T00:00:00Z",
  items: [{ linkId: "q1", answer: [{ valueCoding: { code: "LA6568-5" } }] }],
});
const QR0 = mkQR({
  id: "r0",
  questionnaire: Q.url,
  authored: "2020-01-01T00:00:00Z",
  items: [{ linkId: "q1", answer: [{ valueCoding: { code: "LA6569-3" } }] }],
});

const BUNDLE = { resourceType: "Bundle", entry: [{ resource: Q }, { resource: QR0 }, { resource: QR1 }] };

describe("QuestionnaireScoringBuilder", () => {
  it("uses patientBundle by default and sorts newest-first", () => {
    const b = new QuestionnaireScoringBuilder({ questionnaireUrl: Q.url, matchMode: "strict" }, BUNDLE);
    const qrs = b.fromBundleForThisQuestionnaire();
    expect(qrs.map((x) => x.id)).toEqual(["r1", "r0"]);
  });

  it("override bundle narrows results", async () => {
    const b = new QuestionnaireScoringBuilder({ questionnaireUrl: Q.url, matchMode: "strict" }, BUNDLE);
    const override = { resourceType: "Bundle", entry: [{ resource: Q }, { resource: QR0 }] };
    const qrs = b.fromBundleForThisQuestionnaire({ completedOnly: true }, override);
    expect(qrs.map((x) => x.id)).toEqual(["r0"]);

    const summaries = await b.summariesFromBundleAsync(null, {}, override);
    expect(summaries?.responses?.map((s) => s.id)).toEqual(["r0"]);
  });

  it("index resolves Questionnaire", () => {
    const b = new QuestionnaireScoringBuilder({ questionnaireId: Q.id, questionnaireUrl: Q.url, matchMode: "strict" }, BUNDLE);
    const idx = b.indexQuestionnairesInBundle();
    expect(idx[Q.url]).toBeDefined();
    expect(idx[Q.id]).toBeDefined();
  });
});
