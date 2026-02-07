import { HexMath } from './hexMath.js';
import { Noise } from './noise.js';

// Configuration for World Generation
const CONFIG = {
    scale: 0.1,    
    octaves: 3,    
    waterLevel: 0.0,
    
    // Elevation Thresholds (fuzzy ranges)
    deepWater: -0.3,
    shallowWater: 0.0,
    plains: 0.15,
    hillsStart: 0.35,
    hillsEnd: 0.55,
    mountainStart: 0.55,
    mountainEnd: 0.75,
    peakStart: 0.85,
    
    // Moisture & Biome
    forestThreshold: 0.3,
    desertThreshold: 0.2,
    swampMoisture: 0.6,
    
    // Coastal & Special Terrain
    beachChance: 0.4,
    swampChance: 0.3,
    deepOceanDistance: 5
};

const WorldTruthMap = new Map(); 

export const WorldGen = {
    initWorld(radius = 50, seed = Math.random()) {
        console.log(`Generating World 2.0 (Seed: ${seed})...`);
        Noise.seed(seed);
        WorldTruthMap.clear();

        // === PASS 1: BASE TERRAIN (Elevation + Moisture) ===
        console.log("Pass 1: Base terrain generation...");
        for (let q = -radius; q <= radius; q++) {
            let r1 = Math.max(-radius, -q - radius);
            let r2 = Math.min(radius, -q + radius);
            for (let r = r1; r <= r2; r++) {
                
                const nx = (q * CONFIG.scale) + 1000; 
                const ny = (r * CONFIG.scale) + 1000;

                const elevation = Noise.perlin2(nx, ny);
                const moisture = Noise.perlin2(nx + 500, ny + 500);

                let type = this._determineBaseTerrain(elevation, moisture);

                const key = HexMath.coordsToKey(q,r);
                WorldTruthMap.set(key, {
                    q, r,
                    type: type,
                    elevation: elevation,
                    moisture: moisture,
                    isExplored: false
                });
            }
        }

        // === PASS 2: COASTAL BEACHES ===
        console.log("Pass 2: Coastal refinement...");
        WorldTruthMap.forEach((tile, key) => {
            if (tile.type === 'plains' || tile.type === 'grassland') {
                if (this._hasWaterNeighbor(tile.q, tile.r) && Math.random() < CONFIG.beachChance) {
                    tile.type = 'sand';
                }
            }
        });

        // === PASS 3: WATER DEPTH CLASSIFICATION ===
        console.log("Pass 3: Water depth classification...");
        WorldTruthMap.forEach((tile, key) => {
            if (tile.type === 'water') {
                const distToLand = this._distanceToLand(tile.q, tile.r);
                
                if (distToLand === 1) {
                    tile.type = 'ocean'; // Coastal waters
                } else if (distToLand > CONFIG.deepOceanDistance) {
                    tile.type = 'deep_ocean';
                }
                // else stays 'water' (will become rivers/lakes later)
            }
        });

        // === PASS 4: SWAMP REFINEMENT ===
        console.log("Pass 4: Special terrain (swamps)...");
        WorldTruthMap.forEach((tile, key) => {
            if (tile.elevation > 0.0 && tile.elevation < 0.15 && 
                tile.moisture > CONFIG.swampMoisture && 
                Math.random() < CONFIG.swampChance) {
                tile.type = 'swamp';
            }
        });

        console.log(`World Generated: ${WorldTruthMap.size} tiles.`);
    },

    // === HELPER: Determine base terrain type from elevation/moisture ===
    _determineBaseTerrain(elevation, moisture) {
        // WATER
        if (elevation < CONFIG.deepWater) {
            return 'water';
        }
        if (elevation < CONFIG.shallowWater) {
            return 'water';
        }
        
        // LOWLANDS
        if (elevation < CONFIG.plains) {
            return 'plains';
        }
        
        // HILLS (Fuzzy Transition Zone)
        if (elevation >= CONFIG.hillsStart && elevation < CONFIG.hillsEnd) {
            // Pure hills zone
            return 'hills';
        }
        if (elevation >= CONFIG.plains && elevation < CONFIG.hillsStart) {
            // Transition: plains → hills
            const roll = Math.random();
            if (roll < 0.3) return 'hills'; // 30% chance of early hills
        }
        if (elevation >= CONFIG.hillsEnd && elevation < CONFIG.mountainStart) {
            // Overlap zone: hills can still appear
            const roll = Math.random();
            if (roll < 0.5) return 'hills'; // 50% chance
        }
        
        // MOUNTAINS (Fuzzy Transition)
        if (elevation >= CONFIG.mountainStart && elevation < CONFIG.mountainEnd) {
            const roll = Math.random();
            if (elevation < CONFIG.mountainStart + 0.1 && roll < 0.4) {
                return 'hills'; // Still some hills at mountain base
            }
            return 'mountains';
        }
        
        // IMPASSABLE PEAKS
        if (elevation >= CONFIG.peakStart) {
            return 'impassable_mountains';
        }
        
        // MIDLANDS (Moisture-driven biomes)
        if (elevation >= CONFIG.plains && elevation < CONFIG.mountainStart) {
            // Desert (low moisture)
            if (moisture < CONFIG.desertThreshold) {
                return 'sand';
            }
            // Forest (high moisture)
            if (moisture > CONFIG.forestThreshold) {
                return 'forest';
            }
            // Default grassland
            return 'grassland';
        }
        
        // Fallback (shouldn't hit this)
        return 'grassland';
    },

    // === HELPER: Check if tile has water neighbor ===
    _hasWaterNeighbor(q, r) {
        const neighbors = HexMath.getNeighbors(q, r);
        return neighbors.some(n => {
            const tile = this.getTileData(n.q, n.r);
            return tile && (tile.type === 'water' || tile.type === 'ocean' || tile.type === 'deep_ocean');
        });
    },

    // === HELPER: Calculate distance to nearest land tile ===
    _distanceToLand(q, r) {
        // BFS to find nearest non-water tile
        const visited = new Set();
        const queue = [{ q, r, dist: 0 }];
        visited.add(HexMath.coordsToKey(q, r));

        while (queue.length > 0) {
            const current = queue.shift();
            
            const tile = this.getTileData(current.q, current.r);
            if (tile && tile.type !== 'water' && tile.type !== 'ocean' && tile.type !== 'deep_ocean') {
                return current.dist;
            }

            const neighbors = HexMath.getNeighbors(current.q, current.r);
            neighbors.forEach(n => {
                const key = HexMath.coordsToKey(n.q, n.r);
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push({ q: n.q, r: n.r, dist: current.dist + 1 });
                }
            });
        }
        
        return 999; // No land found (shouldn't happen in bounded world)
    },

    getWorldMap() { return WorldTruthMap; },
    getTileData(q, r) { return WorldTruthMap.get(HexMath.coordsToKey(q, r)); },
    
    loadWorld(entries) {
        WorldTruthMap.clear();
        entries.forEach(([key, value]) => {
            WorldTruthMap.set(key, value);
        });
    },

    // === SAFE SPAWN SEARCH ===
    findSafeSpawn() {
        console.log("Searching for dry land...");
        // Spiral out from 0,0 to find the nearest valid tile
        for (let rad = 0; rad <= 20; rad++) {
            for (let q = -rad; q <= rad; q++) {
                let r1 = Math.max(-rad, -q - rad);
                let r2 = Math.min(rad, -q + rad);
                for (let r = r1; r <= r2; r++) {
                    const tile = this.getTileData(q, r);
                    if (tile) {
                        // VALID START TILES: Grassland, Plains, or Sand
                        // Avoid: Water types, Mountains, Swamps
                        if (tile.type === 'grassland' || tile.type === 'plains' || tile.type === 'sand') {
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