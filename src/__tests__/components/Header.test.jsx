import React from "react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Header from "../../layout/Header";
import { FhirClientContext } from "../../context/FhirClientContext";

// ---- Mocks ----
vi.mock("../../util", () => ({
  isImagefileExist: vi.fn().mockResolvedValue(true), // avoids fetch/URL errors
  getEnv: vi.fn(() => "test"),
  getEnvProjectId: vi.fn(() => "EmbeddedSummary"),
  getSectionsToShow: vi.fn(() => []), // no sections for mobile list
  imageOK: vi.fn(() => true),
  scrollToElement: vi.fn(),
  toAbsoluteUrl: vi.fn(),
  getEnvAppTitle: vi.fn(() => "Patient Summary"),
  getEnvAboutContent: vi.fn(() => "About content")
}));

vi.mock("../../components/PatientInfo", () => ({
  __esModule: true,
  default: () => <div data-testid="patient-info" />,
}));

// (Optional) If you ever see base-URL issues in jsdom, uncomment:
// Object.defineProperty(window, "location", { value: new URL("http://localhost/") });

function renderWithProviders(ui) {
  return render(
    <FhirClientContext.Provider value={{ patient: {}}}>
      {ui}
    </FhirClientContext.Provider>
  );
}

describe("Test Header component", () => {
  it("Renders header", () => {
    const { container } = renderWithProviders(<Header />);
    const headerElement = container.querySelector("header");
    expect(headerElement).toBeDefined();
  });

  it("Header - return url button", () => {
    renderWithProviders(<Header returnURL="https://example.com" />);
    // Button text is "Patient List"
    expect(screen.getByText("Patient List")).toBeInTheDocument();
  });

  it("Header - without return url", () => {
    const { container } = renderWithProviders(<Header />);
    const returnButton = container.querySelector(".btn-return-url");
    expect(returnButton).toBeNull();
  });
});
