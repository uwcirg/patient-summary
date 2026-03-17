import { Dot } from "recharts";
import Square from "./Square";
import Rectangle from "./Rectangle";
import Cross from "./Cross";
import Star from "./Star";
import Diamond from "./Diamond";
import Ring from "./Ring";
import Triangle from "./Triangle";
import Wye from "./Wye";
import Asterisk from "./Asterisk";
import Times from "./Times";

export const getShape = (shape, props) => {
  const { key, ...otherProps } = props;
  switch (shape) {
    case "asterisk":
      return <Asterisk key={key} {...otherProps}></Asterisk>;
    case "cross":
      return <Cross key={key} {...otherProps}></Cross>;
    case "diamond":
      return <Diamond key={key} {...otherProps}></Diamond>;
    case "rect":
    case "rectangle":
      return <Rectangle key={key} {...otherProps}></Rectangle>;
    case "ring":
      return <Ring key={key} {...otherProps}></Ring>;
    case "square":
      return <Square key={key} {...otherProps}></Square>;
    case "star":
      return <Star key={key} {...otherProps}></Star>;
    case "times":
      return <Times key={key} {...otherProps}></Times>;
    case "triangle":
      return <Triangle key={key} {...otherProps}></Triangle>;
    case "wye":
      return <Wye key={key} {...otherProps}></Wye>;
    default:
      return <Dot key={key} {...otherProps} fill={otherProps.stroke}></Dot>;
  }
};
