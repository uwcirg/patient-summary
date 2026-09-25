import React, { useEffect, useRef, useState } from "react";
import Fab from "@mui/material/Fab";
import Box from "@mui/material/Box";
import Zoom from "@mui/material/Zoom";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { DEFAULT_TOOLBAR_HEIGHT } from "@/consts";

export default function FloatingNavButton() {
  const anchorRef = useRef(null);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const observer = new IntersectionObserver(([entry]) => setShowButton(!entry.isIntersecting), { threshold: 0 });
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Box
        ref={anchorRef}
        aria-hidden="true"
        sx={{
          height: "2px",
          width: "2px",
          // offsets scrollIntoView for the fixed toolbar without moving the element
          scrollMarginTop: `${DEFAULT_TOOLBAR_HEIGHT}px`,
        }}
      />
      <Zoom in={showButton} unmountOnExit>
        <Fab
          className="back-to-top print-hidden"
          color="primary"
          size="medium"
          aria-label="Back to top"
          title="Back to Top"
          onClick={(e) => {
            e.stopPropagation();
            anchorRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
          sx={(theme) => ({
            position: "fixed",
            bottom: theme.spacing(8),
            right: theme.spacing(3),
            zIndex: theme.zIndex.drawer + 2,
            border: `3px solid ${theme.palette.primary.main}`,
          })}
        >
          <ArrowUpwardIcon color="primary" />
        </Fab>
      </Zoom>
    </>
  );
}
