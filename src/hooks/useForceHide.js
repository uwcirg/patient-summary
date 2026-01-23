// useForceHide.js
import * as React from "react";

export function useForceHide({ leaveDelayMs = 50 } = {}) {
  const hideTimerRef = React.useRef(null);
  const [forceHide, setForceHide] = React.useState(false);

  const hideNow = React.useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setForceHide(true);
  }, []);

  const showNow = React.useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setForceHide(false);
  }, []);

  const scheduleHide = React.useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setForceHide(true), leaveDelayMs);
  }, [leaveDelayMs]);

  React.useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return { forceHide, setForceHide, hideTimerRef, hideNow, showNow, scheduleHide };
}
