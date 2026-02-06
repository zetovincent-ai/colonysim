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
                
                // --- COST LOGIC ---
                // Base movement cost is 1. 
                // Future: Add logic for Hills (+1), Forests (+1), Water (Impassable) here.
                let moveCost = 1; 
                if (tileData.type === 'water') moveCost = 999; // Impassable for now
                if (tileData.type === 'mountain') moveCost = 3; 
                if (tileData.type === 'forest' || tileData.type === 'dense_forest') moveCost = 2;

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
        const path = [];
        let curr = endNode;
        let currKey = `${curr.q},${curr.r}`;

        if (!cameFrom.has(currKey)) return []; // No path found

        while (currKey !== startKey) {
            path.push(curr);
            curr = cameFrom.get(currKey);
            if (!curr) break;
            currKey = `${curr.q},${curr.r}`;
        }
        // Note: We usually don't include the start tile in the visual line path, 
        // but renderMovementPath handles that.
        // path.push(startNode); 
        
        return path.reverse();
    }
};