// 📦 1. IMPORT INDIVIDUAL ASSETS
// Units
import { explorer } from './assets/units/explorer.js';
import { settler } from './assets/units/settler.js';

// Structures
import { campfire } from './assets/structures/campfire.js';
import { tentSmall } from './assets/structures/tentSmall.js';
import { hutClay } from './assets/structures/hutClay.js';

// Nature
import { treeDeciduous } from './assets/nature/treeDeciduous.js';
import { treePine } from './assets/nature/treePine.js';
import { waveShallow } from './assets/nature/waveShallow.js';
import { grassTuft } from './assets/nature/grassTuft.js';
import { mountain } from './assets/nature/mountain.js';


// 🌳 2. ASSET DICTIONARY (Used by WorldGen AND Renderer Init)
export const AssetLibrary = {
    "tree_deciduous": treeDeciduous,
    "tree_pine": treePine,
    "wave_shallow": waveShallow,
    "grass_tuft": grassTuft,
    "mountain": mountain,
    "tent_small": tentSmall,
    "campfire": campfire,
    "hut_clay": hutClay
};


// 🌍 3. BIOME RULES (Density & Distribution)
export const BiomeVisuals = {
    "forest": { 
        asset: "tree_deciduous", 
        mix: { asset: "grass_tuft", chance: 0.3, scale: [0.35, 0.45] }, 
        count: [4, 6], scale: [0.7, 1.0], radius: 20, minDist: 6 
    },
    "dense_forest": { 
        asset: "tree_pine", 
        count: [5, 7], scale: [0.6, 1.0], radius: 20, minDist: 5 
    },
    "water": { 
        asset: "wave_shallow", 
        count: [1, 3], scale: [0.25, 0.35], radius: 15, minDist: 5
    },
    "mountain": { 
        asset: "mountain", 
        count: [1, 1], scale: [1.1, 1.4], radius: 5, minDist: 10 
    },
    "grassland": { 
        asset: "grass_tuft", 
        count: [8, 11], scale: [0.35, 0.45], radius: 20, minDist: 6 
    },
    "plains": { 
        asset: "grass_tuft", 
        count: [2, 4], scale: [0.35, 0.45], radius: 20, minDist: 8 
    }
};


// ⚔️ 4. UNIT MAPPING
export const UnitVisuals = {
    "explorer": explorer,
    "settler": settler
};


// 🏰 5. STRUCTURE MAPPING
export const StructureVisuals = {
    "campfire": campfire,
    "tent_small": tentSmall,
    "hut_clay": hutClay
};