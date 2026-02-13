import React from "react";
import PropTypes from "prop-types";
import { getLocaleDateStringFromDate } from "@/util";

const CustomSourceTooltip = ({
  visible,
  position,
  positionType = "fixed",
  data,
  payload,
  tooltipValueFormatter,
  xFieldKey,
  yFieldKey,
  yLabel,
  showMeaning = true,
  noDataText = "Not Scored",
}) => {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState({ w: 220, h: 120 });
  const OFFSET_X = 15;
  const OFFSET_Y = -10;
  const MARGIN = 8;

  const rawLeft = (position?.x ?? 0) + OFFSET_X;
  const rawTop = (position?.y ?? 0) + OFFSET_Y;

  // Clamp within viewport
  const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  const clampedLeft = Math.min(Math.max(rawLeft, MARGIN), vw - size.w - MARGIN);
  const clampedTop = Math.min(Math.max(rawTop, MARGIN), vh - size.h - MARGIN);

  const { date, value, source, isNull, meaning, lineName, lineColor } = data ?? {};

  // Handle date formatting with fallback
  let fmtDate,
    dateToUse = date ? date : payload && payload[xFieldKey] ? payload[xFieldKey] : null;
  if (dateToUse) {
    const dateObj = new Date(dateToUse);
    if (!isNaN(dateObj.getTime())) {
      try {
        fmtDate = getLocaleDateStringFromDate(dateToUse, "YYYY-MM-DD HH:mm");
      } catch (err) {
        console.log(err);
        // Fallback to simple formatting
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        const hours = String(dateObj.getHours()).padStart(2, "0");
        const minutes = String(dateObj.getMinutes()).padStart(2, "0");
        fmtDate = `${year}-${month}-${day} ${hours}:${minutes}`;
      }
    } else {
      fmtDate = "—";
    }
  } else {
    fmtDate = "—";
  }
  const FONT_COLOR = "#666";
  const NULL_COLOR = "#999";
  const FONT_SIZE = "10px";

  const valueToUse =
    payload && payload[yFieldKey] !== undefined && payload[yFieldKey] !== null ? payload[yFieldKey] : value;

  const displayValue =
    isNull || valueToUse == null ? noDataText : tooltipValueFormatter ? tooltipValueFormatter(valueToUse) : valueToUse;
  const lineLabel = lineName ? lineName.replace(/[-_]/g, " ") : "";

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    // Only update if it changed (avoid re-render loops)
    if (Math.abs(rect.width - size.w) > 1 || Math.abs(rect.height - size.h) > 1) {
      setSize({ w: rect.width, h: rect.height });
    }
  }, [size.h, size.w, data, visible]); // dependencies that change tooltip size

  if (!data) return null;
  return (
    <div
      ref={ref}
      className="tooltip-container"
      style={{
        position: positionType ?? "fixed",
        left: clampedLeft,
        top: clampedTop,
        pointerEvents: "none",
        zIndex: 1000,
        background: "#FFF",
        border: "1px solid #ccc",
        borderRadius: 0,
        boxShadow: "0 2px 6px rgba(33, 33, 33, 0.15)",
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translate(-50%, calc(-100% - 8px)) scale(1)"
          : "translate(-50%, calc(-100% - 12px)) scale(0.96)",

        // Faster fade-in, slightly slower fade-out
        transition: visible
          ? "opacity 0.12s cubic-bezier(0.4, 0, 0.2, 1), transform 0.12s cubic-bezier(0.4, 0, 0.2, 1)"
          : "opacity 0.18s cubic-bezier(0.4, 0, 1, 1), transform 0.18s cubic-bezier(0.4, 0, 1, 1)",

        // Keep in DOM but invisible when hidden (prevents layout shift)
        visibility: visible ? "visible" : "hidden",
      }}
    >
      <div
        className="tooltip-label"
        style={{
          fontWeight: 500,
          padding: "6px 12px",
          fontSize: FONT_SIZE,
          backgroundColor: "#fafafa",
        }}
      >
        {fmtDate}
      </div>
      <div style={{ padding: "2px 12px 8px" }}>
        {lineLabel && (
          <div
            style={{
              fontSize: FONT_SIZE,
              color: FONT_COLOR,
              marginBottom: 4,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {lineColor && (
              <span
                style={{
                  display: "inline-block",
                  width: "10px",
                  height: "10px",
                  backgroundColor: lineColor,
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 0,
                  flexShrink: 0,
                }}
              />
            )}
            {lineLabel}
          </div>
        )}
        {displayValue != null && (
          <div style={{ fontSize: FONT_SIZE, marginBottom: 2 }}>
            {!isNull && <span style={{ color: FONT_COLOR, fontWeight: 500 }}>{yLabel || "score"}:</span>}{" "}
            <span style={{ color: isNull ? NULL_COLOR : "inherit", fontStyle: isNull ? "italic" : "normal" }}>
              {displayValue}
            </span>
          </div>
        )}
        {showMeaning && meaning && !isNull && (
          <div style={{ fontSize: FONT_SIZE, color: FONT_COLOR, marginTop: 2, whiteSpace: "pre" }}>
            <span style={{ fontWeight: 500 }}>meaning:</span> {meaning}
          </div>
        )}
        {source && <div style={{ fontSize: FONT_SIZE, color: FONT_COLOR, marginTop: 6 }}>source: {source}</div>}
      </div>
    </div>
  );
};

CustomSourceTooltip.propTypes = {
  visible: PropTypes.bool,
  noDataText: PropTypes.string,
  position: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  positionType: PropTypes.string,
  data: PropTypes.shape({
    date: PropTypes.number,
    value: PropTypes.any,
    source: PropTypes.string,
    isNull: PropTypes.bool,
    meaning: PropTypes.string,
    lineName: PropTypes.string,
    lineColor: PropTypes.string,
  }),
  payload: PropTypes.object,
  tooltipValueFormatter: PropTypes.func,
  xFieldKey: PropTypes.string,
  yFieldKey: PropTypes.string,
  yLabel: PropTypes.string,
  showMeaning: PropTypes.bool,
};

export default CustomSourceTooltip;
