import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import questionnaireConfig from "../../config/questionnaire_config";
import QuestionnaireScoringBuilder from "../../models/resultBuilders/QuestionnaireScoringBuilder";

describe("QuestionnaireScoringBuilder - Derivation Logic", () => {
  let builder;
  let mockPatientBundle;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create a simple patient bundle for testing
    mockPatientBundle = {
      resourceType: "Bundle",
      type: "collection",
      entry: [],
    };

    builder = new QuestionnaireScoringBuilder({}, mockPatientBundle);
  });

  describe("buildDerivedSingleLinkQrs", () => {
    it("should return empty array when linkId is missing", () => {
      const hostQrs = [createMockQuestionnaireResponse()];

      const result = builder.buildDerivedSingleLinkQrs(hostQrs, {
        targetQuestionnaireId: "CIRG-SI",
      });

      expect(result).toEqual([]);
    });

    it("should return empty array when targetQuestionnaireId is missing", () => {
      const hostQrs = [createMockQuestionnaireResponse()];

      const result = builder.buildDerivedSingleLinkQrs(hostQrs, {
        linkId: "/44260-8",
      });

      expect(result).toEqual([]);
    });

    it("should return empty array for empty hostQrs", () => {
      const result = builder.buildDerivedSingleLinkQrs([], {
        linkId: "/44260-8",
        targetQuestionnaireId: "CIRG-SI",
      });

      expect(result).toEqual([]);
    });

    it("should extract single question from PHQ-9 to create CIRG-SI response", () => {
      const phq9Response = createMockQuestionnaireResponse({
        id: "phq9-response-1",
        questionnaire: "Questionnaire/PHQ-9",
        authored: "2024-01-15T10:30:00Z",
        items: [
          {
            linkId: "/44250-9",
            text: "Little interest or pleasure in doing things",
            answer: [{ valueInteger: 2 }],
          },
          {
            linkId: "/44260-8",
            text: "Thoughts that you would be better off dead",
            answer: [{ valueInteger: 1 }],
          },
        ],
      });

      const result = builder.buildDerivedSingleLinkQrs([phq9Response], {
        linkId: "/44260-8",
        targetQuestionnaireId: "CIRG-SI",
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        resourceType: "QuestionnaireResponse",
        id: "phq9-response-1_CIRG-SI",
        questionnaire: "Questionnaire/CIRG-SI",
        status: "completed",
        authored: "2024-01-15T10:30:00Z",
      });
      expect(result[0].item).toHaveLength(1);
      expect(result[0].item[0]).toMatchObject({
        linkId: "/44260-8",
        text: "Thoughts that you would be better off dead",
        answer: [{ valueInteger: 1 }],
      });
    });

    it("should skip responses without authored date", () => {
      const phq9Response1 = createMockQuestionnaireResponse({
        id: "phq9-response-1",
        questionnaire: "Questionnaire/PHQ-9",
        authored: null, // No authored date
        items: [
          {
            linkId: "/44260-8",
            text: "Suicide ideation question",
            answer: [{ valueInteger: 2 }],
          },
        ],
      });

      const phq9Response2 = createMockQuestionnaireResponse({
        id: "phq9-response-2",
        questionnaire: "Questionnaire/PHQ-9",
        authored: "2024-01-15T10:30:00Z",
        items: [
          {
            linkId: "/44260-8",
            text: "Suicide ideation question",
            answer: [{ valueInteger: 1 }],
          },
        ],
      });

      const result = builder.buildDerivedSingleLinkQrs([phq9Response1, phq9Response2], {
        linkId: "/44260-8",
        targetQuestionnaireId: "CIRG-SI",
      });

      // Only the second response should be included
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("phq9-response-2_CIRG-SI");
    });

    it("should skip responses without the target linkId", () => {
      const phq9Response1 = createMockQuestionnaireResponse({
        id: "phq9-response-1",
        questionnaire: "Questionnaire/PHQ-9",
        authored: "2024-01-15T10:30:00Z",
        items: [
          {
            linkId: "/44250-9",
            text: "Different question",
            answer: [{ valueInteger: 2 }],
          },
        ],
      });

      const phq9Response2 = createMockQuestionnaireResponse({
        id: "phq9-response-2",
        questionnaire: "Questionnaire/PHQ-9",
        authored: "2024-01-16T10:30:00Z",
        items: [
          {
            linkId: "/44260-8",
            text: "Target question",
            answer: [{ valueInteger: 1 }],
          },
        ],
      });

      const result = builder.buildDerivedSingleLinkQrs([phq9Response1, phq9Response2], {
        linkId: "/44260-8",
        targetQuestionnaireId: "CIRG-SI",
      });

      // Only the second response should be included
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("phq9-response-2_CIRG-SI");
    });

    it("should handle bundle entry format (resource wrapper)", () => {
      const phq9Response = {
        resource: createMockQuestionnaireResponse({
          id: "phq9-response-1",
          questionnaire: "Questionnaire/PHQ-9",
          authored: "2024-01-15T10:30:00Z",
          items: [
            {
              linkId: "/44260-8",
              text: "Suicide ideation question",
              answer: [{ valueInteger: 1 }],
            },
          ],
        }),
      };

      const result = builder.buildDerivedSingleLinkQrs([phq9Response], {
        linkId: "/44260-8",
        targetQuestionnaireId: "CIRG-SI",
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("phq9-response-1_CIRG-SI");
    });

    it("should preserve metadata from original response", () => {
      const phq9Response = createMockQuestionnaireResponse({
        id: "phq9-response-1",
        questionnaire: "Questionnaire/PHQ-9",
        authored: "2024-01-15T10:30:00Z",
        identifier: [{ system: "http://example.org", value: "ABC123" }],
        meta: {
          versionId: "1",
          lastUpdated: "2024-01-15T10:35:00Z",
          source: "epic",
        },
        subject: { reference: "Patient/123" },
        author: { reference: "Practitioner/456" },
        items: [
          {
            linkId: "/44260-8",
            text: "Suicide ideation question",
            answer: [{ valueInteger: 1 }],
          },
        ],
      });

      const result = builder.buildDerivedSingleLinkQrs([phq9Response], {
        linkId: "/44260-8",
        targetQuestionnaireId: "CIRG-SI",
      });

      expect(result[0]).toMatchObject({
        identifier: [{ system: "http://example.org", value: "ABC123" }],
        meta: {
          versionId: "1",
          lastUpdated: "2024-01-15T10:35:00Z",
          source: "epic",
        },
        subject: { reference: "Patient/123" },
        author: { reference: "Practitioner/456" },
      });
    });

    it("should handle flattened answer format with normalizeAnswerToCoding", () => {
      const phq9Response = createMockQuestionnaireResponse({
        id: "phq9-response-1",
        questionnaire: "Questionnaire/PHQ-9",
        authored: "2024-01-15T10:30:00Z",
        items: [
          {
            linkId: "/44260-8",
            text: "Suicide ideation question",
            answer: "Nearly every day", // Flattened format
          },
        ],
      });

      const normalizeAnswerToCoding = vi.fn((ans) => ({
        valueCoding: {
          system: "http://loinc.org",
          code: String(ans).toLowerCase(),
          display: ans,
        },
      }));

      const result = builder.buildDerivedSingleLinkQrs([phq9Response], {
        linkId: "/44260-8",
        targetQuestionnaireId: "CIRG-SI",
        normalizeAnswerToCoding,
      });

      expect(normalizeAnswerToCoding).toHaveBeenCalledWith("Nearly every day");
      expect(result[0].item[0].answer).toEqual([
        {
          valueCoding: {
            system: "http://loinc.org",
            code: "nearly every day",
            display: "Nearly every day",
          },
        },
      ]);
    });

    it("should handle proper FHIR answer format (array of objects)", () => {
      const phq9Response = createMockQuestionnaireResponse({
        id: "phq9-response-1",
        questionnaire: "Questionnaire/PHQ-9",
        authored: "2024-01-15T10:30:00Z",
        items: [
          {
            linkId: "/44260-8",
            text: "Suicide ideation question",
            answer: [
              {
                valueCoding: {
                  system: "http://loinc.org",
                  code: "LA6570-1",
                  display: "More than half the days",
                },
              },
            ],
          },
        ],
      });

      const result = builder.buildDerivedSingleLinkQrs([phq9Response], {
        linkId: "/44260-8",
        targetQuestionnaireId: "CIRG-SI",
      });

      // Should preserve the original FHIR format
      expect(result[0].item[0].answer).toEqual([
        {
          valueCoding: {
            system: "http://loinc.org",
            code: "LA6570-1",
            display: "More than half the days",
          },
        },
      ]);
    });

    it("should process multiple host responses correctly", () => {
      const phq9Responses = [
        createMockQuestionnaireResponse({
          id: "phq9-response-1",
          questionnaire: "Questionnaire/PHQ-9",
          authored: "2024-01-15T10:30:00Z",
          items: [
            {
              linkId: "/44260-8",
              text: "Suicide ideation question",
              answer: [{ valueInteger: 1 }],
            },
          ],
        }),
        createMockQuestionnaireResponse({
          id: "phq9-response-2",
          questionnaire: "Questionnaire/PHQ-9",
          authored: "2024-02-15T10:30:00Z",
          items: [
            {
              linkId: "/44260-8",
              text: "Suicide ideation question",
              answer: [{ valueInteger: 2 }],
            },
          ],
        }),
        createMockQuestionnaireResponse({
          id: "phq9-response-3",
          questionnaire: "Questionnaire/PHQ-9",
          authored: "2024-03-15T10:30:00Z",
          items: [
            {
              linkId: "/44260-8",
              text: "Suicide ideation question",
              answer: [{ valueInteger: 0 }],
            },
          ],
        }),
      ];

      const result = builder.buildDerivedSingleLinkQrs(phq9Responses, {
        linkId: "/44260-8",
        targetQuestionnaireId: "CIRG-SI",
      });

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("phq9-response-1_CIRG-SI");
      expect(result[1].id).toBe("phq9-response-2_CIRG-SI");
      expect(result[2].id).toBe("phq9-response-3_CIRG-SI");
      expect(result[0].item[0].answer[0].valueInteger).toBe(1);
      expect(result[1].item[0].answer[0].valueInteger).toBe(2);
      expect(result[2].item[0].answer[0].valueInteger).toBe(0);
    });

    it("should use default normalizeAnswerToCoding when not provided", () => {
      const phq9Response = createMockQuestionnaireResponse({
        id: "phq9-response-1",
        questionnaire: "Questionnaire/PHQ-9",
        authored: "2024-01-15T10:30:00Z",
        items: [
          {
            linkId: "/44260-8",
            text: "Suicide ideation question",
            answer: "Several days",
          },
        ],
      });

      const result = builder.buildDerivedSingleLinkQrs([phq9Response], {
        linkId: "/44260-8",
        targetQuestionnaireId: "CIRG-SI",
        // No normalizeAnswerToCoding provided - should use default
      });

      // "Several days" is in DEFAULT_VAL_TO_LOIN_CODE, so it should map to LOINC
      expect(result[0].item[0].answer).toEqual([
        {
          valueCoding: {
            system: "http://loinc.org",
            code: "LA6569-3",
            display: "Several days",
          },
        },
      ]);
    });

    it("should handle linkId fuzzy matching", () => {
      // Mock isLinkIdEquals to test fuzzy matching behavior
      const originalIsLinkIdEquals = builder.isLinkIdEquals;
      builder.isLinkIdEquals = vi.fn((a, b) => {
        // Simulate fuzzy matching that ignores leading slashes
        const normalizedA = String(a).replace(/^\/+/, "").toLowerCase();
        const normalizedB = String(b).replace(/^\/+/, "").toLowerCase();
        return normalizedA === normalizedB;
      });

      const phq9Response = createMockQuestionnaireResponse({
        id: "phq9-response-1",
        questionnaire: "Questionnaire/PHQ-9",
        authored: "2024-01-15T10:30:00Z",
        items: [
          {
            linkId: "44260-8", // No leading slash
            text: "Suicide ideation question",
            answer: [{ valueInteger: 1 }],
          },
        ],
      });

      const result = builder.buildDerivedSingleLinkQrs([phq9Response], {
        linkId: "/44260-8", // With leading slash
        targetQuestionnaireId: "CIRG-SI",
      });

      expect(result).toHaveLength(1);
      expect(builder.isLinkIdEquals).toHaveBeenCalled();

      // Restore original method
      builder.isLinkIdEquals = originalIsLinkIdEquals;
    });
  });

  describe("_summariesByQuestionnaireRef - Derivation Integration", () => {
    let mockQuestionnaire;
    let mockConfig;

    beforeEach(() => {
      mockQuestionnaire = {
        resourceType: "Questionnaire",
        id: "CIRG-SI",
        name: "CIRG-SI",
        item: [
          {
            linkId: "/44260-8",
            text: "Thoughts that you would be better off dead",
            type: "choice",
          },
        ],
      };

      mockConfig = {
        questionnaireId: "CIRG-SI",
        key: "CIRG-SI",
        deriveFrom: {
          linkId: "/44260-8",
          hostIds: ["PHQ-9"],
          normalizeAnswerToCoding: (ans) => ({
            valueCoding: {
              system: "http://loinc.org",
              code: String(ans).toLowerCase(),
              display: ans,
            },
          }),
        },
      };

      // Mock the questionnaireConfig registry to include our test config
      questionnaireConfig["CIRG-SI"] = mockConfig;

      // Create builder with config
      builder = new QuestionnaireScoringBuilder(mockConfig, mockPatientBundle);
    });
    // Clean up after tests
    afterEach(() => {
      delete questionnaireConfig["CIRG-SI"];
    });

    it("should derive responses when host QRs are passed directly", () => {
      const phq9Responses = [
        createMockQuestionnaireResponse({
          id: "phq9-response-1",
          questionnaire: "Questionnaire/PHQ-9",
          authored: "2024-01-15T10:30:00Z",
          items: [
            {
              linkId: "/44260-8",
              text: "Suicide ideation question",
              answer: [{ valueInteger: 1 }],
            },
          ],
        }),
      ];

      // Mock getResponsesSummary to verify it receives derived QRs
      const getResponsesSummarySpy = vi.spyOn(builder, "getResponsesSummary");
      getResponsesSummarySpy.mockReturnValue([]);

      // Actually call the method with PHQ-9 responses
      const result = builder._summariesByQuestionnaireRef(phq9Responses, mockQuestionnaire, {});

      // Verify that getResponsesSummary was called with derived QRs
      expect(getResponsesSummarySpy).toHaveBeenCalled();
      const derivedQrs = getResponsesSummarySpy.mock.calls[0][0];

      // Verify the derived QRs are correct
      expect(derivedQrs).toHaveLength(1);
      expect(derivedQrs[0].questionnaire).toBe("Questionnaire/CIRG-SI");
      expect(derivedQrs[0].item).toHaveLength(1);
      expect(derivedQrs[0].item[0].linkId).toBe("/44260-8");

      // Verify the result has expected structure (optional but good practice)
      expect(result).toBeDefined();
      expect(result.questionnaire).toBe(mockQuestionnaire);
      expect(result.key).toBe("CIRG-SI");

      getResponsesSummarySpy.mockRestore();
    });

    it("should derive responses from bundle when empty QRs passed", () => {
      // Add PHQ-9 responses to bundle
      const phq9Responses = [
        createMockQuestionnaireResponse({
          id: "phq9-response-1",
          questionnaire: "Questionnaire/PHQ-9",
          authored: "2024-01-15T10:30:00Z",
          items: [
            {
              linkId: "/44260-8",
              text: "Suicide ideation question",
              answer: [{ valueInteger: 2 }],
            },
          ],
        }),
      ];

      builder.patientBundle = {
        resourceType: "Bundle",
        type: "collection",
        entry: phq9Responses.map((qr) => ({ resource: qr })),
      };

      const getResponsesSummarySpy = vi.spyOn(builder, "getResponsesSummary");
      getResponsesSummarySpy.mockReturnValue([]);

      // Pass empty array - should pull from bundle
      const result = builder._summariesByQuestionnaireRef([], mockQuestionnaire, {});

      // Verify that getResponsesSummary was called with derived QRs
      expect(getResponsesSummarySpy).toHaveBeenCalled();
      const derivedQrs = getResponsesSummarySpy.mock.calls[0][0];

      expect(derivedQrs).toHaveLength(1);
      expect(derivedQrs[0].questionnaire).toBe("Questionnaire/CIRG-SI");
      expect(derivedQrs[0].item).toHaveLength(1);
      expect(derivedQrs[0].item[0].linkId).toBe("/44260-8");

      // Verify the returned result structure
      expect(result).toBeDefined();
      expect(result.questionnaire).toBe(mockQuestionnaire);
      expect(result.key).toBe("CIRG-SI");
      expect(result.config).toBeDefined();
      expect(result.error).toBe(""); // Should have no error since host was found

      getResponsesSummarySpy.mockRestore();
    });

    it("should not derive when direct CIRG-SI responses are provided", () => {
      const cirgSiResponses = [
        createMockQuestionnaireResponse({
          id: "cirg-si-response-1",
          questionnaire: "Questionnaire/CIRG-SI",
          authored: "2024-01-15T10:30:00Z",
          items: [
            {
              linkId: "/44260-8",
              text: "Suicide ideation question",
              answer: [{ valueInteger: 1 }],
            },
          ],
        }),
      ];

      const buildDerivedSpy = vi.spyOn(builder, "buildDerivedSingleLinkQrs");
      const getResponsesSummarySpy = vi.spyOn(builder, "getResponsesSummary");
      getResponsesSummarySpy.mockReturnValue([]);

      builder._summariesByQuestionnaireRef(cirgSiResponses, mockQuestionnaire, {});

      // Should NOT call buildDerivedSingleLinkQrs since direct responses provided
      expect(buildDerivedSpy).not.toHaveBeenCalled();

      buildDerivedSpy.mockRestore();
      getResponsesSummarySpy.mockRestore();
    });

    it("should set error when no host matches found", () => {
      // Empty bundle, no host QRs
      builder.patientBundle = {
        resourceType: "Bundle",
        type: "collection",
        entry: [],
      };

      const getResponsesSummarySpy = vi.spyOn(builder, "getResponsesSummary");
      getResponsesSummarySpy.mockReturnValue([]);

      const result = builder._summariesByQuestionnaireRef([], mockQuestionnaire, {});

      // Should have error about no host matches
      expect(result.error).toBe("No host questionnaire responses found");

      getResponsesSummarySpy.mockRestore();
    });
    it("should handle multiple host IDs", () => {
      const configWithMultipleHosts = {
        ...mockConfig,
        deriveFrom: {
          ...mockConfig.deriveFrom,
          hostIds: ["PHQ-9", "PHQ-9-MODIFIED", "PHQ9"],
        },
      };

      builder = new QuestionnaireScoringBuilder(configWithMultipleHosts, mockPatientBundle);

      const phq9ModifiedResponse = createMockQuestionnaireResponse({
        id: "phq9-modified-response-1",
        questionnaire: "Questionnaire/PHQ-9-MODIFIED",
        authored: "2024-01-15T10:30:00Z",
        items: [
          {
            linkId: "/44260-8",
            text: "Suicide ideation question",
            answer: [{ valueInteger: 1 }],
          },
        ],
      });

      const getResponsesSummarySpy = vi.spyOn(builder, "getResponsesSummary");
      getResponsesSummarySpy.mockReturnValue([]);

      builder._summariesByQuestionnaireRef([phq9ModifiedResponse], mockQuestionnaire, {});

      expect(getResponsesSummarySpy).toHaveBeenCalled();
      const derivedQrs = getResponsesSummarySpy.mock.calls[0][0];

      expect(derivedQrs).toHaveLength(1);
      expect(derivedQrs[0].id).toBe("phq9-modified-response-1_CIRG-SI");

      getResponsesSummarySpy.mockRestore();
    });
  });
});

// ========== Helper Functions ==========

/**
 * Create a mock FHIR QuestionnaireResponse for testing
 */
function createMockQuestionnaireResponse({
  id = "test-qr-1",
  questionnaire = "Questionnaire/TEST",
  status = "completed",
  authored = "2024-01-15T10:30:00Z",
  subject = { reference: "Patient/123" },
  author = { reference: "Practitioner/456" },
  identifier = [],
  meta = {},
  items = [],
} = {}) {
  return {
    resourceType: "QuestionnaireResponse",
    id,
    questionnaire,
    status,
    authored,
    subject,
    author,
    identifier,
    meta,
    item: items,
  };
}
