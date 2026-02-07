export const MapLegend = {
    // Define the visual style for each terrain type (grouped by category)
    // Colors should match style.css definitions
    terrainCategories: [
        {
            category: 'LOWLANDS',
            types: [
                { code: 'plains',    name: 'Plains',    color: '#90a955' },
                { code: 'grassland', name: 'Grassland', color: '#5e8d38' },
                { code: 'sand',      name: 'Sand',      color: '#d4a574' },
                { code: 'swamp',     name: 'Swamp',     color: '#4a5f4a' }
            ]
        },
        {
            category: 'FORESTS',
            types: [
                { code: 'forest', name: 'Forest', color: '#0b2d0b' }
            ]
        },
        {
            category: 'ELEVATION',
            types: [
                { code: 'hills',                 name: 'Hills',      color: '#8d99ae' },
                { code: 'mountains',             name: 'Mountains',  color: '#6c757d' },
                { code: 'impassable_mountains',  name: 'Peaks',      color: '#495057' }
            ]
        },
        {
            category: 'WATER',
            types: [
                { code: 'water',       name: 'Fresh Water', color: '#48cae4' },
                { code: 'ocean',       name: 'Ocean',       color: '#0077b6' },
                { code: 'deep_ocean',  name: 'Deep Ocean',  color: '#023e8a' }
            ]
        }
    ],

    init() {
        const container = document.createElement('div');
        container.id = 'map-legend';
        
        // Header
        const title = document.createElement('h4');
        title.innerText = "Terrain Key";
        title.className = 'legend-title';
        container.appendChild(title);

        // Render Categories
        this.terrainCategories.forEach(category => {
            // Category Label
            const categoryLabel = document.createElement('div');
            categoryLabel.className = 'legend-category';
            categoryLabel.innerText = category.category;
            container.appendChild(categoryLabel);

            // Terrain Types
            category.types.forEach(type => {
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
        });

        // Add to Game Screen
        document.getElementById('screen-game').appendChild(container);
    }
};