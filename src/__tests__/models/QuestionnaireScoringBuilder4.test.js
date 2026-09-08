import { describe, it, expect } from "vitest";
import QuestionnaireScoringBuilder from "../../models/resultBuilders/QuestionnaireScoringBuilder";

const qrItem = (linkId, answerArr) => ({
  linkId,
  text: linkId,
  ...(answerArr ? { answer: answerArr } : {}),
});

const ansCoding = (code, display = code, system = "https://cnics-pro.cirg.washington.edu/") => ({
  valueCoding: { system, code, display },
});

const ansString = (value) => ({ valueString: value });

const mkSmokingQuestionnaire = () => ({
  resourceType: "Questionnaire",
  id: "CIRG-CNICS-Smoking",
  status: "active",
  item: [
    // "real" questions (0..9)
    ...Array.from({ length: 10 }, (_, i) => ({
      linkId: `Smoking-${i}`,
      text: `Smoking-${i}`,
      type: "choice",
      answerOption: [{ valueCoding: { code: `Smoking-${i}-0`, display: "No" } }],
    })),

    // calculated summary items (should NOT count)
    {
      linkId: "Smoking-Tobacco-Cigs-Summary",
      text: "Summary of tobacco cigarettes use",
      type: "string",
      readOnly: true,
      extension: [
        {
          url: "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
          valueExpression: { language: "text/fhirpath", expression: "..." },
        },
      ],
    },
    {
      linkId: "E-Cigarettes-Summary",
      text: "Summary of e-cigarette use",
      type: "string",
      readOnly: true,
      extension: [
        {
          url: "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
          valueExpression: { language: "text/fhirpath", expression: "..." },
        },
      ],
    },
  ],
});

const mkSmokingQrAnswered8PlusSummaries = () => ({
  resourceType: "QuestionnaireResponse",
  id: "qr1",
  status: "completed",
  questionnaire: "Questionnaire/CIRG-CNICS-Smoking",
  authored: "2025-12-04T16:15:45-08:00",
  item: [
    // Answer 8 real questions: 0,1,2,3,6,7,8,9
    qrItem("Smoking-0", [ansCoding("Smoking-0-1", "Yes")]),
    qrItem("Smoking-1", [ansCoding("Smoking-1-1", "Yes")]),
    qrItem("Smoking-2", [ansCoding("Smoking-2-4", "More than 20 years")]),
    qrItem("Smoking-3", [ansCoding("Smoking-3-3", "More than 2 packs a day")]),
    qrItem("Smoking-4"), // unanswered
    qrItem("Smoking-5"), // unanswered
    qrItem("Smoking-6", [ansCoding("Smoking-6-1", "Yes")]),
    qrItem("Smoking-7", [ansCoding("Smoking-7-1", "Yes")]),
    qrItem("Smoking-8", [ansCoding("Smoking-8-5", "More than 5 years")]),
    qrItem("Smoking-9", [ansCoding("Smoking-9-0", "Every day or almost every day")]),

    // These are answered in the QR, but must NOT be counted as "answered items"
    qrItem("Smoking-Tobacco-Cigs-Summary", [ansString("Currently")]),
    qrItem("E-Cigarettes-Summary", [ansString("Yes")]),
  ],
});

describe("QuestionnaireScoringBuilder.getScoreStatsFromQuestionnaireResponse", () => {
  it("counts answered items only among scoreLinkIds (excludes readOnly/calculated summary items)", () => {
    const questionnaire = mkSmokingQuestionnaire();
    const qr = mkSmokingQrAnswered8PlusSummaries();

    // IMPORTANT: keep config minimal so scoreLinkIds comes from the Questionnaire items
    const b = new QuestionnaireScoringBuilder({ questionnaireId: "CIRG-CNICS-Smoking" });

    const stats = b.getScoreStatsFromQuestionnaireResponse(qr, questionnaire, {});

    expect(stats.totalItems).toBe(10);         // Smoking-0..9
    expect(stats.totalAnsweredItems).toBe(8);  // excludes both summary items
  });
});
