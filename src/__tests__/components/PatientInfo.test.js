//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import PatientInfo from "../../components/PatientInfo";

test("Renders patient info - without patient object", () => {
  const { container } = render(<PatientInfo />);
  const infoElement = container.querySelector(".patientinfo-container");
  expect(infoElement).toBeNull();
});

test("Render patient info - with patient object", () => {
  const patientObj = {
    name: [
      {
        use: "official",
        family: "Test",
        given: ["Bobo"],
        prefix: ["Mr."],
      },
    ],
    telecom: [
      {
        system: "phone",
        value: "555-901-9296",
        use: "home",
      },
    ],
    gender: "male",
    birthDate: "1964-03-18",
  };
  render(<PatientInfo patient={patientObj} />);
  expect(screen.getByText("Test, Bobo")).toBeInTheDocument();
});

test("Render patient info - without name", () => {
  const patientObj = {
    name: [],
    telecom: [
      {
        system: "phone",
        value: "555-901-9296",
        use: "home",
      },
    ],
    gender: "male",
    birthDate: "1964-03-18"
  };
  render(<PatientInfo patient={patientObj} />);
  expect(screen.getByText("Patient name unknown")).toBeInTheDocument();
});

test("Render patient info - dob", () => {
  const patientObj = {
    name: [
      {
        use: "official",
        family: "Test",
        given: ["Bobo"],
        prefix: ["Mr."],
      },
    ],
    telecom: [
      {
        system: "phone",
        value: "555-901-9296",
        use: "home",
      },
    ],
    gender: "male",
    birthDate: "1963-03-18",
  };
  render(<PatientInfo patient={patientObj} />);
  expect(screen.getByText("1963-03-18")).toBeInTheDocument();
});

test("Renders patient info - age", () => {
  const patientObj = {
    name: [
      {
        use: "official",
        family: "Test",
        given: ["Bobo"],
        prefix: ["Mr."],
      },
    ],
    telecom: [
      {
        system: "phone",
        value: "555-901-9296",
        use: "home",
      },
    ],
    gender: "male",
    birthDate: "1963-03-18",
  };
  const { container } = render(<PatientInfo patient={patientObj} />);
  const ageElement = container.querySelector(".patient-age");
  expect(ageElement).toHaveTextContent(/[1,2,3,4,5,6,7,8,9]$/i);
});

