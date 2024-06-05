//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import MedicalHistory from "../../components/sections/MedicalHistory";

test("Renders medical history without data", () => {
  render(<MedicalHistory />);
  expect(screen.getByText(/No recorded condition/i)).toBeInTheDocument();
});

test("Renders medical history with data", () => {
  const data = [
    {
      resourceType: "Condition",
      id: "1288d728-bc04-421f-be95-35975b9e8f76",
      code: {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "195662009",
            display: "Acute viral pharyngitis (disorder)",
          },
        ],
        text: "Acute viral pharyngitis (disorder)",
      },
    },
  ];
  const { container } = render(<MedicalHistory data={data} />);
  const NoDataElement = container.querySelector(".condition-no-data");
  expect(NoDataElement).toBeNull();
});
