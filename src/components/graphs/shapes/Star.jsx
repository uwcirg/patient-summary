import React from "react";
import PropTypes from "prop-types";

const Star = (props) => {
  const { cx, cy, stroke, width = 12, height = 12, isHovered = false } = props;
  console.log("isHovered ", isHovered)
  return (
    <svg
      x={cx - width / 2}
      y={cy - height / 2}
      width={isHovered ? width * 1.2 : width}
      height={isHovered ? height * 1.2 : height}
      viewBox="0 0 24 24"
      fill={stroke}
    >
      <polygon points="12,2 15,10 23,10 17,15 19,23 12,18 5,23 7,15 1,10 9,10" />
    </svg>
  );
};

export default Star;

Star.propTypes = {
  cx: PropTypes.number,
  cy: PropTypes.number,
  width: PropTypes.number,
  height: PropTypes.number,
  isHovered: PropTypes.bool,
  stroke: PropTypes.string,
};
