export const HexMath = {
    size: 20, // Must match what you use in WorldGen (usually 20 or 30)

    // --- COORDINATE HELPERS ---
    
    // The missing function causing your crash
    coordsToKey(q, r) {
        return `${q},${r}`;
    },

    // --- DRAWING MATH (Grid -> Screen) ---
    gridToPixel(q, r) {
        const x = this.size * (3/2 * q);
        const y = this.size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
        return { x, y };
    },

    // --- INPUT MATH (Screen -> Grid) ---
    pixelToGrid(point) {
        const q = (2/3 * point.x) / this.size;
        const r = (-1/3 * point.x + Math.sqrt(3)/3 * point.y) / this.size;
        return this.hexRound({ q, r });
    },

    // Helper to snap float coordinates to the nearest valid Hex
    hexRound(hex) {
        let rq = Math.round(hex.q);
        let rr = Math.round(hex.r);
        let rs = Math.round(-hex.q - hex.r);

        const q_diff = Math.abs(rq - hex.q);
        const r_diff = Math.abs(rr - hex.r);
        const s_diff = Math.abs(rs - (-hex.q - hex.r));

        if (q_diff > r_diff && q_diff > s_diff) {
            rq = -rr - rs;
        } else if (r_diff > s_diff) {
            rr = -rq - rs;
        }
        
        return { q: rq, r: rr };
    },

    // --- GAMEPLAY MATH ---

    // Get the 6 neighbors of a hex
    getNeighbors(q, r) {
        const directions = [
            {q: 1, r: 0}, {q: 1, r: -1}, {q: 0, r: -1},
            {q: -1, r: 0}, {q: -1, r: 1}, {q: 0, r: 1}
        ];
        return directions.map(d => ({ q: q + d.q, r: r + d.r }));
    },

    distance(a, b) {
        return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
    },

    // String for SVG Polygon
    getHexCorners(centerX, centerY) {
        let points = "";
        for (let i = 0; i < 6; i++) {
            const angle_deg = 60 * i;
            const angle_rad = Math.PI / 180 * angle_deg;
            const x = centerX + this.size * Math.cos(angle_rad);
            const y = centerY + this.size * Math.sin(angle_rad);
            points += `${x},${y} `;
        }
        return points;
    },

    // Returns an array of {q, r} for all hexes within 'radius' distance
    getHexesInRange(centerQ, centerR, radius) {
        let results = [];
        for (let dq = -radius; dq <= radius; dq++) {
            // The 'r' range is constrained by the hexagonal shape
            const lowerDr = Math.max(-radius, -dq - radius);
            const upperDr = Math.min(radius, -dq + radius);
            
            for (let dr = lowerDr; dr <= upperDr; dr++) {
                // exclude the center itself if you only want the 'ring', 
                // but usually settlements work their own center tile too?
                // For now, we include everything.
                results.push({ q: centerQ + dq, r: centerR + dr });
            }
        }
        return results;
    }
};