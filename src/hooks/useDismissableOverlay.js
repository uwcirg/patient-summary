import React from "react";

export function useDismissableOverlay({ wrapperRef, onDismiss }) {
  const scrollingRef = React.useRef(false);
  const scrollTimeoutRef = React.useRef(null);

  React.useEffect(() => {
    const onScroll = () => {
      scrollingRef.current = true;
      
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Mark scrolling as finished after a brief delay
      scrollTimeoutRef.current = setTimeout(() => {
        scrollingRef.current = false;
      }, 150);
      
      onDismiss?.();
    };
    
    const onBlur = () => onDismiss?.();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("blur", onBlur);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [wrapperRef, onDismiss]);

  return { isScrolling: scrollingRef };
}
