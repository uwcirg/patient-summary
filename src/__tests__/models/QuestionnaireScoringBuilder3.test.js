import { describe, it, expect } from "vitest";
import QuestionnaireScoringBuilder from "../../models/resultBuilders/QuestionnaireScoringBuilder";
import { severityFromScore, meaningFromSeverity } from "../../models/resultBuilders/helpers";
// ---------- Test helpers ----------
const mkQR = ({ id, questionnaire, authored, status = "completed", items = [], lastUpdated }) => ({
  resourceType: "QuestionnaireResponse",
  id,
  status,
  questionnaire,
  authored: authored ?? null,
  item: items,
  meta: lastUpdated ? { lastUpdated } : undefined,
});

const mkQ = ({ id, url, name, item = [] }) => ({ resourceType: "Questionnaire", id, url, name, item });

const ansCoding = (code, display) => ({ valueCoding: { code, display } });
const ansInteger = (n) => ({ valueInteger: n });

// Questionnaire with answerOption ordinal extension
const mkQuestionnaireWithOrdinal = ({ id = "phq9", linkId = "q1", code = "LA6568-5", ordinal = 0 }) => ({
  resourceType: "Questionnaire",
  id,
  item: [
    {
      linkId,
      type: "choice",
      answerOption: [
        {
          valueCoding: { code },
          extension: [
            {
              url: "http://hl7.org/fhir/StructureDefinition/ordinalValue",
              valueInteger: ordinal,
            },
          ],
        },
      ],
    },
  ],
});

// flatten-friendly QR item
const qrItem = (linkId, answer, text, type = "choice") => ({
  linkId,
  text: text ?? linkId,
  type,
  answer: [answer],
});

// Make a Bundle-like container
const bundleOf = (resources) => ({ resourceType: "Bundle", entry: resources.map((r) => ({ resource: r })) });

// ---------- Tests ----------
describe("QuestionnaireScoringBuilder – newest-first grouping & filtering", () => {
  it("groups QRs by canonical and sorts newest-first by authored then lastUpdated", () => {
    const b = new QuestionnaireScoringBuilder(
      { questionnaireId: "phq9" },
      bundleOf([
        mkQR({ id: "a1", questionnaire: "Questionnaire/phq9", authored: "2025-01-01T00:00:00Z" }),
        mkQR({ id: "a2", questionnaire: "Questionnaire/phq9", authored: "2025-02-01T00:00:00Z" }),
        // missing authored, use lastUpdated
        mkQR({ id: "a3", questionnaire: "Questionnaire/phq9", authored: null, lastUpdated: "2025-03-01T00:00:00Z" }),
        // different canonical key
        mkQR({ id: "b1", questionnaire: "http://loinc.org/phq9", authored: "2024-12-01T00:00:00Z" }),
      ]),
    );

    const grouped = b.fromBundleGrouped({ completedOnly: true });
    // keys should be <id> or canonical URL preserved
    expect(Object.keys(grouped).sort()).toEqual(["http://loinc.org/phq9", "phq9"].sort());

    const phq = grouped["phq9"].map((qr) => qr.id);
    // newest-first considering authored + lastUpdated
    expect(phq).toEqual(["a3", "a2", "a1"]);
  });

  it("filters out non-completed QRs when completedOnly=true", () => {
    const b = new QuestionnaireScoringBuilder(
      { questionnaireId: "phq9" },
      bundleOf([
        mkQR({
          id: "c1",
          questionnaire: "Questionnaire/phq9",
          authored: "2025-01-01T00:00:00Z",
          status: "in-progress",
        }),
        mkQR({ id: "c2", questionnaire: "Questionnaire/phq9", authored: "2025-01-02T00:00:00Z", status: "completed" }),
      ]),
    );
    const grouped = b.fromBundleGrouped({ completedOnly: true });
    expect(grouped["phq9"].map((x) => x.id)).toEqual(["c2"]);
  });
});

describe("QuestionnaireScoringBuilder – resolveQuestionnaireFromIndex (bugfix)", () => {
  it("resolves by id | name | url (including id-only without slash)", () => {
    const q1 = mkQ({ id: "phq9", name: "PHQ-9", url: "http://loinc.org/phq9" });
    const q2 = mkQ({ id: "minicog", name: "MiniCog", url: "http://loinc.org/minicog" });
    const b = new QuestionnaireScoringBuilder({}, bundleOf([q1, q2]));

    const loader = b.makeBundleQuestionnaireLoader();
    expect(loader("phq9")?.id).toBe("phq9");
    expect(loader("Questionnaire/phq9")?.id).toBe("phq9"); // group-by strips to id
    expect(loader("PHQ-9")?.id).toBe("phq9"); // by normalized name
    expect(loader("http://loinc.org/minicog")?.id).toBe("minicog"); // by url
  });
});

describe("QuestionnaireScoringBuilder – scoring", () => {
  it("uses primitive numeric answers directly", () => {
    const q = mkQ({ id: "phq9", item: [{ linkId: "q1", type: "integer" }] });
    const b = new QuestionnaireScoringBuilder({ questionnaireId: "phq9" });
    const flat = [qrItem("q1", ansInteger(3))];

    expect(b.getScoringByResponseItem(q, flat, "q1")).toBe(3);
  });

  it("uses ordinal extension from Questionnaire when answer is coding", () => {
    const q = mkQuestionnaireWithOrdinal({ id: "phq9", linkId: "q1", code: "LA6568-5", ordinal: 2 });
    const b = new QuestionnaireScoringBuilder({ questionnaireId: "phq9" });
    const flat = [qrItem("q1", ansCoding("LA6568-5", "Some label"))];

    expect(b.getScoringByResponseItem(q, flat, "q1")).toBe(2);
  });

  it("falls back to fallbackScoreMap when no ordinal extension present", () => {
    const q = mkQ({
      id: "phq9",
      item: [{ linkId: "q1", type: "choice", answerOption: [{ valueCoding: { code: "LA6570-1" } }] }],
    });
    const b = new QuestionnaireScoringBuilder({
      questionnaireId: "phq9",
      // rely on DEFAULT_FALLBACK_SCORE_MAPS.default: LA6570-1 -> 2 (from your codebase)
    });
    const flat = [qrItem("q1", ansCoding("LA6570-1"))];

    expect(b.getScoringByResponseItem(q, flat, "q1")).toBe(2);
  });

  it("does NOT coerce arbitrary strings into numbers", () => {
    const q = mkQ({ id: "phq9", item: [{ linkId: "q1", type: "string" }] });
    const b = new QuestionnaireScoringBuilder({ questionnaireId: "phq9" });
    const flat = [qrItem("q1", { valueString: "2025-08-01" })]; // should NOT parse as number

    expect(b.getScoringByResponseItem(q, flat, "q1")).toBeNull();
  });

  it("computes total score when all question linkIds answered", () => {
    const q = mkQ({
      id: "phq9",
      item: [
        { linkId: "q1", type: "integer" },
        { linkId: "q2", type: "integer" },
      ],
    });

    const b = new QuestionnaireScoringBuilder({
      questionnaireId: "phq9",
      questionLinkIds: ["q1", "q2"],
    });

    const qr = mkQR({
      id: "resp1",
      questionnaire: "Questionnaire/phq9",
      authored: "2025-01-01T00:00:00Z",
      items: [qrItem("q1", ansInteger(1)), qrItem("q2", ansInteger(2))],
    });

    const rows = b.getResponsesSummary([qr], q);
    expect(rows[0].score).toBe(3);
  });

  it("prefers explicit scoringQuestionId score when present", () => {
    const q = mkQ({
      id: "phq9",
      item: [
        { linkId: "total", type: "integer" },
        { linkId: "q1", type: "integer" },
      ],
    });

    const b = new QuestionnaireScoringBuilder({
      questionnaireId: "phq9",
      questionLinkIds: ["q1"],
      scoringQuestionId: "total",
    });

    const qr = mkQR({
      id: "resp1",
      questionnaire: "Questionnaire/phq9",
      authored: "2025-01-01T00:00:00Z",
      items: [qrItem("q1", ansInteger(2)), qrItem("total", ansInteger(27))],
    });

    const rows = b.getResponsesSummary([qr], q);
    expect(rows[0].scoringQuestionScore).toBe(27);
    expect(rows[0].score).toBe(27); // uses explicit total
  });
});

describe("QuestionnaireScoringBuilder – severity bands", () => {

  const config = {
    scoringQuestionId: "/44261-6",
    subScoringQuestionIds: ["/55758-7"],
    questionnaireId: "CIRG-PHQ9",
    highSeverityScoreCutoff: 20,
    mediumSeverityScoreCutoff: 15,
    severityBands: [
      { min: 20, label: "high", meaning: "severe" },
      { min: 10, label: "medium", meaning: "moderate" },
      { min: 0, label: "low", meaning: "minimal" },
    ],
  };

  it("selects the first band whose min <= score (bands sorted desc)", () => {
    expect(severityFromScore(22, config)).toBe("high");
    expect(severityFromScore(15, config)).toBe("moderate");
    expect(severityFromScore(4, config)).toBe("low");
  });

  it("returns 'low' when bands missing or score not a number", () => {
    //const b2 = new QuestionnaireScoringBuilder({ questionnaireId: "phq9" });
    // @ts-expect-error test non-number
    expect(severityFromScore("not-a-number")).toBe("");
  });

  it("meaningFromSeverity returns associated meaning", () => {
    expect(meaningFromSeverity("medium", config)).toBe("moderate");
    expect(meaningFromSeverity("unknown"), config).toBeNull();
  });
});

describe("QuestionnaireScoringBuilder – fromBundleForThisQuestionnaire", () => {
  it("returns newest-first list that matches builder's id/name/url via fuzzy or strict", () => {
    const qrs = [
      mkQR({ id: "r1", questionnaire: "Questionnaire/PHQ9", authored: "2025-01-01T00:00:00Z" }),
      mkQR({ id: "r2", questionnaire: "http://loinc.org/phq9", authored: "2025-03-01T00:00:00Z" }),
      mkQR({ id: "r3", questionnaire: "Questionnaire/phq9", authored: "2025-02-01T00:00:00Z" }),
    ];
    const b = new QuestionnaireScoringBuilder({ questionnaireId: "phq9" }, bundleOf(qrs));

    const out = b.fromBundleForThisQuestionnaire({ completedOnly: true });
    expect(out.map((x) => x.id)).toEqual(["r2", "r3", "r1"]);
  });
});
