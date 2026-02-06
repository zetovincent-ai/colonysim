import { State } from '../core/gameState.js';
import { UI } from './ui.js';
import { HexRenderer } from './renderer.js';
import { WorldGen } from '../world/worldGen.js';

export const DevTools = {
    init() {
        // We append to body to ensure 'fixed' positioning works relative to viewport
        // independent of any container clipping or height issues.
        const container = document.body;

        // 1. The Main Toggle Button (Wrench)
        const toggleBtn = document.createElement('button');
        toggleBtn.innerText = "🛠️";
        toggleBtn.id = "devtools-toggle";
        Object.assign(toggleBtn.style, {
            position: 'fixed', // FIXED: Relative to screen, not container
            bottom: '20px',
            right: '20px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#c0392b', 
            color: 'white',
            border: '2px solid #ecf0f1',
            fontSize: '24px',
            cursor: 'pointer',
            zIndex: '2001',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: 'transform 0.2s',
            pointerEvents: 'auto'
        });
        
        toggleBtn.onmouseover = () => toggleBtn.style.transform = 'scale(1.1)';
        toggleBtn.onmouseout = () => toggleBtn.style.transform = 'scale(1.0)';

        // 2. The Panel (Hidden by default)
        const panel = document.createElement('div');
        panel.id = 'devtools-panel';
        Object.assign(panel.style, {
            position: 'fixed', // FIXED: Relative to screen
            bottom: '80px', // Floats above the button
            right: '20px',
            display: 'none', 
            flexDirection: 'column',
            gap: '8px',
            zIndex: '2000',
            background: 'rgba(0, 0, 0, 0.9)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #7f8c8d',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            minWidth: '160px',
            pointerEvents: 'auto'
        });

        // Toggle Logic
        toggleBtn.onclick = () => {
            if (panel.style.display === 'none') {
                 panel.style.display = 'flex';
                 toggleBtn.style.background = '#e74c3c'; 
            } else {
                 panel.style.display = 'none';
                 toggleBtn.style.background = '#c0392b'; 
            }
        };

        // 3. Add Content to Panel
        const header = document.createElement('div');
        header.innerText = "DEV TOOLS";
        header.style.color = '#bdc3c7';
        header.style.fontSize = '10px';
        header.style.fontWeight = 'bold';
        header.style.textAlign = 'center';
        header.style.marginBottom = '5px';
        header.style.letterSpacing = '1px';
        panel.appendChild(header);

        this.createBtn(panel, "Toggle Fog ☁️", () => this.toggleFog());
        this.createBtn(panel, "Tile Inspector 🕵️", () => this.inspectTile());
        
        const hr = document.createElement('hr');
        hr.style.borderColor = '#444'; 
        hr.style.margin = '5px 0';
        panel.appendChild(hr);

        this.createBtn(panel, "Add 1 Pop 👤", () => this.addPop());
        this.createBtn(panel, "Add 50 Sci 🧪", () => this.addResource('science', 50));
        this.createBtn(panel, "Add 50 Food 🍞", () => this.addResource('food', 50));
        this.createBtn(panel, "Add 50 Mats 🪵", () => this.addResource('materials', 50));

        // Append to BODY so it sits on top of everything
        container.appendChild(panel);
        container.appendChild(toggleBtn);
    },

    isDevFog: false,

    toggleFog() {
        this.isDevFog = !this.isDevFog;
        const allTiles = WorldGen.getWorldMap();
        allTiles.forEach(tile => HexRenderer.setVisualFog(tile.q, tile.r, this.isDevFog));
        UI.notify(`DEV: Fog ${this.isDevFog ? "OFF" : "ON"}`);
    },

    inspectTile() {
        if (State.unitPos) {
            const t = WorldGen.getTileData(State.unitPos.q, State.unitPos.r);
            console.log("INSPECTOR:", t);
            UI.notify("Tile Data logged to Console");
        } else {
            UI.notify("Select a Unit/City to Inspect Tile");
        }
    },

    addPop() {
         const town = this.getTargetTown();
         if (town) {
             town.population++;
             UI.notify(`DEV: Added 1 Pop to ${town.name}`);
             UI.update(State);
         } else {
             UI.notify("DEV: No Settlement Found");
         }
    },

    createBtn(parent, text, onClick) {
        const btn = document.createElement('button');
        btn.innerText = text;
        Object.assign(btn.style, {
            background: '#2c3e50',
            color: '#ecf0f1',
            border: '1px solid #555',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'monospace',
            textAlign: 'left',
            width: '100%',
            borderRadius: '4px',
            transition: 'background 0.2s'
        });
        btn.onmouseover = () => btn.style.background = '#34495e';
        btn.onmouseout = () => btn.style.background = '#2c3e50';
        btn.onclick = onClick;
        parent.appendChild(btn);
    },

    getTargetTown() {
        if (UI.currentContext && UI.currentContext.inventory) {
            return UI.currentContext;
        }
        if (State.settlements && State.settlements.length > 0) {
            return State.settlements[0];
        }
        return null;
    },

    addResource(type, amount) {
        const town = this.getTargetTown();
        
        if (town) {
            if (town === State.tribe) {
                if (type === 'science') {
                     UI.notify("DEV: Tribes can't hold Science yet!");
                     return;
                }
                if (town.inventory[type] !== undefined) {
                    town.inventory[type] += amount;
                    UI.notify(`DEV: Added ${amount} ${type} to Tribe`);
                    UI.update(State);
                }
                return;
            }

            if (town.inventory[type] !== undefined) {
                town.inventory[type] += amount;
                UI.notify(`DEV: Added ${amount} ${type} to ${town.name}`);
                UI.update(State);
            }
        } else {
            UI.notify("DEV: No Target Found");
        }
    }
};