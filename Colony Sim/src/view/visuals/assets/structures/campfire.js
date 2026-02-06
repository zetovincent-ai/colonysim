export const campfire = {
    scale: 0.35,
    offset: { x: -50, y: -75 },
    parts: [
        // --- BASE STONES ---
        { type: "g", transform: "translate(50, 80)", children: [
            { type: "ellipse", cx: -12, cy: 2, rx: 6, ry: 4, fill: "#607D8B" },
            { type: "ellipse", cx: 12, cy: 2, rx: 6, ry: 4, fill: "#546E7A" },
            { type: "ellipse", cx: 0, cy: 5, rx: 7, ry: 5, fill: "#455A64" },
            { type: "ellipse", cx: -10, cy: -5, rx: 5, ry: 3, fill: "#607D8B" },
            { type: "ellipse", cx: 10, cy: -5, rx: 5, ry: 3, fill: "#546E7A" }
        ]},

        // --- LOGS ---
        { type: "g", transform: "translate(50, 75)", children: [
            // Back Log
            { type: "rect", x: -15, y: -3, width: 30, height: 6, rx: 2, fill: "url(#logGradient)", transform: "rotate(25)" },
            // Front Log
            { type: "rect", x: -15, y: -3, width: 30, height: 6, rx: 2, fill: "url(#logGradient)", transform: "rotate(-25)" }
        ]},

        // --- SMOKE ---
        // Note: Using 'anim' property based on your engine example
        { type: "g", transform: "translate(50, 50)", fill: "#B0BEC5", children: [
             { type: "circle", cx: 0, cy: 0, r: 3, anim: "smoke" },
             // Lower particle to create a trail effect
             { type: "circle", cx: -2, cy: 10, r: 2, anim: "smoke" }
        ]},

        // --- FIRE ---
        { type: "g", transform: "translate(50, 75)", children: [
            // Main Body
            { type: "path", d: "M 0 -25 Q 12 -10 8 0 Q 0 5 -8 0 Q -12 -10 0 -25 Z", fill: "url(#fireGradient)", anim: "flicker" },
            // Inner Heat (White/Yellow core)
            { type: "path", d: "M 0 -15 Q 6 -5 4 0 Q 0 3 -4 0 Q -6 -5 0 -15 Z", fill: "#FFF", opacity: 0.6, anim: "flicker" }
        ]}
    ]
};