import React from "react";
import PropTypes from "prop-types";
import { Switch } from "@mui/material";

const CustomLegend = ({
  sources,
  isSmallScreen,
  hasNullValues,
  yLineFields,
  visibleLines,
  onToggleLine,
  enableLineSwitches,
  linesWithData
}) => {
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

  //const points = payload && !isEmptyArray(payload) ? payload : [];


  // Filter yLineFields to only include lines that have data
  const lineFieldsWithData = yLineFields && linesWithData 
    ? yLineFields.filter(field => linesWithData.has(field.key))
    : yLineFields || [];


  // If we have yLineFields (multiple lines), show them as line items
  const showLineItems = yLineFields && yLineFields.length > 0;

  return (
    <div
      style={{
        display: "flex",
        gap: isSmallScreen ? 8 : 16,
        alignItems: "flex-start",
        padding: isSmallScreen ? "2px 4px" : "4px 8px",
        position: "relative",
        left: isSmallScreen ? "16px" : "24px",
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
            gridTemplateColumns: isSmallScreen ? "1fr" : yLineFields.length > 6 ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
            gap: isSmallScreen ? "2px 8px" : "4px 16px",
            maxWidth: isSmallScreen ? "200px" : "420px",
          }}
        >
          {/* Map over lineFieldsWithData show lines with data */}
          {lineFieldsWithData.map((lineField, index) => {
            const lineKey = lineField.key;
            const isVisible = visibleLines?.[lineKey] !== false;
            const lineColor = lineField.color;
            const lineLabel = lineField.label || lineField.key;
            const strokeDasharray = lineField.strokeDasharray || "0";

            return (
              <div
                key={`item-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  opacity: enableLineSwitches && !isVisible ? 0.5 : 1,
                }}
              >
                {/* Only render switch if enableLineSwitches is true */}
                {enableLineSwitches && (
                  <Switch
                    checked={isVisible}
                    onChange={() => onToggleLine?.(lineKey)}
                    size="small"
                    className="print-hidden"
                    sx={{
                      width: isSmallScreen ? 32 : 36,
                      height: isSmallScreen ? 16 : 20,
                      padding: 0,
                      marginRight: 0.4,
                      "& .MuiSwitch-switchBase": {
                        padding: 0,
                        margin: "2px",
                        "&.Mui-checked": {
                          transform: isSmallScreen ? "translateX(16px)" : "translateX(16px)",
                          color: "#fff",
                          "& + .MuiSwitch-track": {
                            backgroundColor: lineColor,
                            opacity: 1,
                          },
                        },
                      },
                      "& .MuiSwitch-thumb": {
                        width: isSmallScreen ? 12 : 14,
                        height: isSmallScreen ? 12 : 14,
                      },
                      "& .MuiSwitch-track": {
                        borderRadius: isSmallScreen ? 8 : 10,
                        opacity: 1,
                        backgroundColor: "#ccc",
                      },
                    }}
                  />
                )}
                <svg width={iconSize} height={iconSize} style={{ marginRight: 4, flexShrink: 0 }}>
                  <line
                    x1="0"
                    y1={iconSize / 2}
                    x2={iconSize - 4}
                    y2={iconSize / 2}
                    stroke={lineColor}
                    strokeWidth={isSmallScreen ? 2 : 4}
                    strokeDasharray={strokeDasharray}
                  />
                </svg>
                <span style={{ fontSize: isSmallScreen ? 8 : 10, whiteSpace: "nowrap" }}>
                  {lineLabel.replace(/[_,-]/g, " ")}
                </span>
              </div>
            );
          })}
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
  visibleLines: PropTypes.object,
  onToggleLine: PropTypes.func,
  enableLineSwitches: PropTypes.bool,
  linesWithData: PropTypes.instanceOf(Set), 
};
