import React, { useRef } from "react";
import PropTypes from "prop-types";
import Error from "./ErrorComponent";
import BarChart from "./graphs/BarCharts";
import LineChart from "./graphs/LineCharts";
const Chart = (props) => {
  const eligibleCharts = ["linechart", "barchart"];
  const chartRef = useRef();
  const { key, ...rest } = props.data;
  return (
    <div
      className="chart__container"
      style={{
        width: {
          sm: "100%",
          md: "50%",
        },
      }}
      ref={chartRef}
    >
      {props.type === "linechart" && <LineChart {...rest}></LineChart>}
      {props.type === "barchart" && <BarChart {...rest}></BarChart>}
      {eligibleCharts.indexOf(props.type) === -1 && <Error message="Graph type specified is not available."></Error>}
      {/* other types of graph go here */}
    </div>
  );
};
Chart.propTypes = {
  data: PropTypes.shape({
    key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    data: PropTypes.array,
    type: PropTypes.string,
    title: PropTypes.string,
    chartWidth: PropTypes.number,
    chartHeight: PropTypes.number,
    yAxisTitle: PropTypes.string,
    yFieldKey: PropTypes.string,
    yLabel: PropTypes.string,
    yLabelVisible: PropTypes.bool,
    yDomain: PropTypes.array,
    yTicks: PropTypes.array,
    yTickFormatter: PropTypes.func,
    yLineFields: PropTypes.array,
    xTickFormatter: PropTypes.func,
    xFieldKey: PropTypes.string,
    xAxisTitle: PropTypes.string,
    xLabel: PropTypes.string,
    xLabelVisible: PropTypes.bool,
    dataFormatter: PropTypes.func,
    tooltipLabelFormatter: PropTypes.func,
  }),
  type: PropTypes.string.isRequired,
};
export default Chart;
