import React from "react";
import PropTypes from "prop-types";
import Questionnaire from "@models/Questionnaire";
import InfoDialog from "./InfoDialog";

export default function QuestionnaireInfo(props) {
  const { questionnaireJson, buttonIconProps } = props;
  
  const qo = new Questionnaire(questionnaireJson);
  const questionnaireTitle = qo.displayName;
  const introText = qo.introText;

  return (
    <InfoDialog
      title={`About ${questionnaireTitle}`}
      content={introText}
      buttonTitle={`Click to learn more about ${questionnaireTitle}`}
      allowHtml={true}
      buttonIconProps={buttonIconProps? 
            buttonIconProps : 
                    (
                      sx: {
                        color: "#eaedef",
                      },
                    }}
    />
  );
}

QuestionnaireInfo.propTypes = {
  questionnaireJson: PropTypes.object,
  buttonIconProps: PropType.object
};
