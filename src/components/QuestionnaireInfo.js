import { useState } from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { IconButton } from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import { getIntroTextFromQuestionnaire } from "../util/util";

export default function QuestionnaireInfo(props) {
  const { questionnaireJson } = props;
  const theme = useTheme();
  const introText = getIntroTextFromQuestionnaire(questionnaireJson);
  const [open, setOpen] = useState(false);

  const handleDialogOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const getQuestionnaireTitle = () => {
    return questionnaireJson.title
      ? questionnaireJson.title
      : questionnaireJson.name;
  };

  if (!introText) return null;
  return (
    <>
      <IconButton
        onClick={() => handleDialogOpen()}
        size="small"
        className="info-button print-hidden"
        aria-label="information link"
        title={`click to learn more about ${getQuestionnaireTitle()}`}
        edge="end"
      >
        <HelpIcon color="info"></HelpIcon>
      </IconButton>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle
          sx={{
            backgroundColor: theme.palette.primary
              ? theme.palette.primary.main
              : "#444",
            color: "#FFF",
          }}
        >
          About {getQuestionnaireTitle()}
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            sx={{ marginTop: theme.spacing(3) }}
            dangerouslySetInnerHTML={{
              __html: introText,
            }}
          ></DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

QuestionnaireInfo.propTypes = {
  questionnaireJson: PropTypes.object,
};
