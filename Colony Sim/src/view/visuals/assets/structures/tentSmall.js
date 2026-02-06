export const tentSmall = {
    type: "complex",
    scale: 0.25, // Matches your Unit scale roughly
    shadow: true, 
    colors: {
        trunk: ["url(#canvasLight)"], // The sunny side
        foliage: ["url(#canvasDark)"] // The shady side / interior
    },
    variations: [
        // --- Var 1: The Outpost (Open Flaps) ---
        // Trunk: Two curved flaps. Foliage: The dark triangle interior.
        { 
            trunk: "M 0 -20 Q -12 -5 -16 12 L -6 12 L 0 -5 M 0 -20 Q 12 -5 16 12 L 6 12 L 0 -5", 
            foliage: "M 0 -15 L -10 12 L 10 12 Z" 
        },
        
        // --- Var 2: The Ridge (3/4 Angle) ---
        // Trunk: Left sunny face. Foliage: Right shadow face.
        { 
            trunk: "M 0 -20 L -5 12 L -25 8 Z", 
            foliage: "M 0 -20 L 20 12 L -5 12 Z" 
        },
        
        // --- Var 3: The Pyramid (Tipi Style) ---
        // Trunk: The cone. Foliage: The dark entrance slit/fold.
        { 
            trunk: "M 0 -25 Q -15 0 -18 12 Q 0 15 18 12 Q 15 0 0 -25", 
            foliage: "M -1 -15 L 4 12 L 2 12 Z" 
        }
    ]
};