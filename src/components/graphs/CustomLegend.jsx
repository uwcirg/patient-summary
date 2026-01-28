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

  // Filter yLineFields to only include lines that have data
  const lineFieldsWithData =
    yLineFields && linesWithData ? yLineFields.filter((field) => linesWithData.has(field.key)) : yLineFields || [];

  // If we have yLineFields (multiple lines), show them as line items
  const showLineItems = yLineFields && yLineFields.length > 0;
  const shouldShowSwitches = enableLineSwitches && yLineFields?.length > 1;

  // Check if all lines are visible
  const allLinesVisible = lineFieldsWithData.every((field) => visibleLines?.[field.key] !== false);

  // Handler for toggling all lines
  const handleToggleAll = () => {
    if (!onToggleLine || !lineFieldsWithData.length) return;
    lineFieldsWithData.forEach((field) => {
      if ((visibleLines?.[field.key] !== false) === allLinesVisible) {
        onToggleLine(field.key);
      }
    });
  };

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
            fontSize: isSmallScreen ? 9 : 10,
            color: "#444",
            display: "flex",
            flexDirection: "column",
            gap: isSmallScreen ? 4 : 6,
          }}
        >
          {/* Show/Hide All Toggle - only if switches are enabled */}
          {shouldShowSwitches && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                paddingBottom: isSmallScreen ? 8 : 10,
                borderBottom: "1px solid #ddd",
                marginBottom: isSmallScreen ? 2 : 4,
              }}
            >
              <Switch
                checked={allLinesVisible}
                onChange={handleToggleAll}
                size="small"
                className="print-hidden"
                sx={{
                  width: 30,
                  height: 16,
                  padding: 0,
                  marginRight: 0.8,
                  "& .MuiSwitch-switchBase": {
                    padding: 0,
                    margin: "2px",
                    "&.Mui-checked": {
                      transform: isSmallScreen ? "translateX(16px)" : "translateX(16px)",
                      color: "#fff",
                      "& + .MuiSwitch-track": {
                        backgroundColor: "#051694",
                        opacity: 0.8,
                      },
                    },
                  },
                  "& .MuiSwitch-thumb": {
                    width: 10,
                    height: 11,
                  },
                  "& .MuiSwitch-track": {
                    borderRadius: 8,
                    opacity: 1,
                    backgroundColor: "#cccccc",
                  },
                }}
              />
              <span style={{ fontSize: 10, fontWeight: 500 }}>{allLinesVisible ? "Show All" : "Hide All"}</span>
            </div>
          )}

          {/* Individual line items */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isSmallScreen
                ? "repeat(2, 1fr)"
                : lineFieldsWithData.length > 9
                  ? "repeat(4, 1fr)" // 4 columns when more than 9 items
                  : "repeat(3, 1fr)", // 3 columns otherwise
              gap: isSmallScreen ? "4px 8px" : "8px 16px",
            }}
          >
            {lineFieldsWithData.map((lineField, index) => {
              const lineKey = lineField.key;
              const isVisible = visibleLines?.[lineKey] !== false;
              const lineColor = hexToRgba(lineField.color ?? "#444", 1);
              const lineLabel = lineField.label || lineField.key;
              const strokeDasharray = lineField.strokeDasharray || "0";
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
                  {shouldShowSwitches && (
                    <Switch
                      checked={isVisible}
                      onChange={() => onToggleLine?.(lineKey)}
                      size="small"
                      className="print-hidden"
                      sx={{
                        width: 30,
                        height: 16,
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
                          width: 10,
                          height: 11,
                        },
                        "& .MuiSwitch-track": {
                          borderRadius: 8,
                          opacity: 1,
                          backgroundColor: "#ccc",
                        },
                      }}
                    />
                  )}
                  <svg width={iconSize} height={iconSize} style={{ marginRight: 4, flexShrink: 0 }}>
                    {iconType === "circle" ? (
                      <circle
                        cx={iconSize / 2}
                        cy={iconSize / 2}
                        r={isSmallScreen ? 3 : 4}
                        fill={lineColor}
                        stroke="#fff"
                        strokeWidth="1.5"
                      />
                    ) : (
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
                  <span style={{ fontSize: 10, whiteSpace: "nowrap" }}>{lineLabel.replace(/[_,-]/g, " ")}</span>
                </div>
              );
            })}
          </div>
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
