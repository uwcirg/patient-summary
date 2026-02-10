import React from "react";
import PropTypes from "prop-types";
import { ALERT_COLOR, SUCCESS_COLOR, WARNING_COLOR, getDotColor } from "@config/chart_config";
import { isEmptyArray } from "@/util";

const SourceDot = ({
  cx,
  cy,
  dotRadius,
  isSmallScreen,
  sources,
  yFieldKey = "score",
  xFieldKey = "date",
  payload,
  index,
  params,
  dotColor,
}) => {
  if (isEmptyArray(sources)) return null;
  if (cx == null || cy == null) return null;
  const useParams = params ? params : {};

  // Determine base color first
  let baseColor;

  // use severity-based coloring first
  if (payload.highSeverityScoreCutoff && payload[yFieldKey] >= payload.highSeverityScoreCutoff) {
    baseColor = ALERT_COLOR;
  } else if (payload.mediumSeverityScoreCutoff && payload[yFieldKey] >= payload.mediumSeverityScoreCutoff) {
    baseColor = WARNING_COLOR;
  } else {
    baseColor = payload.highSeverityScoreCutoff || payload.mediumSeverityScoreCutoff ? SUCCESS_COLOR : dotColor;
  }

  // Apply duplicate coloring
  const color = getDotColor(payload, baseColor);

  const k = `dot-${payload?.id}_${payload?.key}_${payload?.source}-${payload?.[xFieldKey]}-${index}`;


  // Responsive dot size with custom radius support
  const defaultDotSize = isSmallScreen ? 4 : 5;
  const defaultRectSize = isSmallScreen ? 5 : 6;
  const dotSize = dotRadius || useParams.r || defaultDotSize;
  const rectSize = dotRadius ? dotRadius * 2 : useParams.width || defaultRectSize;
   const hitR = Math.max(14, dotSize * 3.25);

  const shape =
    String(payload.source).toLowerCase() === "epic" ? (
      <rect
        x={cx - rectSize / 2}
        y={cy - rectSize / 2}
        width={rectSize}
        height={rectSize}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        style={{ pointerEvents: "none" }}
      />
    ) : (
      <circle
        cx={cx}
        cy={cy}
        r={dotSize}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        style={{ pointerEvents: "none" }}
      />
    );

  return (
    <g key={k}>
      {/* invisible hit target */}
      <circle cx={cx} cy={cy} r={hitR} fill="transparent" stroke="transparent" />
      {shape}
    </g>
  );
};

export default SourceDot;

SourceDot.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  dotRadius: PropTypes.number,
  activeDotRadius: PropTypes.number,
  isSmallScreen: PropTypes.bool,
  xFieldKey: PropTypes.string,
  yFieldKey: PropTypes.string,
  payload: PropTypes.object,
  index: PropTypes.number,
  params: PropTypes.object,
  sources: PropTypes.array,
  dotColor: PropTypes.string,
};
