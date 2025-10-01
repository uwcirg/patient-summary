export const QUESTIONNAIRE_ANCHOR_ID_PREFIX = "questionnaireAnchor";
export const queryPatientIdKey = "launch_queryPatientId";
export const queryNeedPatientBanner = "launch_queryNeedPatientBanner";
export const NO_CACHE_HEADER = {
  headers: {
    "Cache-Control": "no-cache",
  },
};
export const DEFAULT_DRAWER_WIDTH = 236;
export const MOBILE_DRAWER_WIDTH = 208;
export const DEFAULT_ACCORDION_HEADER_HEIGHT = 64;
export const DEFAULT_TOOLBAR_HEIGHT = 48;
export const DEFAULT_OBSERVATION_CATEGORIES =
  "social-history,vital-signs,imaging,laboratory,procedure,survey,exam,therapy,activity,smartdata";
// uses numeric valueQuantity 0..3, maps to LOINC codings, e.g. PHQ9
export const DEFAULT_VAL_TO_LOIN_CODE = {
  0: { system: "http://loinc.org", code: "LA6568-5", display: "Not at all" },
  1: { system: "http://loinc.org", code: "LA6569-3", display: "Several days" },
  2: { system: "http://loinc.org", code: "LA6570-1", display: "More than half the days" },
  3: { system: "http://loinc.org", code: "LA6571-9", display: "Nearly every day" },
};
// --- questionnaire response answer code -> value maps ---
export const DEFAULT_FALLBACK_SCORE_MAPS = {
  default: {
    "LA6568-5": 0,
    "LA6569-3": 1,
    "LA6570-1": 2,
    "LA6571-9": 3,
  },
};
// defaultAnswerOptions are what get rendered into the Questionnaire item.answerOption
export const DEFAULT_ANSWER_OPTIONS = [0, 1, 2, 3].map((n) => ({ valueCoding: DEFAULT_VAL_TO_LOIN_CODE[n] }));
// Epic flowsheet -> question linkId mapping
export const FLOWSHEET_ID_LINK_ID_MAPPINGS = {
  1570000014: "/44250-9",
  1570000015: "/44255-8",
  1570000018: "/44259-0",
  1570000019: "/44254-1",
  1570000020: "/44251-7",
  1570000021: "/44258-2",
  1570000022: "/44252-5",
  1570000023: "/44253-3",
  1570000024: "/44260-8",
  1570000025: "/44261-6", // total score (not an item answer)
  1570000016: "PHQ-2-Score"
};

export const FLOWSHEET_SYSTEM = "http://open.epic.com/FHIR/StructureDefinition/observation-flowsheet-id";
export const FLOWSHEET_CODE_IDS = ["tcspRW.3lXOnl6nYHXrx3Rg0", "tAcMJ6d9AZFqpzWcp-YjG6Q0"];
