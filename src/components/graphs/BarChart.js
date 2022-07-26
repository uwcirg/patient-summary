import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import { useEffect, useCallback } from "react";
import * as d3 from "d3";
import _ from "lodash";
export default function BarChart(props) {
  const theme = useTheme();
  const {
    chartWidth,
    chartHeight,
    yFieldKey,
    xFieldKey,
    title,
    xAxisTitle,
    yAxisTitle,
    data,
  } = props;
  let svg,
    chart,
    margin = 48;
  const hasData = useCallback(() => {
    return data && data.length > 0;
  }, [data]);
  const renderChart = useCallback(() => {
    if (!hasData()) return;
    //draw svg element in which chart will be drawn
    initSvg();
    //draw chart space on svg
    initChart();
    //draw chart title
    initChartTitle();
    //draw x and y scales
    const { xScale, yScale } = drawScales();
    //draw rectangular bars based on data
    drawBars(xScale, yScale);
    // eslint-disable-next-line
  }, [data]);
  const initSvg = () => {
    svg = d3
      .select("#barGraph")
      .append("svg")
      .attr("width", chartWidth)
      .attr("height", chartHeight);
  };
  const initChart = () => {
    chart = svg
      .attr(
        "viewBox",
        `0 0 ${chartWidth + margin * 2} ${chartHeight + margin * 4.5}`
      )
      .append("g")
      .attr("transform", `translate(${margin}, ${margin * 2 + margin / 6})`);
  };
  const initChartTitle = () => {
    svg
      .append("text")
      .style("fill", theme.palette.secondary.main)
      .style("font-weight", 500)
      .style("font-size", "1.4rem")
      .attr("x", chartWidth / 2 + margin)
      .attr("y", margin + margin * 0.25)
      .attr("text-anchor", "middle")
      .text(title);
  };
  const drawScales = () => {
     const yScale = drawYScale();
     //draw x scale
     const xScale = drawXScale();
     return { yScale, xScale };
  }
  const drawYScale = () => {
    const maxYValue = _.maxBy(data, (item) => item[yFieldKey]).total || 0;
    const yScale = d3
      .scaleLinear()
      .range([chartHeight, 0])
      .domain([0, maxYValue]);
    chart.append("g").call(d3.axisLeft(yScale).ticks(maxYValue));
    //label
    svg
      .append("text")
      .attr("class", "label")
      .attr("x", -(chartHeight / 2) - margin * 2)
      .attr("y", 0)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .text(yAxisTitle);
    return yScale;
  };
  const drawXScale = () => {
    const xScale = d3
      .scaleBand()
      .range([0, chartWidth])
      .domain(data.map((item) => item[xFieldKey]))
      .padding(0.65);
    chart
      .append("g")
      .attr("transform", `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .attr("dy", "1.1em");
    //label
    svg
      .append("text")
      .attr("class", "label")
      .attr("x", chartWidth / 2 + margin)
      .attr("y", chartHeight + margin * 3.75)
      .attr("text-anchor", "middle")
      .text(xAxisTitle);
    return xScale;
  };
  const drawBars = (xScale, yScale) => {
    const xKey = xFieldKey;
    const yKey = yFieldKey;
    let barGroups = chart.selectAll("rect").data(data).enter();
    barGroups
      .append("rect")
      .attr("class", "bar")
      .style("fill", theme.palette.primary.main)
      .attr("x", (g) => {
        let scaleVal = xScale(g[xKey]);
        return scaleVal;
      })
      .attr("y", (g) => {
        let scaleVal = yScale(g[yKey]);
        return scaleVal;
      })
      .attr("height", (g) => chartHeight - yScale(g[yKey]))
      .attr("width", xScale.bandwidth())
      .on("mouseenter", function (actual, i) {
        if (!i[yKey]) return;
        d3.select(this)
          .transition()
          .delay(50)
          .duration(300)
          .attr("opacity", 0.4)
          .attr("x", (a) => xScale(a[xKey]) - 5)
          .attr("width", xScale.bandwidth() + 10);
        barGroups
          .append("text")
          .attr("class", "value")
          .attr("x", (a) => xScale(a[xKey]) + xScale.bandwidth() / 2)
          .attr("y", (a) => yScale(a[yKey]) + 40)
          .attr("text-anchor", "middle")
          .text((a, idx) => {
            let targetIndex = data.findIndex((item) => item.index === i.index);
            return idx !== targetIndex ? "" : a[yKey];
          })
          .style("font-weight", 500);
      })
      .on("mouseleave", function () {
        d3.selectAll(".bar").attr("opacity", 1);
        d3.select(this)
          .transition()
          .duration(300)
          .attr("opacity", 1)
          .attr("x", (a) => xScale(a[xKey]))
          .attr("width", xScale.bandwidth());
        svg.selectAll(".value").remove();
      });
    return barGroups;
  };

  const cleanUpSvg = useCallback(() => {
    if (typeof svg !== "undefined" && (svg !== null || !hasData()))
      svg.remove();
  }, [svg, hasData]);

  useEffect(() => {
    renderChart();
    return () => {
      cleanUpSvg();
    };
  }, [renderChart, cleanUpSvg]);

  return <div id="barGraph"></div>;
}

BarChart.propTypes = {
  data: PropTypes.array,
  title: PropTypes.string,
  chartWidth: PropTypes.number,
  chartHeight: PropTypes.number,
  xFieldKey: PropTypes.string,
  yFieldKey: PropTypes.string,
  xAxisTitle: PropTypes.string,
  yAxisTitle: PropTypes.string,
};
