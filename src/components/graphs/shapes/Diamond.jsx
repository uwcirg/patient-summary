import React from "react";
import PropTypes from "prop-types";

const Diamond = (props) => {
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
      <polygon points="12,2 24,12 12,24 2,12" />
    </svg>
  );
};
export default Diamond;

Diamond.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  width: PropTypes.number,
  height: PropTypes.number,
  stroke: PropTypes.string,
  isHovered: PropTypes.bool,
};
