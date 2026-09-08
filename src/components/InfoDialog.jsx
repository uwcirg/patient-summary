import React, { useState, useMemo, Suspense, lazy} from "react";
import DOMPurify from "dompurify";
import PropTypes from "prop-types";
import IconButton from "@mui/material/IconButton";
import HelpIcon from "@mui/icons-material/Help";

const LazyDialogContent = lazy(() => import("./InfoDialogContent"));

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
      <Suspense fallback={<div>Loading...</div>}>
        <LazyDialogContent
          open={isOpen}
          onClose={handleClose}
          title={title}
          content={sanitizedContent}
          closeButtonText={closeButtonText}
          dialogProps={dialogProps}
          allowHtml={allowHtml}
          sanitizeConfig={sanitizeConfig}
        />
      </Suspense>
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
