import React from "react";
import PropTypes from "prop-types";
import { getLocaleDateStringFromDate } from "@/util";

export default function CustomTooltip({
  xFieldKey,
  xLabelKey,
  active,
  payload,
  tooltipLabelFormatter,
  tooltipValueFormatter,
  yFieldKey,
  yLabel,
  lineColorMap,
  isCategoricalY,
}) {
  if (!active || !payload || !payload.length) return null;

  // The original data object for this x-position
  const d = payload[0].payload ?? {};

  // For multiple lines, use originalDate; for single line use xLabelKey
  const rawDate = d.originalDate ?? d[xLabelKey] ?? d[xFieldKey] ?? d.date;
  const scoreRaw = d[yFieldKey] ?? d.score;

  // Check if the score is null or undefined
  const isNull = scoreRaw === null || scoreRaw === undefined || d.isNull;

  const meaning = !isNull ? (d.meaning ?? d.scoreMeaning ?? d.label ?? "").replace(/\|/g, "\n") : null;

  // use provided formatter; else a default
  const fmtDate =
    (typeof tooltipLabelFormatter === "function" && tooltipLabelFormatter(rawDate)) ||
    (rawDate ? getLocaleDateStringFromDate(rawDate, "YYYY-MM-DD HH:mm") : "—");

  // if multiple lines, payload will have one entry per series
  const multiValues = payload.map((p, i) => {
    const value = p.value;
    const isValueNull = value === null || value === undefined;
    const dataKey = p.key ?? p.dataKey ?? p.name ?? `series-${i}`;
    // Get original color from lineColorMap or from stored data or fallback to payload color
    const originalColor = lineColorMap?.[dataKey] ?? d[`${dataKey}_originalColor`] ?? p.color;

    return {
      key: p.dataKey ?? p.name ?? `series-${i}`,
      value: value,
      isNull: isValueNull,
      color: originalColor,
      name: p.name ?? p.dataKey,
    };
  });

  const isSingleValue = multiValues.length === 1;

  const FONT_COLOR = "#666";
  const NULL_COLOR = "#999";

  return (
    <div className="tooltip-container">
      <div className="tooltip-label">{fmtDate}</div>

      {/* Single-series summary line (falls back to multi if present) */}
      {isSingleValue &&
        (() => {
          const scoreDisplay = isCategoricalY
            ? null
            : isNull
              ? "Not Scored"
              : typeof tooltipValueFormatter === "function"
                ? tooltipValueFormatter(scoreRaw, d)
                : scoreRaw;

          // Don't show anything if scoreDisplay is null and there's no meaning
          if (scoreDisplay === null && !meaning) return null;

          return (
            <div style={{ marginBottom: 0 }}>
              {scoreDisplay !== null && (
                <div>
                  {!isNull && <span style={{ color: FONT_COLOR }}>{yLabel ? yLabel : "score"}:</span>}{" "}
                  <span style={{ color: isNull ? NULL_COLOR : "inherit", fontStyle: isNull ? "italic" : "normal" }}>
                    {String(scoreDisplay)}
                  </span>
                </div>
              )}
              {meaning && !isNull && (
                <div className="meaning-item flex" style={{ whiteSpace: "pre-line" }}>
                  <span style={{ color: FONT_COLOR }}>meaning:</span>
                  <span>{String(meaning)}</span>
                </div>
              )}
            </div>
          );
        })()}

      {/* Multi-series values - for multi-line charts */}
      {multiValues.length > 1 &&
        multiValues.map((m) => {
          const displayValue = m.isNull
            ? "Not Scored"
            : tooltipValueFormatter
              ? tooltipValueFormatter(m.value)
              : m.value;

          // Skip rendering this line if displayValue is null
          if (displayValue === null) return null;

          return (
            <div key={`tt-${m.key}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  display: "inline-block",
                  background: m.isNull ? NULL_COLOR : m.color,
                  border: "1px solid rgba(0,0,0,0.1)",
                }}
              />
              <span style={{ color: FONT_COLOR }}>
                {tooltipLabelFormatter ? tooltipLabelFormatter(m.name) : m.name}:
              </span>{" "}
              <span style={{ color: m.isNull ? NULL_COLOR : "inherit", fontStyle: m.isNull ? "italic" : "normal" }}>
                {displayValue}
              </span>
            </div>
          );
        })}
    </div>
  );
}

CustomTooltip.propTypes = {
  // whether tooltip is visible
  active: PropTypes.bool,
  // Recharts passes an array of series entries for this x-position
  payload: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      dataKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      color: PropTypes.string,
      payload: PropTypes.object, // raw data point: { date, score, meaning, ... }
    }),
  ),
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  xFieldKey: PropTypes.string,
  xLabelKey: PropTypes.string,
  yLabel: PropTypes.string,
  yFieldKey: PropTypes.string,
  tooltipLabelFormatter: PropTypes.func,
  tooltipValueFormatter: PropTypes.func,
  lineColorMap: PropTypes.object,
  isCategoricalY: PropTypes.bool,
};
