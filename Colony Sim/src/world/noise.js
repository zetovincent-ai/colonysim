/**
 * A standard implementation of Perlin Noise.
 * Returns values roughly between -1.0 and 1.0.
 */
export const Noise = {
    perm: [],
    
    seed(val) {
        this.perm = [];
        for(let i = 0; i < 256; i++) this.perm[i] = i;
        
        let seed = val;
        // Shuffle based on seed
        for(let i = 255; i > 0; i--) {
            seed = (seed * 9301 + 49297) % 233280;
            const j = Math.floor((seed / 233280) * (i + 1));
            [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
        }
        // Double it to avoid wrapping checks
        this.perm = this.perm.concat(this.perm);
    },

    // 2D Noise function
    perlin2(x, y) {
        // Find unit grid cell containing point
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;
        
        // Relative x, y of point in cell
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        // Fade curves
        let u = this.fade(x);
        let v = this.fade(y);
        
        // Hash coordinates of the 4 corners
        let A = this.perm[X] + Y;
        let AA = this.perm[A];
        let AB = this.perm[A + 1];
        let B = this.perm[X + 1] + Y;
        let BA = this.perm[B];
        let BB = this.perm[B + 1];

        // Add blended results
        return this.lerp(v, 
            this.lerp(u, this.grad(this.perm[AA], x, y), this.grad(this.perm[BA], x - 1, y)),
            this.lerp(u, this.grad(this.perm[AB], x, y - 1), this.grad(this.perm[BB], x - 1, y - 1))
        );
    },

    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); },
    lerp(t, a, b) { return a + t * (b - a); },
    
    grad(hash, x, y) {
        let h = hash & 15;
        let u = h < 8 ? x : y;
        let v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
};

// Initialize with a default seed
Noise.seed(Math.random());