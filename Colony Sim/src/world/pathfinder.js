import { HexMath } from './hexMath.js';
import { WorldGen } from './worldGen.js';

export const Pathfinder = {
    // Returns array of tile objects: [start, ... path ..., end]
    findPath(unit, targetTile) {
        if (!unit || !targetTile) return [];

        const startNode = unit.location; // {q, r}
        const endNode = targetTile;      // {q, r}

        // 1. Setup A* Structures
        const frontier = []; 
        frontier.push({ ...startNode, priority: 0 });
        
        const cameFrom = new Map();
        const costSoFar = new Map();
        
        const startKey = `${startNode.q},${startNode.r}`;
        cameFrom.set(startKey, null);
        costSoFar.set(startKey, 0);

        // 2. Loop
        while (frontier.length > 0) {
            // Sort by priority (lowest first) - Simple Priority Queue
            frontier.sort((a, b) => a.priority - b.priority);
            const current = frontier.shift();

            const currentKey = `${current.q},${current.r}`;
            if (current.q === endNode.q && current.r === endNode.r) {
                break; // Reached target
            }

            // Get Neighbors
            const neighbors = HexMath.getNeighbors(current.q, current.r);
            
            for (let next of neighbors) {
                // Check bounds / validity via WorldGen
                const tileData = WorldGen.getTileData(next.q, next.r);
                if (!tileData) continue; // Out of bounds or void
                
                // === MOVEMENT COST LOGIC ===
                let moveCost = this._getMoveCost(tileData.type);
                
                if (moveCost >= 999) continue; // Skip impassable

                const newCost = costSoFar.get(currentKey) + moveCost;
                const nextKey = `${next.q},${next.r}`;

                if (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)) {
                    costSoFar.set(nextKey, newCost);
                    const priority = newCost + HexMath.distance(next, endNode);
                    frontier.push({ ...next, priority });
                    cameFrom.set(nextKey, current);
                }
            }
        }

        // 3. Reconstruct Path
        let path = [];
        let current = endNode;
        let currentKey = `${current.q},${current.r}`;

        while (currentKey !== startKey) {
            const tile = WorldGen.getTileData(current.q, current.r);
            if (tile) path.unshift(tile);
            
            current = cameFrom.get(currentKey);
            if (!current) break; // Path not found
            currentKey = `${current.q},${current.r}`;
        }

        // Add start tile if not already included
        const startTile = WorldGen.getTileData(startNode.q, startNode.r);
        if (startTile && (path.length === 0 || path[0].q !== startTile.q || path[0].r !== startTile.r)) {
            path.unshift(startTile);
        }

        return path;
    },

    // === MOVEMENT COST TABLE ===
    _getMoveCost(tileType) {
        const costs = {
            // Lowlands (Fast)
            'plains': 1,
            'grassland': 1,
            'sand': 1,
            
            // Forests (Moderate)
            'forest': 2,
            'dense_forest': 3,
            
            // Elevation (Slow)
            'hills': 2,
            'mountains': 3,
            'impassable_mountains': 999, // Never passable
            
            // Water (Tech-gated)
            'water': 999,        // Rivers/lakes (boats needed)
            'ocean': 999,        // Coastal (ships needed)
            'deep_ocean': 999,   // Far ocean (advanced ships)
            
            // Special
            'swamp': 3          // Difficult terrain
        };

        return costs[tileType] ?? 1; // Default to 1 if unknown type
    }
};