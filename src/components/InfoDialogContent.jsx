import React, { useMemo } from "react";
import DOMPurify from "dompurify";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

const DEFAULT_ALLOWED_TAGS = [
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
];

const DEFAULT_ALLOWED_ATTR = ["href", "target", "rel", "class"];

export default function InfoDialogContent({
  open,
  onClose,
  title,
  content,
  closeButtonText = "Close",
  dialogProps = {},
  allowHtml = false,
  sanitizeConfig = {},
}) {
  const theme = useTheme();

  // Sanitize HTML content
  const sanitizedContent = useMemo(() => {
    if (!allowHtml || typeof content !== "string") {
      return content;
    }

    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: DEFAULT_ALLOWED_TAGS,
      ALLOWED_ATTR: DEFAULT_ALLOWED_ATTR,
      ...sanitizeConfig,
    });
  }, [content, allowHtml, sanitizeConfig]);

  return (
    <Dialog open={open} onClose={onClose} {...dialogProps}>
      {title && (
        <DialogTitle
          sx={{
            backgroundColor: theme.palette.primary?.main || "#444",
            color: "#FFF",
            textWrap: "pretty",
          }}
        >
          {title}
        </DialogTitle>
      )}

      <DialogContent>
        <DialogContentText sx={{ marginTop: theme.spacing(3) }}>
          {allowHtml ? <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} /> : content}
        </DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{closeButtonText}</Button>
      </DialogActions>
    </Dialog>
  );
}

InfoDialogContent.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  content: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  closeButtonText: PropTypes.string,
  dialogProps: PropTypes.object,
  allowHtml: PropTypes.bool,
  sanitizeConfig: PropTypes.object,
};
