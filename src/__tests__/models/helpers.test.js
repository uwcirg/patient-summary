import { describe, it, expect } from "vitest";
import {
  calculateQuestionnaireScore,
  observationsToQuestionnaireResponse,
  getAlertFromMostRecentResponse,
  meaningFromSeverity,
  severityFromScore,
} from "../../models/resultBuilders/helpers.jsx";
import questionnaireConfigs from "../../config/questionnaire_config.js";
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
const PHQ_Q = mkQ({
  id: "CIRG-PHQ9",
  url: "http://loinc.org/phq9",
  name: "CIRG-PHQ9",
  item: [{ linkId: "44261-6", text: "score", type: "decimal", code: [{ code: 44261 - 6 }] }],
});

const PHQ_QR_SCORE_ITEM = [{ linkId: "44261-6", answer: [{ valueDecimal: 16 }] }];
const PHQ_QR = mkQR({
  id: "PHQ_9_score",
  questionnaire: "Questionnaire/CIRG-PHQ9",
  authored: "2026-03-01T00:00:00Z",
  items: PHQ_QR_SCORE_ITEM,
});

const ARV_Q = mkQ({
  id: "CIRG-VAS",
  name: "CIRG-VAS",
  item: [{ linkId: "ARV-VAS", type: "integer", readOnly: true }],
});
const ARV_QR_SCORE_ITEM = [{ linkId: "ARV-VAS", answer: [{ valueInteger: 36 }] }];
const ARV_QR = mkQR({
  id: "ARV_score",
  questionnaire: "Questionniare/CIRG-VAS",
  items: ARV_QR_SCORE_ITEM,
});

const BUNDLE = {
  resourceType: "Bundle",
  entry: [{ resource: PHQ_Q }, { resource: ARV_Q }, { resource: PHQ_QR }, { resource: ARV_QR }],
};

describe("Score calculation", () => {
  it("return correct score from PHQ9", () => {
    const b = new QuestionnaireScoringBuilder(questionnaireConfigs["CIRG-PHQ9"], BUNDLE);
    const result = calculateQuestionnaireScore(PHQ_Q, PHQ_QR_SCORE_ITEM, questionnaireConfigs["CIRG-PHQ9"], b);
    const { score } = result;
    expect(score).toBe(16);
  });
  it("return correct score from ARV", () => {
    const b = new QuestionnaireScoringBuilder(questionnaireConfigs["CIRG-VAS"], BUNDLE);
    const result = calculateQuestionnaireScore(ARV_Q, ARV_QR_SCORE_ITEM, questionnaireConfigs["CIRG-VAS"], b);
    const { score } = result;
    expect(score).toBe(36);
  });
});

describe("Severity from Score", () => {
  it("return correct severity from PHQ9 score", () => {
    let severity = severityFromScore(16, questionnaireConfigs["CIRG-PHQ9"]);
    expect(severity).toEqual("moderately high");
    severity = severityFromScore(10, questionnaireConfigs["CIRG-PHQ9"]);
    expect(severity).toEqual("moderate");
    severity = severityFromScore(5, questionnaireConfigs["CIRG-PHQ9"]);
    expect(severity).toEqual("mild");
  });
  //CIRG-CNICS-ASSIST-OD
  it("return correct severity from CNICS ASSIST OD", () => {
    let severity = severityFromScore(1, questionnaireConfigs["CIRG-CNICS-ASSIST-OD"]);
    expect(severity).toEqual("high");
    severity = severityFromScore(0, questionnaireConfigs["CIRG-CNICS-ASSIST-OD"]);
    expect(severity).toEqual("low");
  });
  //CIRG-CNICS-HIV-STIGMA
  it("return correct severity from CIRG HIV STIGMA", () => {
    let severity = severityFromScore(4, questionnaireConfigs["CIRG-CNICS-HIV-STIGMA"]);
    expect(severity).toEqual("high");
    severity = severityFromScore(0, questionnaireConfigs["CIRG-CNICS-HIV-STIGMA"]);
    expect(severity).toEqual("low");
  });
});

describe("Alert from Responses", () => {
  it("return correct alert boolean from IPV-4", () => {
    const result = getAlertFromMostRecentResponse(
      {
        responses: [
          {
            linkId: "IPV4-critical",
            answer: "true",
          },
        ],
      },
      questionnaireConfigs["CIRG-CNICS-IPV4"],
    );
    expect(result).toEqual(true);
  });
  it("return correct alert boolean from CIRG-CNICS-FOOD", () => {
    const result = getAlertFromMostRecentResponse(
      {
        responses: [
          {
            linkId: "FOOD-critical-flag",
            answer: "false",
          },
        ],
      },
      questionnaireConfigs["CIRG-CNICS-FOOD"],
    );
    expect(result).toEqual(false);
  });
  it("return correct alert boolean from CIRG-CNICS-HIV-STIGMA", () => {
    const result = getAlertFromMostRecentResponse(
      {
        responses: [
          {
            linkId: "HIV-STIGMA-SCORE-CRITICAL",
            answer: "true",
          },
        ],
      },
      questionnaireConfigs["CIRG-CNICS-HIV-STIGMA"],
    );
    expect(result).toEqual(true);
  });
});

describe("Meaning from Severity", () => {
  it("return correct meaning via fallbackMeaning Func from IPV4 (multiple answers)", () => {
    const result = meaningFromSeverity("", questionnaireConfigs["CIRG-CNICS-IPV4"], [
      {
        linkId: "IPV4-1",
        answer: "Yes",
      },
      {
        linkId: "IPV4-2",
        answer: "No",
      },
      {
        linkId: "IPV4-3",
        answer: "Yes",
      },
      {
        linkId: "IPV4-4",
        answer: "Yes",
      },
      {
        id: "IPV4-critical",
        answer: "-",
      },
    ]);
    expect(result).toEqual("Felt trapped|Sexual violence|Physical violence");
  });
  it("return correct meaning via fallbackMeaning Func from IPV4 (one answer)", () => {
    const result = meaningFromSeverity("", questionnaireConfigs["CIRG-CNICS-IPV4"], [
      {
        linkId: "IPV4-1",
        answer: "No",
      },
      {
        linkId: "IPV4-2",
        answer: "Yes",
      },
      {
        linkId: "IPV4-3",
        answer: "No",
      },
      {
        linkId: "IPV4-4",
        answer: "No",
      },
      {
        id: "IPV4-critical",
        answer: "-",
      },
    ]);
    expect(result).toEqual("Fearful of harm");
  });
  it("return correct meaning via fallbackMeaning Func from CIRG-CNICS-FOOD", () => {
    const result = meaningFromSeverity("", questionnaireConfigs["CIRG-CNICS-FOOD"], [
      {
        linkId: "FOOD-score-label",
        answer: "Very Low Food Security",
      },
    ]);
    expect(result).toEqual("Very low food security");
  });
  it("return correct meaning via fallbackMeaning Func from CIRG_STI", () => {
    const result1 = meaningFromSeverity("", questionnaireConfigs["CIRG-STI"], [
      {
        linkId: "SEXUAL-RISK-SCORE-STI-EXPOSURE",
        answer: "Yes",
      },
    ]);
    const result2 = meaningFromSeverity("", questionnaireConfigs["CIRG-STI"], [
      {
        linkId: "SEXUAL-RISK-SCORE-STI-EXPOSURE",
        answer: "true",
      },
    ]);
    const result3 = meaningFromSeverity("", questionnaireConfigs["CIRG-STI"], [
      {
        linkId: "SEXUAL-RISK-SCORE-STI-EXPOSURE",
        answer: "No",
      },
    ]);
    const result4 = meaningFromSeverity("", questionnaireConfigs["CIRG-STI"], [
      {
        linkId: "SEXUAL-RISK-SCORE-STI-EXPOSURE",
        answer: "false",
      },
    ]);
    expect(result1).toEqual("Yes");
    expect(result2).toEqual("Yes");
    expect(result3).toEqual("No");
    expect(result4).toEqual("No");
  });
  it("return correct meaning via fallbackMeaning Func from CIRG-PC-PTSD-5", () => {
    const result = meaningFromSeverity("", questionnaireConfigs["CIRG-PC-PTSD-5"], [
      {
        linkId: "PC-PTSD-5-SCORE-SYMPTOMS",
        answer: "Intrusive Thoughts, Avoidance, Hypervigilance, Numb/Detached",
      },
    ]);
    expect(result).toEqual("Intrusive Thoughts|Avoidance|Hypervigilance|Numb/Detached");
  });

  it("return correct meaning via fallbackMeaning Func from CIRG-CNICS-AUDIT", () => {
    const result = meaningFromSeverity("", questionnaireConfigs["CIRG-CNICS-AUDIT"], [
      {
        linkId: "AUDIT-qnr-to-report",
        answer: "AUDIT",
      },
      {
        linkId: "AUDIT-score",
        answer: "23",
      },
      {
        linkId: "AUDIT-C-score",
        answer: "8",
      },
    ]);
    const result2 = meaningFromSeverity("", questionnaireConfigs["CIRG-CNICS-AUDIT"], [
      {
        linkId: "AUDIT-qnr-to-report",
        answer: "AUDIT-C",
      },
      {
        linkId: "AUDIT-score",
        answer: "23",
      },
      {
        linkId: "AUDIT-C-score",
        answer: "8",
      },
    ]);

    expect(result).toEqual("23 (AUDIT)");
    expect(result2).toEqual("8 (AUDIT-C)");
  });
  //CIRG-CNICS-ASSIST
  it("return correct meaning via fallbackMeaning Func from CIRG-CNICS-ASSIST", () => {
    const result = meaningFromSeverity("", questionnaireConfigs["CIRG-CNICS-ASSIST"], [
      {
        linkId: "ASSIST-3mo-score",
        answer: "Cocaine/Crack, Methamphetamine, Fentanyl",
      },
    ]);
    expect(result).toEqual("Cocaine/Crack|Methamphetamine|Fentanyl");
  });

  //"CIRG-CNICS-EXCHANGE-SEX"
  it("return correct meaning via fallbackMeaning Func from CIRG-CNICS-EXCHANGE-SEX", () => {
    const result = meaningFromSeverity("", questionnaireConfigs["CIRG-CNICS-EXCHANGE-SEX"], [
      {
        linkId: "EXCHANGE-SEX-SCORE-PAST-3-MONTHS",
        answer: "No",
      },
    ]);
    const result2 = meaningFromSeverity("", questionnaireConfigs["CIRG-CNICS-EXCHANGE-SEX"], [
      {
        linkId: "EXCHANGE-SEX-SCORE-PAST-3-MONTHS",
        answer: "Yes",
      },
    ]);
    const result3 = meaningFromSeverity("", questionnaireConfigs["CIRG-CNICS-EXCHANGE-SEX"], [
      {
        linkId: "EXCHANGE-SEX-SCORE-PAST-3-MONTHS",
        answer: "true",
      },
    ]);
    const result4 = meaningFromSeverity("", questionnaireConfigs["CIRG-CNICS-EXCHANGE-SEX"], [
      {
        linkId: "EXCHANGE-SEX-SCORE-PAST-3-MONTHS",
        answer: "false",
      },
    ]);
    expect(result).toEqual("No");
    expect(result2).toEqual("Yes");
    expect(result3).toEqual("Yes");
    expect(result4).toEqual("No");
  });
});
describe("Observations To QuestionnaireResponses", () => {
  it("return correct valueQuantity answer value from obs matched id in PHQ9", () => {
    const group = [
      {
        resourceType: "Observation",
        id: "2900294",
        meta: {
          versionId: "1",
          lastUpdated: "2025-08-14T20:26:07.840-04:00",
        },
        status: "final",
        code: {
          coding: [
            {
              system: "http://open.epic.com/FHIR/StructureDefinition/observation-flowsheet-id",
              code: "1570000015",
              display: "R PHQ-2/9 Q2 FEELING DOWN DEPRESSED OR HOPELESS",
            },
          ],
          text: "R PHQ-2/9 Q2 FEELING DOWN DEPRESSED OR HOPELESS",
        },
        subject: {
          reference: "Patient/80a75b5a-fd30-4f38-895d-d8098fe7206e",
        },
        effectiveDateTime: "2025-08-11T08:54:18+00:00",
        issued: "2025-08-11T08:54:18.742+00:00",
        valueQuantity: {
          value: 3,
        },
      },
    ];
    const qr = observationsToQuestionnaireResponse(group, questionnaireConfigs["CIRG-PHQ9"]);
    const results = (qr?.item ?? []).flatMap((it) => it.answer ?? []);
    expect(results).toEqual([
      {
        valueQuantity: {
          value: 3,
        },
      },
    ]);
  });
  it("return correct valueString answer value from obs matched id in PHQ9", () => {
    const group = [
      {
        resourceType: "Observation",
        id: "2900294",
        meta: {
          versionId: "1",
          lastUpdated: "2025-08-14T20:26:07.840-04:00",
        },
        status: "final",
        code: {
          coding: [
            {
              system: "http://open.epic.com/FHIR/StructureDefinition/observation-flowsheet-id",
              code: "1570000015",
              display: "R PHQ-2/9 Q2 FEELING DOWN DEPRESSED OR HOPELESS",
            },
          ],
          text: "R PHQ-2/9 Q2 FEELING DOWN DEPRESSED OR HOPELESS",
        },
        subject: {
          reference: "Patient/80a75b5a-fd30-4f38-895d-d8098fe7206e",
        },
        effectiveDateTime: "2025-08-11T08:54:18+00:00",
        issued: "2025-08-11T08:54:18.742+00:00",
        valueString: "always",
      },
    ];
    const qr = observationsToQuestionnaireResponse(group, questionnaireConfigs["CIRG-PHQ9"]);
    const results = (qr?.item ?? []).flatMap((it) => it.answer ?? []);
    expect(results).toEqual([
      {
        valueString: "always",
      },
    ]);
  });
  it("return correct score answer value from obs matched id in PHQ9", () => {
    const group = [
      {
        resourceType: "Observation",
        id: "2899596",
        status: "final",

        code: {
          coding: [
            {
              system: "http://open.epic.com/FHIR/StructureDefinition/observation-flowsheet-id",
              code: "1570000025",
              display: "R PHQ-9 SCORE",
            },
          ],
          text: "R PHQ-9 SCORE",
        },
        subject: {
          reference: "Patient/80a75b5a-fd30-4f38-895d-d8098fe7206e",
        },
        effectiveDateTime: "2025-07-16T08:54:18+00:00",
        issued: "2025-07-16T08:54:18.742+00:00",
        valueQuantity: {
          value: 9,
        },
      },
    ];
    const qr = observationsToQuestionnaireResponse(group, questionnaireConfigs["CIRG-PHQ9"]);
    const results = (qr?.item ?? []).flatMap((it) => it.answer ?? []);
    expect(results).toEqual([
      {
        valueQuantity: {
          value: 9,
        },
      },
    ]);
  });
});
