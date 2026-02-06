export const hutClay = {
    type: "complex",
    scale: 0.3, 
    shadow: true,
    colors: {
        trunk: ["url(#clayWall)"],
        foliage: ["url(#thatchRoof)"] // Default, but Var 3 overrides this with #mudRoof
    },
    variations: [
        // --- Var 1: The Roundhouse (Cylinder) ---
        { 
            // Trunk: Cylindrical wall + Door
            trunk: "M -7 4 L -7 -5 Q 0 -4 7 -5 L 7 4 Q 0 6 -7 4 Z M -2.5 5 L -2.5 -1 Q 0 -3 2.5 -1 L 2.5 5 Z", 
            // Foliage: Conical Thatch Roof
            foliage: "M -9 -4 Q 0 -22 9 -4 Q 0 -1 -9 -4 Z" 
        },
        
        // --- Var 2: The Longhouse (Community) ---
        { 
            // Trunk: Wide Wall + Door
            trunk: "M -11 4 L -11 -6 L 11 -6 L 11 4 Q 0 6 -11 4 Z M -2.5 5 L -2.5 -1 Q 0 -3 2.5 -1 L 2.5 5 Z", 
            // Foliage: A-Frame Thatch Roof
            foliage: "M -14 -4 L 0 -16 L 14 -4 L 12 -4 L 0 -14 L -12 -4 Z" 
        },
        
        // --- Var 3: The Blockhouse (Storage) ---
        // Note: This one uses a different roof color (mudRoof) and has wood beams
        { 
            // Trunk: Box Wall + Door + Window
            trunk: "M -9 4 L -9 -6 L 9 -6 L 9 4 Q 0 6 -9 4 Z M -6.5 5 L -6.5 -1 Q -4 -3 -1.5 -1 L -1.5 5 Z M 3 -3 L 6 -3 L 6 0 L 3 0 Z",
            
            // Foliage: Flat Mud Roof + Timber Beams (using set_wood)
            // We combine the roof shape and the beam lines into one path for efficiency
            foliage: "M -11 -5 L 11 -5 L 9 -8 L -9 -8 Z M -6 -6 L -5 -6 M 4 -6 L 5 -6",
            
            // Override the default color just for this variation to use Mud + Wood
            // Note: complex types usually just take one fill, so we might lose the wood beam color 
            // if we don't separate them, but for 'complex' type, the color is applied to the whole path.
            // Visually, the beams will just look like dark ridges on the roof, which works!
        }
    ]
};