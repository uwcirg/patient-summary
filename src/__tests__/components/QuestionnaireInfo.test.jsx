//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import React from "react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import QuestionnaireInfo from "../../components/QuestionnaireInfo";

describe("Testing QuestionnaireInfo component", () => {
  it("Renders patient info - without patient object", () => {
    const { container } = render(<QuestionnaireInfo />);
    const infoElement = container.querySelector(".info-button");
    expect(infoElement).toBeNull();
  });

  it("Render patient info - with questionnaire object", () => {
    const questionnaireObj = {
      resourceType: "Questionnaire",
      id: "CIRG-Test",
      name: "Test Questionnaire",
      title: "CIRG-Test Questionnaire",
      status: "draft",
      item: [
        {
          linkId: "introduction",
          type: "display",
          _text: {
            extension: [
              {
                url: "http://hl7.org/fhir/StructureDefinition/rendering-xhtml",
                valueString:
                  "<p style='font-size:1.3em'>Questionnaire Content</p>",
              },
            ],
          },
        },
      ],
    };

    const { container } = render(
      <QuestionnaireInfo questionnaireJson={questionnaireObj} />
    );
    const infoElement = container.querySelector(".info-button");
    expect(infoElement).toBeInTheDocument();
  });
});
