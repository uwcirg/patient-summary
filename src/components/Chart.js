import PropTypes from "prop-types";
import Error from "./ErrorComponent";
import LineChart from "./graphs/LineCharts";
const Chart = (props) => {
  const eligibleCharts = ["linechart"];
  return (
    <div className="chart__container">
      {props.type === "linechart" && <LineChart {...props.data}></LineChart>}
      {eligibleCharts.indexOf(props.type) === -1 && <Error message="Graph type specified is not available."></Error>}
      {/* other types of graph go here */}
    </div>
  );
};
Chart.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    data: PropTypes.array,
    type: PropTypes.string,
    title: PropTypes.string,
    chartWidth: PropTypes.number,
    chartHeight: PropTypes.number,
    yAxisTitle: PropTypes.string,
    yFieldKey: PropTypes.string,
    yLabel: PropTypes.string,
    yDomain: PropTypes.array,
    yTicks: PropTypes.array,
    yTickFormatter: PropTypes.func,
    yLineFields: PropTypes.array,
    xTickFormatter: PropTypes.func,
    xFieldKey: PropTypes.string,
    xAxisTitle: PropTypes.string,
    xLabel: PropTypes.string,
    dataFormatter: PropTypes.func,
    tooltipLabelFormatter: PropTypes.func,
  }),
  type: PropTypes.string.isRequired,
};
export default Chart;
