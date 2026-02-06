export const treeDeciduous = {
    type: "complex",
    scale: 0.18, 
    shadow: true, 
    colors: {
        // Randomly picks a Gradient ID
        trunk: ["url(#trunk1)", "url(#trunk2)", "url(#trunk3)"],
        foliage: ["url(#leaf1)", "url(#leaf2)", "url(#leaf3)"]
    },
    
    variations: [
        // --- Var 1: Standard (Round) ---
        { 
            trunk: "M -2 0 L -1 -10 L 1 -10 L 2 0 Z", 
            foliage: "M -8 -8 Q -12 -12 -8 -16 Q -10 -22 0 -24 Q 10 -22 8 -16 Q 12 -12 8 -8 Q 6 -4 0 -5 Q -6 -4 -8 -8 Z",
            // Dark details in the folds
            shadowPath: "M -4 -12 Q -2 -14 0 -12 M 2 -16 Q 5 -14 3 -12",
            // White ticks on the ridges
            highlightPath: "M -6 -18 L -5 -19 M 0 -22 L 1 -23 M 6 -18 L 7 -19"
        },
        
        // --- Var 2: Tall (Poplar style) ---
        { 
            trunk: "M -1.5 0 L -0.5 -14 L 0.5 -14 L 1.5 0 Z", 
            foliage: "M -5 -12 Q -8 -15 -5 -20 Q -6 -28 0 -32 Q 6 -28 5 -20 Q 8 -15 5 -12 Q 4 -8 0 -8 Q -4 -8 -5 -12 Z",
            shadowPath: "M -2 -15 Q 0 -18 2 -15 M -3 -22 Q -1 -25 1 -22",
            highlightPath: "M -2 -28 L -1 -30 M 2 -25 L 3 -26"
        },
        
        // --- Var 3: Wide (Old Growth) ---
        { 
            trunk: "M -2.5 0 Q -1.5 -4 -2 -8 L 2 -8 Q 1.5 -4 2.5 0 Z", 
            foliage: "M -10 -8 Q -14 -10 -12 -16 Q -12 -22 0 -23 Q 12 -22 12 -16 Q 14 -10 10 -8 Q 8 -4 0 -5 Q -8 -4 -10 -8 Z",
            shadowPath: "M -8 -12 Q -5 -14 -4 -10 M 4 -10 Q 5 -14 8 -12 M -2 -18 Q 0 -20 2 -18",
            highlightPath: "M -10 -14 L -9 -16 M 10 -14 L 9 -16 M 0 -21 L 1 -22"
        }
    ]
};