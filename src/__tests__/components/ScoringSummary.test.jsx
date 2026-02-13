//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import React from "react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ScoringSummary from "../../components/sections/ScoringSummary";
import questionnaireConfigs from "../../config/questionnaire_config";
//import PHQ9SummaryData from "../mockfiles/MockPHQ9SummaryData.json";

describe("Testing ScoringSummary component", () => {
  it("Renders scoring summary without data", () => {
    const { container } = render(<ScoringSummary />);
    const noDataElement = container.querySelector(".no-data-wrapper");
    expect(noDataElement).toBeInTheDocument();
  });

  it("Renders score cell using data as array", () => {
    render(
      <ScoringSummary
        data={[
          {
            ...questionnaireConfigs["CIRG-PHQ9"],
            score: 17,
            scoreSeverity: "moderate",
            date: 1712795756000,
            tableResponseData: [{ score: 17, date: 1712795756000 }],
          },
        ]}
      />,
    );
    expect(screen.getByText("17")).toBeInTheDocument();
  });
});
