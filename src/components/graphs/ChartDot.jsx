import { memo } from "react";
import PropTypes from "prop-types";
import { createDotRenderer } from "@components/graphs/ChartDotRenderers";

const ChartDot = memo(function ChartDot({ dotProps, dotConfig, isHovered, onEnter, onLeave }) {
  const { key, ...rest } = dotProps;

  return (
    <g
      onPointerEnter={(e) => {
        e.stopPropagation();
        onEnter(e);
      }}
      onPointerMove={(e) => {
        e.stopPropagation();
        onEnter(e);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onEnter(e);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        onLeave(e);
      }}
      onPointerCancel={(e) => {
        e.stopPropagation();
        onLeave(e);
      }}
    >
      {createDotRenderer({ ...dotConfig, isHovered })(rest)}
    </g>
  );
});
export default ChartDot;

ChartDot.propTypes = {
  dotProps: PropTypes.object,
  dotConfig: PropTypes.object,
  isHovered: PropTypes.bool,
  onEnter: PropTypes.func.isRequired,
  onLeave: PropTypes.func.isRequired,
};
