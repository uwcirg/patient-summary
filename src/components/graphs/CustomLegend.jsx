import React from "react";
import PropTypes from "prop-types";
import { isEmptyArray } from "@util";

const CustomLegend = ({ payload, sources, isSmallScreen, hasNullValues, yLineFields }) => {
  const hasCnics = sources.includes("CNICS") || sources.includes("cnics");
  const hasEpic = sources.includes("EPIC") || sources.includes("epic");
  let items = [];

  const iconSize = isSmallScreen ? 12 : 16;
  const dotRadius = isSmallScreen ? 3 : 4;
  const rectSize = isSmallScreen ? 6 : 8;

  if (hasCnics) {
    items.push({
      key: "cnics",
      label: "CNICS",
      icon: (
        <svg width={iconSize} height={iconSize}>
          <circle cx={iconSize / 2} cy={iconSize / 2} r={dotRadius} fill="#444" stroke="#fff" strokeWidth="2" />
        </svg>
      ),
    });
  }

  if (hasEpic) {
    items.push({
      key: "epic",
      label: "EPIC",
      icon: (
        <svg width={iconSize} height={iconSize}>
          <rect
            x={(iconSize - rectSize) / 2}
            y={(iconSize - rectSize) / 2}
            width={rectSize}
            height={rectSize}
            fill="#444"
            stroke="#fff"
            strokeWidth="2"
          />
        </svg>
      ),
    });
  }

  // Add null values legend item if there are any null values
  if (hasNullValues) {
    const xSize = isSmallScreen ? 4 : 6;
    const xStrokeWidth = isSmallScreen ? 1.5 : 2;
    const halfSize = xSize / 2;

    items.push({
      key: "not-scored",
      label: "Not Scored",
      icon: (
        <svg width={iconSize} height={iconSize}>
          <g transform={`translate(${iconSize / 2}, ${iconSize / 2})`}>
            <line
              x1={-halfSize}
              y1={-halfSize}
              x2={halfSize}
              y2={halfSize}
              stroke="#999"
              strokeWidth={xStrokeWidth}
              strokeLinecap="round"
            />
            <line
              x1={-halfSize}
              y1={halfSize}
              x2={halfSize}
              y2={-halfSize}
              stroke="#999"
              strokeWidth={xStrokeWidth}
              strokeLinecap="round"
            />
          </g>
        </svg>
      ),
    });
  }

  const points = payload && !isEmptyArray(payload) ? payload : [];

  // If we have yLineFields (multiple lines), show them as line items
  const showLineItems = yLineFields && yLineFields.length > 0 && points.length > 1;

  return (
    <div
      style={{
        display: "flex",
        gap: isSmallScreen ? 8 : 16,
        alignItems: "flex-start",
        padding: isSmallScreen ? "2px 4px" : "4px 8px",
        position: "relative",
        left: isSmallScreen ? "16px" : "32px",
        flexWrap: "wrap",
      }}
    >
      {items.map((it) => (
        <div
          key={it.key}
          style={{ display: "flex", gap: 2, alignItems: "center" }}
          aria-label={`${it.label} legend item`}
        >
          {it.icon}
          <span style={{ fontSize: isSmallScreen ? 9 : 10, color: "#444" }}>{it.label}</span>
        </div>
      ))}

      {showLineItems && (
        <div
          style={{
            marginLeft: isSmallScreen ? 8 : 16,
            fontSize: isSmallScreen ? 9 : 10,
            color: "#444",
            display: "grid",
            gridTemplateColumns: isSmallScreen ? "1fr" : points.length > 6 ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
            gap: isSmallScreen ? "2px 8px" : "4px 16px",
            maxWidth: isSmallScreen ? "200px" : "320px",
          }}
        >
          {points.map((entry, index) => (
            <div key={`item-${index}`} style={{ display: "flex", alignItems: "center" }}>
              <svg width={iconSize} height={iconSize} style={{ marginRight: 4, flexShrink: 0 }}>
                <line
                  x1="0"
                  y1={iconSize / 2}
                  x2={iconSize - 4}
                  y2={iconSize / 2}
                  stroke={entry.color}
                  strokeWidth={isSmallScreen ? 2 : 4}
                  strokeDasharray={entry.payload.strokeDasharray || "0"}
                />
              </svg>
              <span style={{ fontSize: isSmallScreen ? 8 : 10, whiteSpace: "nowrap" }}>
                {entry.value.replace(/[_,-]/g, " ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomLegend;

CustomLegend.propTypes = {
  payload: PropTypes.array,
  sources: PropTypes.array,
  isSmallScreen: PropTypes.bool,
  hasNullValues: PropTypes.bool,
  yLineFields: PropTypes.array,
};
