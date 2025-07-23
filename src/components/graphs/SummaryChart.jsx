import React from "react";
import PropTypes from "prop-types";
import Alert from "@mui/material/Alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { isEmptyArray } from "../../util";
import { COLORS, LEGEND_ICON_TYPES } from "../../config/chart_config";
import { getShape } from "./shapes";

export default function LineCharts(props) {
  const { data, keys } = props;

  if (isEmptyArray(data)) return <Alert severity="warning">No chart data available</Alert>;

  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={420}
      minHeight={380}
      style={{
        boxShadow:
          "0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12)",
      }}
    >
      <LineChart data={data} margin={{ top: 25, right: 64, left: 20, bottom: 24 }} width={730} height={420}>
        <CartesianGrid strokeDasharray="2 2" />
        <XAxis
          angle={270}
          height={80}
          dataKey="date"
          interval="preserveStartEnd"
          tickFormatter={(item) => new Date(item).toISOString().substring(0, 10)}
          tick={{dy: 40, dx: -4, fontWeight: 500, fontSize: "12px"}}
        />
        <YAxis type="number" tick={{fontWeight: 500, fontSize: "12px"}} width={32} />
        <Tooltip />
        <Legend align="left" verticalAlign="middle" layout="vertical" iconSize={12}></Legend>
        {keys.map((key, index) => (
          <Line
            name={key}
            dataKey={key}
            stroke={COLORS[index]}
            key={`${key}_line_${index}`}
            legendType={LEGEND_ICON_TYPES[index] ?? "circle"}
            dot={(props) => getShape(LEGEND_ICON_TYPES[index] ?? "circle", props)}
            activeDot={(props) => getShape(LEGEND_ICON_TYPES[index] ?? "circle", { ...props, stroke: "#444" })}
            isAnimationActive={false}
            animationBegin={400}
            strokeWidth={2}
            connectNulls={true}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

LineCharts.propTypes = {
  data: PropTypes.array,
  keys: PropTypes.array,
};
