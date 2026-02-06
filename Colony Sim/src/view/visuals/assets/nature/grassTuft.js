export const grassTuft = {
    type: "complex", 
    scale: 0.005, // Standard scale
    shadow: false, // Disabled to avoid "floating grass" look
    colors: {
        // We apply the gradient to the foliage layer
        foliage: ["url(#grassGrad)"] 
    },
    variations: [
        // --- Var 1: Lush & Asymmetric (5 Blades) ---
        // A full, healthy clump leaning slightly toward the sun
        { 
            foliage: "M -2 4 Q -4 -10 -6 -18 L -4 -18 Q -2 -10 2 4 Z M 4 4 Q 6 -8 10 -16 L 8 -18 Q 4 -8 2 4 Z M -4 4 Q -10 -4 -14 -10 L -12 -12 Q -6 -4 0 4 Z M 6 6 Q 10 0 12 -4 L 10 -6 Q 6 0 4 6 Z M -6 6 Q -10 2 -12 -2 L -10 -4 Q -8 2 -4 6 Z"
        },
        
        // --- Var 2: Bouquet (3 Blades) ---
        // A balanced but organic spread
        { 
            foliage: "M -2 4 Q -8 0 -14 -4 L -12 -6 Q -6 0 0 4 Z M 2 4 Q 4 -4 8 -12 L 6 -14 Q 2 -4 0 4 Z M 0 6 Q 2 -2 2 -6 L 2 -6 Q 2 -2 0 6 Z"
        },
        
        // --- Var 3: Sparse (2 Blades) ---
        // Simple V-shape for variety
        { 
            foliage: "M -2 4 Q -4 -8 -4 -14 L -2 -14 Q -2 -8 0 4 Z M 2 4 Q 4 -6 6 -12 L 4 -12 Q 2 -6 0 4 Z"
        }
    ]
};