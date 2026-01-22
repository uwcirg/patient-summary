import React from "react";
import PropTypes from "prop-types";
import { Switch } from "@mui/material";
import { hexToRgba } from "@config/chart_config";

const CustomLegend = ({
  sources,
  isSmallScreen,
  hasNullValues,
  noDataText = "Not Scored",
  yLineFields,
  visibleLines,
  onToggleLine,
  enableLineSwitches,
  linesWithData,
  legendIconType,
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
      label: noDataText,
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
  const lineFieldsWithData =
    yLineFields && linesWithData ? yLineFields.filter((field) => linesWithData.has(field.key)) : yLineFields || [];

  // If we have yLineFields (multiple lines), show them as line items
  const showLineItems = yLineFields && yLineFields.length > 0;
  const shouldShowSwitches = enableLineSwitches && yLineFields?.length > 1;

  return (
    <div
      style={{
        display: "flex",
        gap: isSmallScreen ? 8 : 16,
        alignItems: "flex-start",
        padding: isSmallScreen ? "4px 4px" : "4px 8px",
        position: "relative",
        left: isSmallScreen ? "16px" : "28px",
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
            // marginLeft: isSmallScreen ? 8 : 16,
            fontSize: isSmallScreen ? 9 : 10,
            color: "#444",
            display: "grid",
            gridTemplateColumns: isSmallScreen ? "1fr" : yLineFields.length > 6 ? "repeat(3, 1fr)" : "repeat(2, 1fr)",
            gap: isSmallScreen ? "4px 8px" : "6px 16px",
            maxWidth: isSmallScreen ? "200px" : "420px",
          }}
        >
          {/* Map over lineFieldsWithData show lines with data */}
          {lineFieldsWithData.map((lineField, index) => {
            const lineKey = lineField.key;
            const isVisible = visibleLines?.[lineKey] !== false;
            const lineColor = hexToRgba(lineField.color ?? "#444", 1);
            const lineLabel = lineField.label || lineField.key;
            const strokeDasharray = lineField.strokeDasharray || "0";
            // Determine icon type: use field-specific legendType, or passed legendIconType, or default 'line'
            const iconType = lineField.legendType || legendIconType || "line";

            return (
              <div
                key={`item-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  opacity: shouldShowSwitches && !isVisible ? 0.5 : 1,
                }}
              >
                {/* Only render switch if shouldShowSwitches is true */}
                {shouldShowSwitches && (
                  <Switch
                    checked={isVisible}
                    onChange={() => onToggleLine?.(lineKey)}
                    size="small"
                    className="print-hidden"
                    sx={{
                      // width: isSmallScreen ? 30 : 34,
                      // height: isSmallScreen ? 14 : 18,
                      width: isSmallScreen ? 24 : 30,
                      height: isSmallScreen ? 12 : 16,
                      padding: 0,
                      marginRight: 0.8,
                      "& .MuiSwitch-switchBase": {
                        padding: 0,
                        margin: "2px",
                        "&.Mui-checked": {
                          transform: isSmallScreen ? "translateX(16px)" : "translateX(16px)",
                          color: "#fff",
                          "& + .MuiSwitch-track": {
                            backgroundColor: lineColor,
                            opacity: 0.8,
                          },
                        },
                      },
                      "& .MuiSwitch-thumb": {
                        width: isSmallScreen ? 6 : 10,
                        height: isSmallScreen ? 9 : 11,
                      },
                      "& .MuiSwitch-track": {
                        borderRadius: isSmallScreen ? 6 : 8,
                        opacity: 1,
                        backgroundColor: "#ccc",
                      },
                    }}
                  />
                )}
                {/* Render icon based on type */}
                <svg width={iconSize} height={iconSize} style={{ marginRight: 4, flexShrink: 0 }}>
                  {iconType === "circle" ? (
                    // Circle icon
                    <circle
                      cx={iconSize / 2}
                      cy={iconSize / 2}
                      r={isSmallScreen ? 3 : 4}
                      fill={lineColor}
                      stroke="#fff"
                      strokeWidth="1.5"
                    />
                  ) : (
                    // Line icon (default)
                    <line
                      x1="0"
                      y1={iconSize / 2}
                      x2={iconSize - 4}
                      y2={iconSize / 2}
                      stroke={lineColor}
                      strokeWidth={2.5}
                      strokeDasharray={strokeDasharray}
                    />
                  )}
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
  noDataText: PropTypes.string,
  yLineFields: PropTypes.array,
  visibleLines: PropTypes.object,
  onToggleLine: PropTypes.func,
  enableLineSwitches: PropTypes.bool,
  linesWithData: PropTypes.instanceOf(Set),
  legendIconType: PropTypes.oneOf(["line", "circle"]),
};
