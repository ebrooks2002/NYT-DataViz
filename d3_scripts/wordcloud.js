// Set dimensions based on container size
 const wordcloudContainer = document.getElementById('wordcloud');
 const wcWidth = wordcloudContainer.clientWidth;
 const wcHeight = wordcloudContainer.clientHeight;
 const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

 // Create SVG for word cloud
 const wcSvg = d3.select("#wordcloud")
     .append("svg")
     .attr("width", wcWidth)
     .attr("height", wcHeight)
     .append("g")
     .attr("transform", `translate(${wcWidth / 2}, ${wcHeight / 2})`);

 // Load the CSV data
 d3.csv("data/nyt_keyword_growth_final.csv").then(data => {
     // Convert numerical columns from strings to numbers
     data.forEach(d => {
         d['Growth'] = +d['Growth'];
         d.Year = +d.Year;
     });

     // Extract and sort unique years for the dropdown
     const wcYears = Array.from(new Set(data.map(d => d.Year))).sort((a, b) => a - b);
     const wcYearFilter = d3.select("#wordcloud-year");
     wcYears.forEach(year => {
         wcYearFilter.append("option").text(year).attr("value", year);
     });

     // Function to update the word cloud based on selected year
     function updateWordCloud(selectedYear) {
         const filteredData = data.filter(d => d.Year == selectedYear);

         // Define font size scale
         const growthExtent = d3.extent(filteredData, d => d['Growth']);
         const fontSizeScale = d3.scaleLinear()
             .domain(growthExtent)
             .range([20, 50]); // Adjust font size range as needed

         const layout = d3.layout.cloud()
             .size([wcWidth, wcHeight])
             .words(filteredData.map(d => ({ text: d.Keyword, size: d['Growth'] })))
             .padding(5)
             .rotate(() => 0) // Set rotation to 0 for all words
             .fontSize(d => fontSizeScale(d.size))
             .on("end", draw);

         layout.start();

         function draw(words) {
             wcSvg.selectAll("*").remove();
             wcSvg.selectAll("text")
                 .data(words)
                 .enter().append("text")
                 .style("font-size", d => `${d.size}px`)
                 .style("fill", (d, i) => colorScale(i))
                 .attr("text-anchor", "middle")
                 .attr("transform", d => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`)
                 .text(d => d.text);
         }
     }

     // Initial render with the first available year
     updateWordCloud(wcYears[0]);

     // Update the word cloud when year filter changes
     wcYearFilter.on("change", () => {
         const selectedYear = wcYearFilter.property("value");
         updateWordCloud(selectedYear);
     });
 }).catch(error => {
     console.error('Error loading or parsing data:', error);
 });
