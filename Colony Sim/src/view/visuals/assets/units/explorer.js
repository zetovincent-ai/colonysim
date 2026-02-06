export const explorer = {
    scale: 0.15,
    offset: { x: -50, y: -75 },
    parts: [
        // --- NEW: THE SHADOW (Must be first to render behind feet) ---
        // Semi-transparent black ellipse positioned at the boots' baseline
        { type: "ellipse", cx: 50, cy: 128, rx: 22, ry: 7, fill: "rgba(0,0,0,0.2)" },

        // --- EXISTING PARTS ---
        { type: "path", d: "M 35 50 C 35 50, 32 95, 40 100 L 60 100 C 68 95, 65 50, 65 50 Z", fill: "url(#exp_brown)" },
        { type: "path", d: "M 38 52 Q 50 45 62 52", stroke: "#4E342E", "stroke-width": 0.5, fill: "none" },
        { type: "rect", x: 38, y: 90, width: 10, height: 35, rx: 2, fill: "url(#exp_brown)" },
        { type: "path", d: "M 37 120 L 49 120 L 49 125 Q 49 130 43 130 L 37 130 Z", fill: "url(#exp_boot)" },
        { type: "rect", x: 52, y: 90, width: 10, height: 35, rx: 2, fill: "url(#exp_brown)" },
        { type: "path", d: "M 51 120 L 63 120 L 63 125 Q 63 130 57 130 L 51 130 Z", fill: "url(#exp_boot)" },
        { type: "path", d: "M 35 45 Q 35 40 40 38 L 60 38 Q 65 40 65 45 L 62 95 L 38 95 Z", fill: "url(#exp_shirt)" },
        { type: "circle", cx: 50, cy: 50, r: 1.5, fill: "#EFEFEF" },
        { type: "circle", cx: 50, cy: 60, r: 1.5, fill: "#EFEFEF" },
        { type: "circle", cx: 50, cy: 70, r: 1.5, fill: "#EFEFEF" },
        { type: "rect", x: 46, y: 30, width: 8, height: 10, fill: "url(#exp_skin)" },
        { type: "ellipse", cx: 50, cy: 25, rx: 10, ry: 12, fill: "url(#exp_skin)" },
        { type: "path", d: "M 50 25 L 48 30 L 52 30 Z", fill: "#D69B73" },
        { type: "circle", cx: 46, cy: 24, r: 1.5, fill: "#333" },
        { type: "circle", cx: 54, cy: 24, r: 1.5, fill: "#333" },
        { type: "path", d: "M 47 34 Q 50 36 53 34", stroke: "#A07050", "stroke-width": 0.5, fill: "none" },
        { type: "path", d: "M 30 18 C 30 25, 70 25, 70 18 C 70 12, 30 12, 30 18 Z", fill: "#5D4037" },
        { type: "path", d: "M 38 17 L 40 5 Q 50 8 60 5 L 62 17 Z", fill: "url(#exp_hat)" },
        { type: "path", d: "M 38 15 Q 50 18 62 15 L 62 17 Q 50 20 38 17 Z", fill: "#3E2723" },
        { type: "path", d: "M 38 42 Q 32 60 35 75", stroke: "url(#exp_shirt)", "stroke-width": 7, "stroke-linecap": "round", fill: "none" },
        { type: "circle", cx: 35, cy: 78, r: 3.5, fill: "url(#exp_skin)" },
        { type: "rect", x: 70, y: 40, width: 4, height: 90, rx: 2, fill: "url(#exp_wood)" },
        { type: "path", d: "M 62 42 Q 68 55 68 65", stroke: "url(#exp_shirt)", "stroke-width": 7, "stroke-linecap": "round", fill: "none" },
        { type: "circle", cx: 70, cy: 65, r: 4.5, fill: "url(#exp_skin)" }
    ]
};