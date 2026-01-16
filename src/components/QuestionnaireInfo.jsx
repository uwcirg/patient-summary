import React from "react";
import PropTypes from "prop-types";
import Questionnaire from "@models/Questionnaire";
import InfoDialog from "./InfoDialog";

export default function QuestionnaireInfo(props) {
  const { questionnaireJson, buttonIconProps, note } = props;

  const qo = new Questionnaire(questionnaireJson);
  const questionnaireTitle = qo.displayName;
  const introText = qo.introText;
  const content = introText + (note ? note: "");

  return (
    <InfoDialog
      title={`About ${questionnaireTitle}`}
      content={content}
      buttonTitle={`Click to learn more about ${questionnaireTitle}`}
      allowHtml={true}
      buttonIconProps={
        buttonIconProps
          ? buttonIconProps
          : {
              sx: {
                color: "#f8fafb",
              },
            }
      }
    />
  );
}

QuestionnaireInfo.propTypes = {
  questionnaireJson: PropTypes.object,
  buttonIconProps: PropTypes.object,
  note: PropTypes.string
};
