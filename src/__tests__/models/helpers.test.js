import { describe, it, expect } from "vitest";
import { observationsToQuestionnaireResponse } from "../../models/resultBuilders/helpers.js";
import questionnaireConfigs from "../../config/questionnaire_config.js";

describe("Observers To QuestionnaireResponses", () => {
  it("return correct valueQuantiy answer value from obs matched id in PHQ9", () => {
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
        valueCoding: {
          code: "LA6571-9",
          display: "Nearly every day",
          system: "http://loinc.org",
        },
      },
    ]);
  });
});
