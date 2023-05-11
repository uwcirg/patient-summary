import { createRef, forwardRef, useCallback, useEffect } from "react";
import Fab from "@mui/material/Fab";
import Box from "@mui/material/Box";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { isInViewport } from "../util/util";
import { DEFAULT_TOOLBAR_HEIGHT } from "../consts/consts";
let scrollIntervalId = 0;

export default function FloatingNavButton() {
  const fabRef = createRef();
  const anchorRef = createRef();
  const BoxRef = forwardRef((props, ref) => (
    <Box {...props} ref={ref}>
      {props.children}
    </Box>
  ));
  const FabRef = forwardRef((props, ref) => (
    <Fab ref={ref} {...props}>
      {props.children}
    </Fab>
  ));
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
    }, 150);
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
        bottom: "8px",
        right: "24px",
        zIndex: (theme) => theme.zIndex.drawer - 1,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!anchorRef.current) return;
        anchorRef.current.scrollIntoView();
      }}
      title="Back to Top"
    >
      <ArrowUpwardIcon aria-label="Back to Top" />
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
