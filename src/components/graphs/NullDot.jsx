import React from "react";
import PropTypes from "prop-types";

const NullDot = ({ isSmallScreen, cx, cy, payload, index }) => {
  if (cx == null || cy == null) return null;

  const size = isSmallScreen ? 6 : 8;
  const strokeWidth = isSmallScreen ? 1.5 : 2;
  const halfSize = size / 2;
  const k = `nulldotsymbol-${payload?.id}_${payload?.key}_${payload?.source}-${index}`;

  return (
    <g key={`null-dot-${k}_${index}`}>
      {/* X symbol made from two diagonal lines */}
      <line
        x1={cx - halfSize}
        y1={cy - halfSize}
        x2={cx + halfSize}
        y2={cy + halfSize}
        stroke="#999"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <line
        x1={cx - halfSize}
        y1={cy + halfSize}
        x2={cx + halfSize}
        y2={cy - halfSize}
        stroke="#999"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </g>
  );
};

export default NullDot;

NullDot.propTypes = {
  isSmallScreen: PropTypes.bool,
  cx: PropTypes.number,
  cy: PropTypes.number,
  payload: PropTypes.object,
  index: PropTypes.number,
};
