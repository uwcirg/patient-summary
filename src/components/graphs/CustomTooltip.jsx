import React from "react";
import PropTypes from "prop-types";
import { getLocaleDateStringFromDate } from "@/util";
export default function CustomTooltip({
  xFieldKey,
  xLabelKey,
  active,
  payload,
  yFieldValueFormatter,
  tooltipLabelFormatter,
  tooltipValueFormatter,
  yFieldKey,
  yLabel,
}) {
  if (!active || !payload || !payload.length) return null;

  // The original data object for this x-position
  const d = payload[0].payload ?? {};
  const rawDate = d[xLabelKey] ?? d[xFieldKey] ?? d.date;
  const meaning = (d.meaning ?? d.scoreMeaning ?? d.label ?? "").replace(/\|/g, "\n");
  const scoreRaw = d[yFieldKey] ?? d.score;
  const scoreDisplay = typeof yFieldValueFormatter === "function" ? yFieldValueFormatter(scoreRaw, d) : scoreRaw;

  // use provided formatter; else a default
  const fmtDate =
    (typeof tooltipLabelFormatter === "function" && tooltipLabelFormatter(rawDate)) ||
    (rawDate ? getLocaleDateStringFromDate(rawDate, "YYYY-MM-DD HH:mm") : "—");

  // if multiple lines, payload will have one entry per series
  const multiValues = payload.map((p, i) => ({
    key: p.dataKey ?? p.name ?? `series-${i}`,
    value: p.value,
    color: p.color,
    name: p.name ?? p.dataKey,
  }));

  const FONT_COLOR = "#666";

  return (
    <div className="tooltip-container">
      <div className="tooltip-label">{fmtDate}</div>

      {/* Single-series summary line (falls back to multi if present) */}
      {multiValues.length < 2 && (meaning != null || scoreDisplay != null) ? (
        <div style={{ marginBottom: multiValues.length > 1 ? 8 : 0 }}>
          {scoreDisplay != null && (
            <div>
              <span style={{ color: FONT_COLOR }}>{yLabel ? yLabel : "score"}:</span> {String(scoreDisplay)}
            </div>
          )}
          {meaning && (
            <div className="meaning-item flex" style={{ whiteSpace: "pre-line" }}>
              <span style={{ color: FONT_COLOR }}>meaning:</span>
              <span>{String(meaning)}</span>
            </div>
          )}
        </div>
      ) : null}

      {/* Multi-series values (if render multiple yLineFields) */}
      {multiValues.length > 1 &&
        multiValues.map((m) => (
          <div key={`tt-${m.key}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                display: "inline-block",
                background: m.color,
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            />
            <span style={{ color: FONT_COLOR }}>{m.name}:</span>{" "}
            {tooltipValueFormatter ? tooltipValueFormatter(m.value) : m.value}
          </div>
        ))}
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
  // the x-value for this tooltip (e.g. date)
  label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  xFieldKey: PropTypes.string,
  xLabelKey: PropTypes.string,
  yLabel: PropTypes.string,
  yFieldKey: PropTypes.string,
  tooltipLabelFormatter: PropTypes.func,
  tooltipValueFormatter: PropTypes.func,
  yFieldValueFormatter: PropTypes.func,
};
