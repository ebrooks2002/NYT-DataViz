// NYT-inspired chart palette — the single source of truth for every visualization.
//
// Derived in the New York Times editorial idiom (near-black ink, warm neutral
// greys, restrained accent hues, hairline chrome) and validated against the
// data-viz color checks: OKLCH lightness band, chroma floor, CVD separation
// under simulated protanopia/deuteranopia, and WCAG contrast vs the surface.
//
// Measured results on the white card surface:
//   poles blue<->red   CVD dE 17.0 (protan), normal-vision dE 26.4
//   neutral vs poles   CVD dE 11.9 (deutan)
//   contrast           blue 5.56, red 5.40, grey 3.32 (all >= 3:1)
//
// The grey midpoint sits below the chroma floor on purpose: a diverging scale
// takes two hues plus a NEUTRAL middle, so "reads as grey" is the intent here.
//
// Keep these values in sync with the CSS custom properties in styles.css.
window.NYT = (function () {
    const ink = {
        primary: "#121212",   // near-black, not pure black
        secondary: "#4a4a4a",
        muted: "#6e6e6e",
        axis: "#8b8b8b",      // axis text + tick marks
        hairline: "#e2e2e2",  // gridlines, borders
        surface: "#ffffff",   // chart card surface
        page: "#f7f7f7"       // page plane behind the cards
    };

    // Diverging: sentiment is polarity data, so it takes two opposed hues with a
    // neutral midpoint. blue<->red is CVD-safe; the green<->red it replaces was not.
    const sentiment = {
        Positive: "#2b6ca3",
        Neutral: "#8f8d88",
        Negative: "#bf3b34"
    };

    const series = ["#2b6ca3", "#bf3b34", "#c58f2b", "#3a7d73"];

    // Sequential ramps — one hue, light->dark, for magnitude.
    //
    // Both validated as ordinal ramps: monotone lightness, every adjacent gap
    // >= 0.06 OKLCH L, hue spread 5 degrees (one hue), light end clear of the
    // surface. Note that these encode the same quantity the tile area and the
    // font size already do; that redundancy is a deliberate, accepted choice.
    //
    // Treemap tiles: light end 2.90:1 on white, so the smallest tiles stay
    // visible even when they are too small to carry a label.
    const treemapRamp = ["#6b9dc3", "#4882ad", "#2b6ca3", "#20567f", "#14405f"];

    // Word cloud words are TEXT, so every step has to be readable type, not just
    // a visible fill. Lighter blues were dropped: #6fa0c6 measures 2.79:1, which
    // fails at the 20px low end of the font scale. These four run 4.08 -> 11.46:1.
    const wordcloudRamp = ["#4a83ae", "#2b6ca3", "#1f5480", "#153c5c"];

    // WCAG relative luminance -> contrast ratio, so label color is computed
    // against the actual fill rather than guessed per step.
    function luminance(hex) {
        const c = [1, 3, 5].map(function (i) {
            const v = parseInt(hex.slice(i, i + 2), 16) / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }

    function contrast(a, b) {
        const l = [luminance(a), luminance(b)].sort(function (x, y) { return y - x; });
        return (l[0] + 0.05) / (l[1] + 0.05);
    }

    return {
        ink: ink,
        sentiment: sentiment,
        series: series,
        slot1: series[0],
        treemapRamp: treemapRamp,
        wordcloudRamp: wordcloudRamp,
        contrast: contrast,
        // Whichever of ink / surface is more legible on the given fill. The
        // treemap ramp crosses over mid-scale: the two lightest steps take ink,
        // the three darkest take white.
        labelOn: function (fill) {
            return contrast(ink.surface, fill) >= contrast(ink.primary, fill)
                ? ink.surface
                : ink.primary;
        },
        // Fixed order for stacks, lines and legends, so a series never changes
        // color when the data or the filter changes.
        sentimentOrder: ["Positive", "Neutral", "Negative"],
        sentimentColor: function (name) {
            return sentiment[name] || ink.muted;
        },
        // Mark specs shared across charts.
        marks: {
            strokeWidth: 2,   // thin lines
            gap: 2            // surface-colored gap between adjacent fills
        }
    };
})();
