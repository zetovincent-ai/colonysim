export const waveShallow = {
    type: "complex",
    scale: 0.2, 
    shadow: false, // Shadows look odd on water; we rely on the gradient for depth
    colors: {
        trunk: ["url(#waveBody)"],
        foliage: ["url(#foamGrad)"]
    },
    variations: [
        // --- Var 1: Long Sweep (Foam Cap) ---
        { 
            trunk: "M -18 5 Q -8 5 -4 0 Q 0 -4 6 -3 Q 12 -2 18 5 Q 0 2.5 -18 5 Z", 
            foliage: "M 0 -3 Q 3 -4.5 7 -3 Q 5 -2 3 -2.5 Q 1 -3 0 -3 Z"
        },
        
        // --- Var 2: Lowered Sweep (Small Foam) ---
        { 
            trunk: "M -14 5 Q -8 5 -3 1 Q 2 -3 8 -1 Q 12 2 14 5 Q 0 2.5 -14 5 Z", 
            foliage: "M 2 -1.5 Q 4 -3 7 -1.5 Q 5 -1 2 -1.5 Z"
        },
        
        // --- Var 3: Glassy Swell (No Foam) ---
        { 
            trunk: "M -12 5 Q -8 5 -4 1 Q 0 -2 4 1 Q 8 5 12 5 Q 0 2.5 -12 5 Z", 
            foliage: "" // Empty string = No foam drawn
        }
    ]
};