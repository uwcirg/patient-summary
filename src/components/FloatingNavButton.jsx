import React, { createRef, forwardRef, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import Fab from "@mui/material/Fab";
import Box from "@mui/material/Box";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { isInViewport } from "../util";
import { DEFAULT_TOOLBAR_HEIGHT } from "../consts";
let scrollIntervalId = 0;

export default function FloatingNavButton() {
  const fabRef = createRef();
  const anchorRef = createRef();
  const BoxRef = forwardRef((props, ref) => (
    <Box {...props} ref={ref}>
      {props.children}
    </Box>
  ));
  BoxRef.displayName = "BoxRef";
  const FabRef = forwardRef((props, ref) => (
    <Fab ref={ref} {...props} className="back-to-top">
      {props.children}
    </Fab>
  ));
  FabRef.displayName = "FabRef";
  const handleFab = useCallback(() => {
    const fabElement = fabRef.current;
    if (!fabElement) return;
    clearInterval(scrollIntervalId);
    scrollIntervalId = setInterval(() => {
      if (isInViewport(anchorRef.current)) {
        fabElement.classList.remove("flex");
        fabElement.classList.add("hide");
        return;
      }
      fabElement.classList.add("flex");
      fabElement.classList.remove("hide");
    }, 250);
  }, [fabRef, anchorRef]);

  const renderNavButton = () => (
    <FabRef
      className={"hide print-hidden"}
      ref={fabRef}
      color="primary"
      aria-label="add"
      size="medium"
      sx={{
        position: "fixed",
        bottom: (theme) => theme.spacing(1),
        right: (theme) => theme.spacing(3),
        zIndex: (theme) => theme.zIndex.drawer - 1,
        borderColor: (theme) => theme.palette.primary.main,
        borderWidth: "2px",
        borderStyle: "solid"
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!anchorRef.current) return;
        anchorRef.current.scrollIntoView();
      }}
      title="Back to Top"
    >
      <ArrowUpwardIcon
        aria-label="Back to Top"
        color="primary"
      />
    </FabRef>
  );

  const renderAnchorTop = () => (
    <BoxRef
      ref={anchorRef}
      sx={{
        position: "relative",
        height: "2px",
        width: "2px",
        top: -1 * DEFAULT_TOOLBAR_HEIGHT,
      }}
    ></BoxRef>
  );

  useEffect(() => {
    window.addEventListener("scroll", handleFab);
    return () => {
      clearInterval(scrollIntervalId);
      window.removeEventListener("scroll", handleFab, false);
    };
  }, [handleFab]);

  return (
    <>
      {renderAnchorTop()}
      {renderNavButton()}
    </>
  );
}

FloatingNavButton.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.array]),
};
