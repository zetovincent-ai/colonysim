export const MapLegend = {
    // Define the visual style for each terrain type
    // UPDATED COLORS to match style.css
    terrainTypes: [
        { code: 'grassland', name: 'Grassland', color: '#5e8d38' },
        { code: 'forest',    name: 'Forest',    color: '#0b2d0b' }, // Darker
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
        title.style.margin = "0 0 10px 0";
        title.style.borderBottom = "1px solid #555";
        title.style.paddingBottom = "5px";
        title.style.fontSize = "14px";
        title.style.color = "#ecf0f1";
        container.appendChild(title);

        // Render Items
        this.terrainTypes.forEach(type => {
            const row = document.createElement('div');
            Object.assign(row.style, {
                display: 'flex',
                alignItems: 'center',
                marginBottom: '5px',
                fontSize: '12px',
                color: '#ccc'
            });

            // The Color Swatch
            const swatch = document.createElement('div');
            Object.assign(swatch.style, {
                width: '15px',
                height: '15px',
                backgroundColor: type.color,
                marginRight: '10px',
                border: '1px solid #333',
                borderRadius: '3px' // Slight roundness
            });

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