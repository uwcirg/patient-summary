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

// default texts, in case not provided, from https://loinc.org/
export const questionTextsByLoincCode = {
  // PHQ-9 questions
  "44250-9": "Little interest or pleasure in doing things",
  "44255-8": "Feeling down, depressed, or hopeless",
  "44259-0": "Trouble falling or staying asleep, or sleeping too much",
  "44254-1": "Feeling tired or having little energy",
  "44251-7": "Poor appetite or overeating",
  "44258-2": "Feeling bad about yourself-or that you are a failure or have let yourself or your family down",
  "44252-5": "Trouble concentrating on things, such as reading the newspaper or watching television",
  "44253-3":
    "Moving or speaking so slowly that other people could have noticed. Or the opposite-being so fidgety or restless that you have been moving around a lot more than usual",
  "44260-8": "Thoughts that you would be better off dead, or of hurting yourself in some way",
  "69722-7":
    "How difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?",
  "55758-7": "PHQ-2 total score",
};

export const LOIN_SYSTEM = "http://loinc.org";
export const FLOWSHEET_SYSTEM = "http://open.epic.com/FHIR/StructureDefinition/observation-flowsheet-id";
// code IDS from UCSD Test system; these will be different in PROD, use config, REACT_APP_FLOWSHEET_CODE_IDS
export const FLOWSHEET_CODE_IDS = [
  "tdYjwfyJvuW4IRAhjwoPFeA0",
  "tcfuT6l6w588Qqjcx6cXqxw0",
  "tags.2ubhSPRHJcPwj9A-9A0",
  "tbX6Ca3KWexbQqjSTR.gb5w0",
  "t0-c.j3CMZhmoM0Qd8ZtPmA0",
  "tUvwUAzzAo2GM-83FWMNMBA0",
  "t9ed6G2pi.iZGhA9T0KKSXQ0",
  "tKyPjZXsY.fwUg8kQpgnrGg0",
  "teN3kKw8NMBIF9ZU7Nd-9pQ0",
  "tnU0icMggWEcRhksuu4hJ3A0",
  "tcspRW.3lXOnl6nYHXrx3Rg0",
  "tAcMJ6d9AZFqpzWcp-YjG6Q0",
];
