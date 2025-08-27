import { describe, it, expect, vi, beforeEach } from "vitest";
import QuestionnaireScoringBuilder from "../../models/resultBuilders/QuestionnaireScoringBuilder";
//import { isEmptyArray, isNil, isNumber, isPlainObject, normalizeStr, fuzzyMatch, objectToString, getChartConfig, getLocaleDateStringFromDate } from "../../util";
// --- Mocks for external deps used inside the class ---
// vi.mock("@util", () => ({
//   // simple, predictable helpers
//   isEmptyArray: (a) => !Array.isArray(a) || a.length === 0,
//   isNil: (x) => x == null,
//   isNumber: (x) => typeof x === "number" && Number.isFinite(x),
//   isPlainObject: (x) => x && typeof x === "object" && Object.getPrototypeOf(x) === Object.prototype,
//   normalizeStr: (s) => (typeof s === "string" ? s.trim().toLowerCase() : s),
//   fuzzyMatch: (a, b) => (a && b ? a.includes(b) || b.includes(a) : false),
//   objectToString: (o) => (o == null ? "" : JSON.stringify(o)),
//   getChartConfig: vi.fn(() => ({ type: "line" })), // not under test here
//   getLocaleDateStringFromDate: (d) => d,
//   toMaybeDate: (s) => {
//     if (!s) return null;
//     const d = new Date(s);
//     return Number.isNaN(d.getTime()) ? null : d;
//   },
// }));

vi.mock("@/util/fhirUtil", () => ({
  linkIdEquals: (a, b, _mode = "fuzzy") => {
    if (_mode === "strict") return String(a) === String(b);
    const A = String(a || "").toLowerCase();
    const B = String(b || "").toLowerCase();
    return A === B;
  },
}));

// Response is used only by table/print helpers; keep it trivial
vi.mock("@models/Response", () => ({
  default: class Response {
    obj;
    constructor(obj) {
      this.obj = obj;
    }
    get answerText() {
      return this.obj?.answer ?? null;
    }
    get questionText() {
      return this.obj?.question ?? this.obj?.text ?? this.obj?.id ?? "";
    }
  },
}));

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
  let b;

  beforeEach(() => {
    b = new QuestionnaireScoringBuilder({
      questionnaireId: "phq9",
      severityBands: [
        { min: 20, label: "high", meaning: "severe" },
        { min: 10, label: "medium", meaning: "moderate" },
        { min: 0, label: "low", meaning: "minimal" },
      ],
    });
  });

  it("selects the first band whose min <= score (bands sorted desc)", () => {
    expect(b.severityFromScore(22)).toBe("high");
    expect(b.severityFromScore(15)).toBe("medium");
    expect(b.severityFromScore(4)).toBe("low");
  });

  it("returns 'low' when bands missing or score not a number", () => {
    const b2 = new QuestionnaireScoringBuilder({ questionnaireId: "phq9" });
    // @ts-expect-error test non-number
    expect(b2.severityFromScore("not-a-number")).toBe("low");
  });

  it("meaningFromSeverity returns associated meaning", () => {
    expect(b.meaningFromSeverity("medium")).toBe("moderate");
    expect(b.meaningFromSeverity("unknown")).toBeNull();
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

describe("QuestionnaireScoringBuilder – _formatPrintResponseData", () => {
  it("builds a printable matrix for the first date and includes score row when present", () => {
    const b = new QuestionnaireScoringBuilder({ questionnaireId: "phq9" });

    const params = { maximumScore: 27 };
    const data = [
      {
        id: "r1",
        date: "2025-01-01",
        responses: [
          { id: "q1", question: "Mood", answer: "sad" },
          { id: "q2", question: "Sleep", answer: "poor" },
        ],
        score: 7,
      },
      {
        id: "r2",
        date: "2025-02-01",
        responses: [
          { id: "q1", question: "Mood", answer: "ok" },
          { id: "q2", question: "Sleep", answer: "better" },
        ],
        score: 4,
      },
    ];

    const printed = b._formatPrintResponseData(data, params);

    // Header uses only the first date (mocked getLocaleDateStringFromDate echoes input)
    expect(printed.headerRow).toEqual(["Questions", "2025-01-01"]);

    // Body rows show first-date answers
    expect(printed.bodyRows).toEqual([
      ["Mood", "sad"],
      ["Sleep", "poor"],
    ]);

    // Score row is an array with a single object for the first date
    expect(Array.isArray(printed.scoreRow)).toBe(true);
    expect(printed.scoreRow?.[0]).toMatchObject({ score: 7, scoreParams: params });
  });

  it("omits scoreRow when there is no score", () => {
    const b = new QuestionnaireScoringBuilder({ questionnaireId: "phq9" });

    const data = [
      {
        id: "r1",
        date: "2025-01-01",
        responses: [{ id: "q1", question: "Mood", answer: "sad" }],
        // score intentionally omitted
      },
    ];

    const printed = b._formatPrintResponseData(data, { maximumScore: 27 });

    expect(printed.headerRow).toEqual(["Questions", "2025-01-01"]);
    expect(printed.bodyRows).toEqual([["Mood", "sad"]]);
    expect(printed.scoreRow).toBeNull();
  });

  it("returns null when there is no response data", () => {
    const b = new QuestionnaireScoringBuilder({ questionnaireId: "phq9" });
    // empty data or responses missing → no printable content
    expect(b._formatPrintResponseData([], { maximumScore: 27 })).toBeNull();
    expect(
      b._formatPrintResponseData([{ id: "r1", date: "2025-01-01", responses: [] }], { maximumScore: 27 }),
    ).toBeNull();
  });
});
