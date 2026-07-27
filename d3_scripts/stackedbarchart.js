// Horizontal bars. With ~24 sections, vertical bars force the section names to
// rotate, and at a ~22px band width the rotated labels collide with each other.
// Laying the bars on their side lets every name read horizontally at full size.
const sbMargin = { top: 34, right: 24, bottom: 46, left: 112 };
const sbContainer = document.getElementById('stackedbarchart');
const sbWidth = sbContainer.clientWidth - sbMargin.left - sbMargin.right;
const sbHeight = (sbContainer.clientHeight || 600) - sbMargin.top - sbMargin.bottom;

// Create SVG for stacked bar chart
const sbSvg = d3.select("#stackedbarchart")
    .append("svg")
    .attr("width", sbWidth + sbMargin.left + sbMargin.right)
    .attr("height", sbHeight + sbMargin.top + sbMargin.bottom)
    .append("g")
    .attr("transform", `translate(${sbMargin.left}, ${sbMargin.top})`);

// Shared diverging sentiment scale — see d3_scripts/palette.js
const sbColor = d3.scaleOrdinal()
    .domain(NYT.sentimentOrder)
    .range(NYT.sentimentOrder.map(NYT.sentimentColor));

// Load the CSV data
d3.csv("data/nyt_sentiment_filtered.csv").then(rawData => {
    // Convert Year to number
    rawData.forEach(d => {
        d.Year = +d.Year;
        d.Sentiment = d.Sentiment.split(": ")[1]; // Extract sentiment value
    });

    // Get the list of years
    const years = Array.from(new Set(rawData.map(d => d.Year))).sort((a, b) => a - b);

    // Populate the year dropdown
    const yearSelect = d3.select("#yearSelect");
    yearSelect.selectAll("option")
        .data(years)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    // Function to update the chart
    const updateBarChart = selectedYear => {
        // Filter data for the selected year
        const yearData = rawData.filter(d => d.Year === +selectedYear);

        // Aggregate data by section and sentiment
        const nestedData = d3.rollup(
            yearData,
            v => v.length,
            d => d.section_name,
            d => d.Sentiment
        );

        // Prepare data in required format
        const sections = Array.from(nestedData.keys());
        const sentiments = NYT.sentimentOrder;

        const data = sections.map(section => {
            const sentimentCounts = nestedData.get(section) || new Map();
            const total = d3.sum(sentiments, s => sentimentCounts.get(s) || 0);
            return {
                section: section,
                Positive: (sentimentCounts.get("Positive") || 0) / total * 100,
                Neutral: (sentimentCounts.get("Neutral") || 0) / total * 100,
                Negative: (sentimentCounts.get("Negative") || 0) / total * 100,
            };
        });

        // Rank by negative share. The panel asks which sections lean most negative
        // and which most positive, so ordering by the encoded value puts the answer
        // at the two ends of the chart; alphabetical order hid it.
        data.sort((a, b) => b.Negative - a.Negative);

        // Clear previous content
        sbSvg.selectAll("*").remove();

        // Set up scales — percentage runs along x, one band per section down y
        const x = d3.scaleLinear()
            .domain([0, 100])
            .range([0, sbWidth]);

        const y = d3.scaleBand()
            .domain(data.map(d => d.section))
            .range([0, sbHeight])
            .padding(0.28);

        // Vertical gridlines behind the bars give the eye something to compare
        // shares against without a number on every segment.
        sbSvg.append("g")
            .attr("class", "axis grid")
            .attr("transform", `translate(0, ${sbHeight})`)
            .call(d3.axisBottom(x)
                .tickValues([25, 50, 75, 100])
                .tickSize(-sbHeight)
                .tickFormat(() => ""));

        // Add X axis
        sbSvg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0, ${sbHeight})`)
            .call(d3.axisBottom(x)
                .tickValues([0, 25, 50, 75, 100])
                .tickFormat(d => `${d}%`));

        // Add Y axis — section names, read horizontally
        sbSvg.append("g")
            .attr("class", "axis cat")
            .call(d3.axisLeft(y).tickSize(0))
            .call(g => g.select(".domain").remove());

        // Stack the data
        const stackedData = d3.stack()
            .keys(sentiments)
            (data);

        // Draw the bars
        sbSvg.selectAll(".serie")
            .data(stackedData)
            .enter().append("g")
            .attr("class", "serie")
            .attr("fill", d => sbColor(d.key))
            .selectAll("rect")
            .data(d => d)
            .enter().append("rect")
            .attr("y", d => y(d.data.section))
            .attr("x", d => x(d[0]))
            // 2px surface gap separates stacked segments instead of a border
            .attr("width", d => Math.max(0, x(d[1]) - x(d[0]) - NYT.marks.gap))
            .attr("height", y.bandwidth())
            .append("title")
            .text(function (d) {
                const sentiment = this.parentNode.__data__.key;
                const percentage = (d[1] - d[0]).toFixed(1);
                return `${d.data.section}\n${sentiment}: ${percentage}%`;
            });

        // Add X axis label
        sbSvg.append("text")
            .attr("class", "axis-label")
            .attr("x", sbWidth / 2)
            .attr("y", sbHeight + 38)
            .style("text-anchor", "middle")
            .text("Share of the section's articles");

        // Legend sits in one row above the plot, so it never covers a bar.
        const legend = sbSvg.selectAll(".legend")
            .data(sentiments)
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(${i * 96}, -22)`);

        legend.append("rect")
            .attr("width", 12)
            .attr("height", 12)
            .style("fill", sbColor);

        legend.append("text")
            .attr("x", 18)
            .attr("y", 10)
            .style("text-anchor", "start")
            .text(d => d);
    };
    // Initial render with the first available year
    updateBarChart(years[0]);

    // Update chart when year changes
    yearSelect.on("change", function () {
        const selectedYear = this.value;
        updateBarChart(selectedYear);
    });
}).catch(error => {
    console.error('Error loading or processing data:', error);
});
