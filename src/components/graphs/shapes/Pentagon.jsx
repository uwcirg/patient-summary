import React from "react";
import PropTypes from "prop-types";

const Pentagon = (props) => {
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
     <polygon points="12,2 22,9 18,20 6,20 2,9" />
    </svg>
  );
};
export default Pentagon;

Pentagon.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  stroke: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  isHovered: PropTypes.bool,
};
