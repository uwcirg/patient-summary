import React from "react";
import PropTypes from "prop-types";
import Questionnaire from "@models/Questionnaire";
import InfoDialog from "./InfoDialog";

export default function QuestionnaireInfo(props) {
  const { questionnaireJson } = props;
  
  const qo = new Questionnaire(questionnaireJson);
  const questionnaireTitle = qo.displayName;
  const introText = qo.introText;

  return (
    <InfoDialog
      title={`About ${questionnaireTitle}`}
      content={introText}
      buttonTitle={`Click to learn more about ${questionnaireTitle}`}
      allowHtml={true}
    />
  );
}

QuestionnaireInfo.propTypes = {
  questionnaireJson: PropTypes.object,
};
