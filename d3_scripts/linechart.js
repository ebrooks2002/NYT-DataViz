 // Define margins and dimensions
 // left is wide enough for the tick labels plus the rotated axis label, so that
 // label doesn't crowd the panel's own left border.
 const margin = { top: 40, right: 100, bottom: 50, left: 70 };
 const lineChartContainer = document.getElementById('linechart');
 const lcWidth = lineChartContainer.clientWidth - margin.left - margin.right;
 const lcHeight = (lineChartContainer.clientHeight || 600) - margin.top - margin.bottom; // Default height if not set

 // Create SVG for line chart
 const lcSvg = d3.select("#linechart")
     .append("svg")
     .attr("width", lcWidth + margin.left + margin.right)
     .attr("height", lcHeight + margin.top + margin.bottom)
     .append("g")
     .attr("transform", `translate(${margin.left}, ${margin.top})`);

 const x = d3.scaleLinear().range([0, lcWidth]);
 const y = d3.scaleLinear().range([lcHeight, 0]);

 // Shared diverging sentiment scale — see d3_scripts/palette.js
 const colorMap = NYT.sentiment;

 const line = d3.line()
     .x(d => x(d.year))
     .y(d => y(d.percentage));

 // Load the CSV data
 d3.csv("data/nyt_sentiment_filtered.csv").then(rawData => {
     // Convert Year to number
     rawData.forEach(d => {
         d.Year = +d.Year;
         d.Sentiment = d.Sentiment.split(": ")[1]; // Extract sentiment value
     });

     // Preprocess data to calculate sentiment percentages by year and section
     const data = [];
     const nestedData = d3.rollup(
         rawData,
         v => v.length,
         d => d.section_name,
         d => d.Year,
         d => d.Sentiment
     );

     // Prepare data for plotting — fixed order, so a series keeps its color
     // no matter which section is selected
     const sentiments = NYT.sentimentOrder;
     const sections = Array.from(nestedData.keys()).sort();

     const plotData = {};

     sections.forEach(section => {
         const yearsMap = nestedData.get(section);
         const years = Array.from(yearsMap.keys()).sort();
         plotData[section] = sentiments.map(sentiment => {
             return {
                 sentiment: sentiment,
                 values: years.map(year => {
                     const sentimentsMap = yearsMap.get(year);
                     const totalArticles = d3.sum(sentiments, s => sentimentsMap.get(s) || 0);
                     const count = sentimentsMap.get(sentiment) || 0;
                     return {
                         year: year,
                         percentage: totalArticles ? (count / totalArticles) * 100 : 0
                     };
                 })
             };
         });
     });

     // Populate the section dropdown
     const sectionSelect = d3.select("#sectionSelect");

     sectionSelect.selectAll("option")
         .data(sections)
         .enter()
         .append("option")
         .text(d => d)
         .attr("value", d => d);

     x.domain([
         d3.min(rawData, d => d.Year),
         d3.max(rawData, d => d.Year)
     ]);
     y.domain([0, 100]); // Assuming percentages from 0 to 100

     // Function to update the chart
     const updateChart = section => {
         const dataToPlot = plotData[section];

         // Clear previous content
         lcSvg.selectAll(".axis").remove();
         lcSvg.selectAll(".line").remove();
         lcSvg.selectAll(".legend").remove();

         // Append X axis
         lcSvg.append("g")
             .attr("class", "axis")
             .attr("transform", `translate(0,${lcHeight})`)
             .call(d3.axisBottom(x).tickFormat(d3.format("d")));

         // Append Y axis
         lcSvg.append("g")
             .attr("class", "axis")
             .call(d3.axisLeft(y));

         // Add X axis label
         lcSvg.append("text")
             .attr("class", "axis-label")
             .attr("x", lcWidth / 2)
             .attr("y", lcHeight + 40)
             .style("text-anchor", "middle")
             .text("Year");

         // Add Y axis label
         lcSvg.append("text")
             .attr("class", "axis-label")
             .attr("transform", "rotate(-90)")
             .attr("x", -lcHeight / 2)
             .attr("y", -50)
             .style("text-anchor", "middle")
             .text("Percentage (%)");

         // Draw lines
         lcSvg.selectAll(".line")
             .data(dataToPlot)
             .enter()
             .append("path")
             .attr("class", "line")
             .attr("d", d => line(d.values))
             .style("stroke", d => colorMap[d.sentiment])
             .style("fill", "none")
             .style("stroke-width", NYT.marks.strokeWidth);

         // Add legend
         const legend = lcSvg.selectAll(".legend")
             .data(sentiments)
             .enter()
             .append("g")
             .attr("class", "legend")
             // Sits in the right margin, not over the plot area.
             .attr("transform", (d, i) => `translate(${lcWidth + 12}, ${i * 24})`);

         legend.append("rect")
             .attr("x", 0)
             .attr("y", 0)
             .attr("width", 18)
             .attr("height", 18)
             .style("fill", d => colorMap[d]);

         legend.append("text")
             .attr("x", 25)
             .attr("y", 14)
             .text(d => d);
     };

     sectionSelect.on("change", function () {
         const selectedSection = this.value;
         updateChart(selectedSection);
     });

     // Initial render with the first available section
     updateChart(sections[0]);
 }).catch(error => {
     console.error('Error loading or processing data:', error);
 });