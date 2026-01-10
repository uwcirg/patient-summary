import React, { useState, useMemo } from "react";
import DOMPurify from "dompurify";
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

export default function InfoDialog(props) {
  const {
    title,
    content,
    buttonIcon: ButtonIcon = HelpIcon,
    buttonIconProps = {},
    buttonProps = {},
    buttonSize = "small",
    buttonColor = "info",
    buttonLabel = "information link",
    buttonTitle,
    showButton = true,
    open: controlledOpen,
    onOpen,
    onClose,
    closeButtonText = "Close",
    dialogProps = {},
    allowHtml = false,
    sanitizeConfig = {},
  } = props;

  const theme = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  // Sanitize HTML content
  const sanitizedContent = useMemo(() => {
    if (!allowHtml || typeof content !== "string") {
      return content;
    }

    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "a",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "span",
        "div",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "class"],
      ...sanitizeConfig,
    });
  }, [content, allowHtml, sanitizeConfig]);

  const handleDialogOpen = () => {
    if (controlledOpen === undefined) {
      setInternalOpen(true);
    }
    onOpen?.();
  };

  const handleClose = () => {
    if (controlledOpen === undefined) {
      setInternalOpen(false);
    }
    onClose?.();
  };

  // Don't render if there's no content
  if (!content) return null;

  return (
    <>
      {showButton && (
        <IconButton
          onClick={handleDialogOpen}
          size={buttonSize}
          className="info-button print-hidden"
          aria-label={buttonLabel}
          title={buttonTitle || `Click to learn more${title ? ` about ${title}` : ""}`}
          edge="end"
          {...buttonProps}
        >
          <ButtonIcon color={buttonColor} {...buttonIconProps} />
        </IconButton>
      )}

      <Dialog open={isOpen} onClose={handleClose} {...dialogProps}>
        {title && (
          <DialogTitle
            sx={{
              backgroundColor: theme.palette.primary?.main || "#444",
              color: "#FFF",
            }}
          >
            {title}
          </DialogTitle>
        )}

        <DialogContent>
          <DialogContentText sx={{ marginTop: theme.spacing(3) }}>
            {allowHtml ? <span dangerouslySetInnerHTML={{ __html: sanitizedContent }} /> : content}
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>{closeButtonText}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

InfoDialog.propTypes = {
  title: PropTypes.string,
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  buttonIcon: PropTypes.elementType,
  buttonIconProps: PropTypes.object,
  buttonProps: PropTypes.object,
  buttonSize: PropTypes.string,
  buttonColor: PropTypes.string,
  buttonLabel: PropTypes.string,
  buttonTitle: PropTypes.string,
  showButton: PropTypes.bool,
  open: PropTypes.bool,
  onOpen: PropTypes.func,
  onClose: PropTypes.func,
  closeButtonText: PropTypes.string,
  dialogProps: PropTypes.object,
  allowHtml: PropTypes.bool,
  sanitizeConfig: PropTypes.object,
};
