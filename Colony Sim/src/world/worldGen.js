import { HexMath } from './hexMath.js';
import { Noise } from './noise.js';

// Configuration for World Generation
const CONFIG = {
    scale: 0.1,    
    octaves: 3,    
    waterLevel: 0.0, 
    forestThreshold: 0.3 
};

const WorldTruthMap = new Map(); 

export const WorldGen = {
    initWorld(radius = 50, seed = Math.random()) {
        console.log(`Generating World 2.0 (Seed: ${seed})...`);
        Noise.seed(seed);
        WorldTruthMap.clear();

        for (let q = -radius; q <= radius; q++) {
            let r1 = Math.max(-radius, -q - radius);
            let r2 = Math.min(radius, -q + radius);
            for (let r = r1; r <= r2; r++) {
                
                const nx = (q * CONFIG.scale) + 1000; 
                const ny = (r * CONFIG.scale) + 1000;

                const elevation = Noise.perlin2(nx, ny);
                const moisture = Noise.perlin2(nx + 500, ny + 500);

                let type = 'ocean'; 
                
                if (elevation < CONFIG.waterLevel - 0.2) {
                    type = 'water'; 
                } else if (elevation < CONFIG.waterLevel) {
                    type = 'water'; 
                } else if (elevation < CONFIG.waterLevel + 0.05) {
                    type = 'plains'; 
                } else if (elevation > 0.6) {
                    type = 'mountain';
                } else {
                    if (moisture > CONFIG.forestThreshold) {
                        type = 'forest';
                    } else {
                        type = 'grassland';
                    }
                }

                const key = HexMath.coordsToKey(q,r);
                WorldTruthMap.set(key, {
                    q, r,
                    type: type,
                    elevation: elevation,
                    isExplored: false
                });
            }
        }
        console.log(`World Generated: ${WorldTruthMap.size} tiles.`);
    },

    getWorldMap() { return WorldTruthMap; },
    getTileData(q, r) { return WorldTruthMap.get(HexMath.coordsToKey(q, r)); },
    
    loadWorld(entries) {
        WorldTruthMap.clear();
        entries.forEach(([key, value]) => {
            WorldTruthMap.set(key, value);
        });
    },

    // --- NEW: SAFE SPAWN SEARCH ---
    findSafeSpawn() {
        console.log("Searching for dry land...");
        // Spiral out from 0,0 to find the nearest valid tile
        // We limit to radius 10 to ensure we don't start too far from center
        for (let rad = 0; rad <= 20; rad++) {
            for (let q = -rad; q <= rad; q++) {
                let r1 = Math.max(-rad, -q - rad);
                let r2 = Math.min(rad, -q + rad);
                for (let r = r1; r <= r2; r++) {
                    const tile = this.getTileData(q, r);
                    if (tile) {
                        // VALID START TILES: Grassland or Plains
                        // Avoid: Water, Ocean, Mountain, Forest (hard to move/build)
                        if (tile.type === 'grassland' || tile.type === 'plains') {
                            console.log(`Spawn Found at: ${q},${r} (${tile.type})`);
                            return { q, r };
                        }
                    }
                }
            }
        }
        // Fallback if the entire center is ocean (unlikely with this noise)
        console.warn("No land found near center! Spawning at 0,0 anyway.");
        return { q: 0, r: 0 };
    }
};