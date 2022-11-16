//jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Responses from "../../components/Responses";

test("Renders summary - empty data set", () => {
  render(<Responses data={[]}/>);
});

test("Render summary - null data", () => {
  render(<Responses data={null} />);
});

test("Render summary - no responses data set", () => {
  const badData = [
    {
    date : "2022-07-01",
    responses: null
  }];
  render(<Responses data={badData}></Responses>)
});

test("Render summary - non-empty data set", () => {
  const dummyData = [
    {
      date: "2022-07-22",
      responses: [
        {
          id: "minicog-question1",
          answer: 2,
          value: {
            value: 2,
          },
          question: "Word Recall (0-3 points)",
          text: "Word Recall (0-3 points)",
        },
        {
          id: "minicog-question2",
          answer: 0,
          value: {
            value: 0,
          },
          question: "Clock Draw (0 or 2 points)",
          text: "Clock Draw (0 or 2 points)",
        },
        {
          id: "minicog-total-score",
          answer: 2,
          value: {
            value: 2,
          },
          question: "<b>Total Score (0 - 5 points)</b>",
          text: "Total Score (0 - 5 points)",
        },
      ],
    },
    {
      date: "2022-07-12",
      responses: [
        {
          id: "minicog-question1",
          answer: 2,
          value: {
            value: 2,
          },
          question: "Word Recall (0-3 points)",
          text: "Word Recall (0-3 points)",
        },
        {
          id: "minicog-question2",
          answer: 2,
          value: {
            value: 2,
          },
          question: "Clock Draw (0 or 2 points)",
          text: "Clock Draw (0 or 2 points)",
        },
        {
          id: "minicog-total-score",
          answer: 4,
          value: {
            value: 4,
          },
          question: "<b>Total Score (0 - 5 points)</b>",
          text: "Total Score (0 - 5 points)",
        },
      ],
    },
  ];
  render(<Responses data={dummyData} />);
  expect(screen.getByRole("table")).toBeInTheDocument();
});
