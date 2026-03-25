import React from "react";
import PropTypes from "prop-types";

const Parallelogram = (props) => {
  const { cx, cy, stroke, width = 11, height = 11, isHovered = false } = props;
  return (
    <svg
      x={cx - width / 2}
      y={cy - height / 2}
      width={isHovered ? width * 1.2 : width}
      height={isHovered ? height * 1.2 : height}
      viewBox="0 0 24 24"
      fill={stroke}
    >
     <polygon points="6,4 22,4 18,20 2,20" />
    </svg>
  );
};
export default Parallelogram;

Parallelogram.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  stroke: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  isHovered: PropTypes.bool,
};
