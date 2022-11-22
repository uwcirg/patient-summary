//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { render, screen} from "@testing-library/react";
import SectionList from "../../components/SectionList";
import DEFAULT_SECTIONS from "../../config/sections_config";

test("Renders section list component without list given", () => {
   const { container } = render(<SectionList />);
   const listElement = container.querySelector(".sections-list");
   expect(listElement).toBeNull();
});

test("Renders section list component with list given - check default Questionnaire Responses section", () => {
  render(<SectionList list={DEFAULT_SECTIONS} expanded={true} />);
  expect(screen.getByText("Questionnaire Responses")).toBeInTheDocument();
});

test("Renders section list component with list given - check default Medical History section", () => {
  render(<SectionList list={DEFAULT_SECTIONS} expanded={true}/>);
  expect(
    screen.getByText(
      "Pertinent Medical History"
    )
  ).toBeInTheDocument();
});
