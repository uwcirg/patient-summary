import React from "react";
import PropTypes from "prop-types";

const Cross = (props) => {
  const { cx=0, cy=0, stroke, width = 10, height = 10, isHovered = false } = props;
  return (
    <svg
      x={cx - 5}
      y={cy - 5}
      width={isHovered ? width * 1.2 : width}
      height={isHovered ? height * 1.2 : height}
      viewBox="0 0 20 20"
      fill={stroke}
    >
      <line x1="0" y1="10" x2="20" y2="10" stroke={stroke} strokeWidth="6" />
      <line x1="10" y1="0" x2="10" y2="20" stroke={stroke} strokeWidth="6" />
    </svg>
  );
};

export default Cross;

Cross.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  width: PropTypes.number,
  height: PropTypes.number,
  stroke: PropTypes.string,
  isHovered: PropTypes.bool,
};
