import React from "react";
import PropTypes from "prop-types";

const Octagon = (props) => {
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
      <polygon points="8,2 16,2 22,8 22,16 16,22 8,22 2,16 2,8" />
    </svg>
  );
};
export default Octagon;

Octagon.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  stroke: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  isHovered: PropTypes.bool,
};
