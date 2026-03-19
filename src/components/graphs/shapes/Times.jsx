import React from "react";
import PropTypes from "prop-types";

const Times = (props) => {
  const { cx, cy, stroke, width = 10, height = 10, isHovered = false } = props;
  return (
    <svg
      x={cx - width / 2}
      y={cy - height / 2}
      width={isHovered ? width * 1.2 : width}
      height={isHovered ? height * 1.2 : height}
      viewBox="0 0 24 24"
      fill={stroke}
    >
      <path d="M4,2 L12,10 L20,2 L22,4 L14,12 L22,20 L20,22 L12,14 L4,22 L2,20 L10,12 L2,4 Z" />
    </svg>
  );
};
export default Times;

Times.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  width: PropTypes.number,
  height: PropTypes.number,
  stroke: PropTypes.string,
  isHovered: PropTypes.bool,
};
