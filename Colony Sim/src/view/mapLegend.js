export const MapLegend = {
    // Define the visual style for each terrain type
    // UPDATED COLORS to match style.css
    terrainTypes: [
        { code: 'grassland', name: 'Grassland', color: '#5e8d38' },
        { code: 'forest',    name: 'Forest',    color: '#0b2d0b' },
        { code: 'plains',    name: 'Plains',    color: '#90a955' },
        { code: 'mountain',  name: 'Mountain',  color: '#6c757d' },
        { code: 'water',     name: 'Water',     color: '#0077b6' }
    ],

    init() {
        const container = document.createElement('div');
        container.id = 'map-legend';
        
        // Header
        const title = document.createElement('h4');
        title.innerText = "Terrain Key";
        title.className = 'legend-title';
        container.appendChild(title);

        // Render Items
        this.terrainTypes.forEach(type => {
            const row = document.createElement('div');
            row.className = 'legend-row';

            // The Color Swatch
            const swatch = document.createElement('div');
            swatch.className = 'legend-swatch';
            swatch.style.backgroundColor = type.color; // Dynamic per-terrain — must stay inline
            
            // The Label
            const label = document.createElement('span');
            label.innerText = type.name;

            row.appendChild(swatch);
            row.appendChild(label);
            container.appendChild(row);
        });

        // Add to Game Screen
        document.getElementById('screen-game').appendChild(container);
    }
};
