import * as React from "react";

export function useDismissableOverlay({ wrapperRef, onDismiss }) {
  React.useEffect(() => {
    const onDownCapture = (e) => {
      // If click/tap is inside wrapper, ignore
      if (wrapperRef?.current && wrapperRef.current.contains(e.target)) return;
      onDismiss?.();
    };

    const onTouchStartCapture = (e) => {
      if (wrapperRef.current && wrapperRef.current.contains(e.target)) return;
      onDismiss?.();
    };

    const onScroll = () => onDismiss?.();
    const onBlur = () => onDismiss?.();

    document.addEventListener("pointerdown", onDownCapture, true);
    document.addEventListener("touchstart", onTouchStartCapture, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("pointerdown", onDownCapture, true);
      document.removeEventListener("touchstart", onTouchStartCapture, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("blur", onBlur);
    };
  }, [wrapperRef, onDismiss]);
}
