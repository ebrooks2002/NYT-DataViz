// Set dimensions based on container size
 const wordcloudContainer = document.getElementById('wordcloud');
 const wcWidth = wordcloudContainer.clientWidth;
 const wcHeight = wordcloudContainer.clientHeight;
 // Must match the font the SVG renders in (see styles.css) so the cloud layout
 // measures the same glyph widths the reader ends up seeing.
 const WC_FONT = "Libre Franklin";
 const WC_WEIGHT = 600;

 // Resolve as soon as the render font is available, falling back to running
 // immediately in browsers without the Font Loading API.
 function whenFontReady(run) {
     if (!document.fonts || !document.fonts.load) { run(); return; }
     Promise.race([
         document.fonts.load(`${WC_WEIGHT} 40px "${WC_FONT}"`).then(() => document.fonts.ready),
         new Promise(resolve => setTimeout(resolve, 2000)) // never block on a slow CDN
     ]).then(run, run);
 }

 // Color tracks Growth on a one-hue blue ramp, reinforcing the font-size scale.
 // The ten-hue cycle this replaces assigned color by array index, so a word's
 // color reflected its position in the CSV rather than anything in the data.

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

         // Shade by the laid-out font size rather than by Growth directly: the
         // cloud layout overwrites each word's `size` with the computed pixel size,
         // and since fontSizeScale is monotonic in Growth the ordering is identical.
         const wcColor = d3.scaleQuantize()
             .domain(fontSizeScale.range())
             .range(NYT.wordcloudRamp);

         const layout = d3.layout.cloud()
             .size([wcWidth, wcHeight])
             .words(filteredData.map(d => ({ text: d.Keyword, size: d['Growth'] })))
             .padding(6)
             .rotate(() => 0) // Set rotation to 0 for all words
             // The layout measures each word to place it, so its font must match
             // what the SVG actually renders — otherwise the collision test is
             // computed against different glyph widths than the reader sees.
             .font(WC_FONT)
             .fontWeight(WC_WEIGHT)
             .fontSize(d => fontSizeScale(d.size))
             .on("end", draw);

         // Lay out only once the webfont has actually loaded. Starting earlier
         // would measure the fallback face and place words that then overlap.
         whenFontReady(() => layout.start());

         function draw(words) {
             wcSvg.selectAll("*").remove();
             wcSvg.selectAll("text")
                 .data(words)
                 .enter().append("text")
                 .style("font-size", d => `${d.size}px`)
                 .style("font-family", WC_FONT)
                 .style("font-weight", WC_WEIGHT)
                 .style("fill", d => wcColor(d.size))
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
