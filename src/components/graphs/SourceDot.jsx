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
  yFieldKey,
  xFieldKey,
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

  // If a custom dotColor is provided, use it
  if (dotColor) {
    baseColor = dotColor;
  }
  // Otherwise use severity-based coloring
  else if (payload.highSeverityScoreCutoff && payload[yFieldKey] >= payload.highSeverityScoreCutoff) {
    baseColor = ALERT_COLOR;
  } else if (payload.mediumSeverityScoreCutoff && payload[yFieldKey] >= payload.mediumSeverityScoreCutoff) {
    baseColor = WARNING_COLOR;
  } else {
    baseColor = SUCCESS_COLOR;
  }

  // Apply duplicate coloring
  const color = getDotColor(payload, baseColor);

  const k = `dot-${payload?.id}_${payload?.key}_${payload?.source}-${payload?.[xFieldKey]}-${index}`;

  // White stroke for better visibility
  const strokeColor = "#fff";
  const strokeWidth = 2;

  // Responsive dot size with custom radius support
  const defaultDotSize = isSmallScreen ? 3 : 4;
  const defaultRectSize = isSmallScreen ? 6 : 8;
  const dotSize = dotRadius || useParams.r || defaultDotSize;
  const rectSize = dotRadius ? dotRadius * 2 : useParams.width || defaultRectSize;

  switch (String(payload.source).toLowerCase()) {
    case "cnics":
      return <circle key={k} cx={cx} cy={cy} r={dotSize} fill={color} stroke={strokeColor} strokeWidth={strokeWidth} />;
    case "epic":
      return (
        <rect
          key={k}
          x={cx - rectSize / 2}
          y={cy - rectSize / 2}
          width={rectSize}
          height={rectSize}
          fill={color}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      );
    default:
      return <circle key={k} cx={cx} cy={cy} r={dotSize} fill={color} stroke={strokeColor} strokeWidth={strokeWidth} />;
  }
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
