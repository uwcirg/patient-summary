import React from "react";
import { ALERT_COLOR, SUCCESS_COLOR, getDotColor } from "@config/chart_config";
import SourceDot from "./SourceDot";
import { isEmptyArray } from "@/util";
/**
 * Determines the base color for a dot based on severity
 * @param {Object} payload - Data point payload
 * @param {*} value - Y value
 * @param {string} defaultColor - Default color if no severity rules apply
 * @returns {string} Base color before duplicate adjustments
 */
export const getSeverityBaseColor = (payload, value, defaultColor) => {
  if (payload.highSeverityScoreCutoff) {
    return value >= payload.highSeverityScoreCutoff ? ALERT_COLOR : SUCCESS_COLOR;
  }
  return defaultColor;
};

/**
 * Renders a dot for the chart based on source data or severity
 * @param {Object} props - Dot properties from Recharts
 * @param {number} props.cx - X coordinate
 * @param {number} props.cy - Y coordinate
 * @param {Object} props.payload - Data point payload
 * @param {number} props.value - Y value
 * @param {number} props.index - Data point index
 * @param {Object} config - Configuration object
 * @param {Array} config.sources - Array of data sources
 * @param {boolean} config.isSmallScreen - Whether screen is small
 * @param {string} config.xFieldKey - X field key
 * @param {string} config.yFieldKey - Y field key
 * @param {string} config.dotColor - Default dot color
 * @param {boolean} config.isActive - Whether this is an active (hovered) dot
 * @param {Object} config.params - Additional parameters (r, width, height for sizing)
 * @param {number} config.dotRadius - Custom dot radius (overrides default sizing)
 * @param {number} config.activeDotRadius - Custom active dot radius
 */
export const renderChartDot = (props, config) => {
  const { cx, cy, payload, value, index } = props;
  const {
    dotRadius,
    activeDotRadius,
    sources,
    isSmallScreen,
    xFieldKey,
    yFieldKey,
    dotColor,
    isActive = false,
    params = {},
  } = config;

  // Determine radius based on custom radius, active state, and screen size
  let radius;
  if (isActive) {
    radius = activeDotRadius || (isSmallScreen ? 4 : 5);
  } else {
    radius = dotRadius || (isSmallScreen ? 2 : 4);
  }

  // If we have source-based data, use SourceDot component
  if (!isEmptyArray(sources)) {
    return (
      <SourceDot
        key={`${payload?.id}_${index}`}
        cx={cx}
        cy={cy}
        payload={payload}
        index={index}
        isSmallScreen={isSmallScreen}
        sources={sources}
        xFieldKey={xFieldKey}
        yFieldKey={yFieldKey}
        params={params}
        dotColor={dotColor} // Pass the custom dot color
        dotRadius={radius} // Pass custom radius
      />
    );
  }

  // Get base color based on severity
  const baseColor = getSeverityBaseColor(payload, value, dotColor);

  // Apply duplicate coloring
  const color = getDotColor(payload, baseColor);
  return (
    <circle
      key={`dot-${isActive ? "active-" : ""}${payload?.id}_${index}`}
      cx={cx}
      cy={cy}
      r={params.r || radius}
      fill={color}
      stroke="#fff"
      strokeWidth={2}
    />
  );
};

/**
 * Creates a dot renderer function for Recharts Line component
 * @param {Object} config - Configuration object
 * @param {Array} config.sources - Array of data sources
 * @param {boolean} config.isSmallScreen - Whether screen is small
 * @param {string} config.xFieldKey - X field key
 * @param {string} config.yFieldKey - Y field key
 * @param {string} config.dotColor - Default dot color
 * @returns {Function} Dot renderer function for Recharts
 */
export const createDotRenderer = (config) => {
  return (props) => {
    return renderChartDot(props, { ...config, isActive: false });
  };
};

/**
 * Creates an active dot renderer function for Recharts Line component
 * @param {Object} config - Configuration object
 * @param {Array} config.sources - Array of data sources
 * @param {boolean} config.isSmallScreen - Whether screen is small
 * @param {string} config.xFieldKey - X field key
 * @param {string} config.yFieldKey - Y field key
 * @param {string} config.dotColor - Default dot color
 * @param {number} config.activeDotRadius - Custom active dot radius
 * @returns {Function} Active dot renderer function for Recharts
 */
export const createActiveDotRenderer = (config) => {
  return (props) => {
    const params = {
      r: config.activeDotRadius || (config.isSmallScreen ? 4 : 5),
      width: config.isSmallScreen ? 6 : 8,
      height: config.isSmallScreen ? 6 : 8,
    };

    return renderChartDot(props, { ...config, isActive: true, params });
  };
};
