export const settler = {
    scale: 0.12,
    offset: { x: -65, y: -50 },
    parts: [
        // --- NEW: THE SHADOW ---
        // Elongated ellipse to cover both front and back wheels
        // Centered at x:65 (middle of wagon) and y:94 (bottom of the wheels)
        { type: "ellipse", cx: 65, cy: 94, rx: 50, ry: 12, fill: "rgba(0,0,0,0.2)" },

        // --- EXISTING WAGON PARTS ---
        { type: "g", children: [
            { type: "circle", cx: 90, cy: 80, r: 14, fill: "none", stroke: "#4E342E", "stroke-width": 2 },
            { type: "circle", cx: 90, cy: 80, r: 3, fill: "#4E342E" },
            { type: "path", d: "M 90 66 L 90 94 M 76 80 L 104 80 M 80 70 L 100 90 M 100 70 L 80 90", stroke: "url(#set_wood)", "stroke-width": 1.5 }
        ]},
        { type: "g", children: [
            { type: "circle", cx: 35, cy: 82, r: 10, fill: "none", stroke: "#4E342E", "stroke-width": 2 },
            { type: "circle", cx: 35, cy: 82, r: 2.5, fill: "#4E342E" },
            { type: "path", d: "M 35 72 L 35 92 M 25 82 L 45 82 M 28 75 L 42 89 M 42 75 L 28 89", stroke: "url(#set_wood)", "stroke-width": 1.5 }
        ]},
        { type: "rect", x: 25, y: 65, width: 80, height: 12, rx: 1, fill: "url(#set_wood)" },
        { type: "rect", x: 25, y: 55, width: 18, height: 10, fill: "#4E342E" },
        { type: "rect", x: 25, y: 55, width: 20, height: 3, fill: "#8B5A2B" },
        { type: "path", d: "M 15 70 L 25 70", stroke: "url(#set_wood)", "stroke-width": 2 },
        { type: "path", d: "M 28 65 Q 28 25, 65 25 Q 105 25, 105 65 Z", fill: "url(#set_navy)" },
        // Note: This existing internal shadow is fine, it adds depth to the driver seat
        { type: "ellipse", cx: 36, cy: 55, rx: 8, ry: 10, fill: "url(#set_shadow)" }, 
        { type: "path", d: "M 34 56 L 26 56", stroke: "#6D4C41", "stroke-width": 3.5, "stroke-linecap": "round" },
        { type: "path", d: "M 26 56 L 26 66", stroke: "#6D4C41", "stroke-width": 3.5, "stroke-linecap": "round" },
        { type: "path", d: "M 24 66 L 28 66 L 28 69 Q 28 71 24 71 Z", fill: "#3E2723" },
        { type: "path", d: "M 34 56 L 24 56", stroke: "#8D6E63", "stroke-width": 3.5, "stroke-linecap": "round" },
        { type: "path", d: "M 24 56 L 22 68", stroke: "#8D6E63", "stroke-width": 3.5, "stroke-linecap": "round" },
        { type: "path", d: "M 20 68 L 25 68 L 25 71 Q 25 73 20 73 Z", fill: "#2E1A10" },
        { type: "rect", x: 30, y: 42, width: 11, height: 15, rx: 2, fill: "#D2B48C" },
        { type: "rect", x: 30, y: 42, width: 11, height: 10, rx: 1, fill: "#8D6E63" },
        { type: "rect", x: 33, y: 39, width: 4, height: 4, fill: "url(#exp_skin)" },
        { type: "ellipse", cx: 35, cy: 35, rx: 5.5, ry: 6.5, fill: "url(#exp_skin)" },
        { type: "ellipse", cx: 35, cy: 32, rx: 9, ry: 2.5, fill: "#C7B299" },
        { type: "path", d: "M 31 32 Q 35 24, 39 32 Z", fill: "#A68B6C" },
        { type: "path", d: "M 36 50 L 15 62", stroke: "#3E2723", "stroke-width": 1 },
        { type: "path", d: "M 34 45 Q 40 52, 36 50", stroke: "url(#exp_skin)", "stroke-width": 3, fill: "none", "stroke-linecap": "round" }
    ]
};