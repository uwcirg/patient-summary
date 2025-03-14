//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import React from "react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import MedicalHistory from "../../components/sections/MedicalHistory";

describe("Testing MedicalHistory component", () => {
  it("Renders medical history without data", () => {
    render(<MedicalHistory />);
    expect(screen.getByText(/No recorded condition/i)).toBeInTheDocument();
  });

  it("Renders medical history with data", () => {
    const data = [
      {
        id: "2659684",
        condition: "Less than High School",
        status: "Confirmed",
        recordedDate: "2014-04-05T00:00:00.000+00:00",
        onsetDateTime: "2014-04-05T16:00:00.000+00:00",
      },
    ];
    const { container } = render(<MedicalHistory data={data} />);
    const NoDataElement = container.querySelector(".condition-no-data");
    expect(NoDataElement).toBeNull();
  });
});
