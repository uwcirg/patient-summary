//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import QuestionnaireSelector from "../../components/QuestionnaireSelector";

test("Renders questionnaire selector without list given", () => {
  render(<QuestionnaireSelector />);
  expect(
    screen.getByText(
      "No matching questionnaire(s) found. Is it configured correctly?"
    )
  ).toBeInTheDocument();
});
