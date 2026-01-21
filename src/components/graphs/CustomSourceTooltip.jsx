import React from "react";
import PropTypes from "prop-types";
import { getLocaleDateStringFromDate } from "@/util";

const CustomSourceTooltip = ({ visible, position, data, tooltipValueFormatter, yLabel, showMeaning = true }) => {
  if (!visible || !data) return null;

  const { date, value, source, isNull, meaning, lineName, lineColor } = data;

  // Handle date formatting with fallback
  let fmtDate;
  if (date) {
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      try {
        fmtDate = getLocaleDateStringFromDate(date, "YYYY-MM-DD HH:mm");
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

  const displayValue = isNull ? "Not Scored" : tooltipValueFormatter ? tooltipValueFormatter(value) : value;

  return (
    <div
      className="tooltip-container"
      style={{
        position: "fixed",
        left: position.x + 15,
        top: position.y - 10,
        pointerEvents: "none",
        zIndex: 1000,
        background: "#FFF",
        border: "1px solid #ccc",
        padding: "8px 12px",
        borderRadius: 0,
        boxShadow: "0 2px 6px rgba(33, 33, 33, 0.15)",
      }}
    >
      <div className="tooltip-label" style={{ fontWeight: 500, marginBottom: 4, fontSize: FONT_SIZE }}>
        {fmtDate}
      </div>
      {lineName && (
        <div
          style={{
            fontSize: "10px",
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
          {lineName}
        </div>
      )}
      {displayValue != null && (
        <div style={{ fontSize: FONT_SIZE, marginBottom: 2 }}>
          {!isNull && <span style={{ color: FONT_COLOR }}>{yLabel || "score"}:</span>}{" "}
          <span style={{ color: isNull ? NULL_COLOR : "inherit", fontStyle: isNull ? "italic" : "normal" }}>
            {displayValue}
          </span>
        </div>
      )}
      {showMeaning && meaning && !isNull && (
        <div style={{ fontSize: FONT_SIZE, color: FONT_COLOR, marginTop: 4, whiteSpace: "pre-line" }}>
          <span style={{ fontWeight: 500 }}>meaning:</span> {meaning}
        </div>
      )}
      {source && <div style={{ fontSize: FONT_SIZE, color: FONT_COLOR, marginTop: 4 }}>source: {source}</div>}
    </div>
  );
};

CustomSourceTooltip.propTypes = {
  visible: PropTypes.bool,
  position: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  data: PropTypes.shape({
    date: PropTypes.number,
    value: PropTypes.any,
    source: PropTypes.string,
    isNull: PropTypes.bool,
    meaning: PropTypes.string,
    lineName: PropTypes.string,
    lineColor: PropTypes.string,
  }),
  tooltipValueFormatter: PropTypes.func,
  yLabel: PropTypes.string,
  showMeaning: PropTypes.bool,
};

export default CustomSourceTooltip;
