import { WorldGen } from '../world/worldGen.js'; 
import { HexRenderer } from './renderer.js';
import { State } from '../core/gameState.js'; 
import { Pathfinder } from '../world/pathfinder.js'; 

export const UI = {
    currentContext: null,

    initInputListeners() {
        console.log("UI: Input Listeners Initialized");
        window.addEventListener('hex-hover', (e) => {
            const { q, r } = e.detail;
            this.handleHexHover(q, r);
        });
    },

    // --- NEW: Persistent Path Logic ---
    redrawPlannedPaths() {
        HexRenderer.clearHighlights(); // Wipe everything clean

        // 1. Draw Tribe Plan
        if (State.pendingActions.move && State.unitPos) {
             const path = Pathfinder.findPath({location: State.unitPos}, State.pendingActions.move);
             if (path) HexRenderer.drawMovementPath(State.unitPos, path, true); // true = Locked
        }

        // 2. Draw Unit Plans
        Object.entries(State.pendingActions.unitMoves).forEach(([idx, dest]) => {
            const u = State.units[idx];
            if (u) {
                const path = Pathfinder.findPath(u, dest);
                if (path) HexRenderer.drawMovementPath(u.location, path, true);
            }
        });
    },

    handleHexHover(q, r) {
        if (!Pathfinder) return;

        // Reset to show ONLY locked paths (clears old ghost paths)
        this.redrawPlannedPaths(); 

        if (State.selectedUnit) {
            // Check if THIS unit already has a plan (locked line)
            let hasPlan = false;
            if (State.selectedUnit.type === 'tribe') {
                if (State.pendingActions.move) hasPlan = true;
            } else {
                const idx = State.units.indexOf(State.selectedUnit);
                if (idx !== -1 && State.pendingActions.unitMoves[idx]) hasPlan = true;
            }

            // If we have a plan, or hover self, don't draw ghost
            if (hasPlan) return; 
            if (State.selectedUnit.location.q === q && State.selectedUnit.location.r === r) return;

            const targetTile = WorldGen.getTileData(q, r);
            
            if (targetTile) {
                const startLoc = State.selectedUnit.location || State.unitPos;
                const pathUnit = { location: startLoc };

                const path = Pathfinder.findPath(pathUnit, targetTile);
                
                if (path && path.length > 0) {
                    // Draw GHOST path (isLocked = false)
                    // Note: This draws ON TOP of the locked paths we just redrew
                    HexRenderer.drawMovementPath(startLoc, path, false);
                }
            }
        }
    },

    // --- SELECTION & DESELECTION ---
    selectUnit(unit) {
        State.selectedUnit = unit;
        this.currentContext = { type: 'unit', data: unit };
        this.updateContextBar();
        HexRenderer.drawSelectionReticle(unit.location.q, unit.location.r);
        
        // Ensure existing plans are visible
        this.redrawPlannedPaths();
    },

    deselect() {
        State.selectedUnit = null;
        this.currentContext = null;

        const bar = document.getElementById('context-bar');
        if (bar) {
            bar.classList.remove('active'); 
            bar.classList.add('hidden');    
            bar.innerHTML = '';
        }

        HexRenderer.clearSelection(); // Clear the yellow ring
        
        // CRITICAL: Restore the planned paths so they don't vanish
        this.redrawPlannedPaths(); 
    },

    // --- COMMAND HANDLING ---
    handleMoveCommand(unitIndex, targetTile) {
        if (!Pathfinder) return false;

        let unit, startLoc;
        if (unitIndex === 'tribe') {
            unit = { ...State.tribe, location: State.unitPos };
            startLoc = State.unitPos;
        } else {
            unit = State.units[unitIndex];
            startLoc = unit.location;
        }

        const path = Pathfinder.findPath(unit, targetTile);
        if (!path || path.length === 0) {
            this.notify("Cannot reach that location.");
            return false;
        }

        const maxMoves = (unit.movesLeft !== undefined) ? unit.movesLeft : (unit.maxMoves || 1);
        
        if (path.length > maxMoves) {
            this.notify(`Too far! (Range: ${maxMoves})`);
            return false; 
        }

        // SAVE THE PLAN
        if (unitIndex === 'tribe') {
            State.pendingActions.move = targetTile;
        } else {
            State.pendingActions.unitMoves[unitIndex] = targetTile;
        }

        this.notify("Movement planned.");
        
        // Force visual update
        this.redrawPlannedPaths();
        
        return true;
    },

    cancelPlan(unitIndex) {
        if (unitIndex === 'tribe') {
            if (State.pendingActions.move) {
                State.pendingActions.move = null;
                this.notify("Migration cancelled.");
            }
        } else {
            if (State.pendingActions.unitMoves[unitIndex]) {
                delete State.pendingActions.unitMoves[unitIndex];
                this.notify("Move cancelled.");
            }
        }
        
        // Visually clear
        this.redrawPlannedPaths();
    },

    // ... (The rest of ui.js: update, updateContextBar, renderActivityLog, etc. remains the same) ...
    update(state) {
        let totalFood = 0;
        let totalMats = 0;

        if (state.unitPos && state.tribe) {
            totalFood += state.tribe.inventory.food;
            totalMats += state.tribe.inventory.materials;
        }

        if (state.settlements) {
            state.settlements.forEach(town => {
                totalFood += town.inventory.food;
                totalMats += town.inventory.materials;
            });
        }

        const elTurn = document.getElementById('val-turn');
        if (elTurn) elTurn.innerText = state.turn;
        
        const elFood = document.getElementById('val-food-total');
        if (elFood) elFood.innerText = totalFood;
        
        const elMats = document.getElementById('val-mats-total');
        if (elMats) elMats.innerText = totalMats;

        if (this.currentContext) {
            this.updateContextBar();
        }
        
        this.renderActivityLog(state.activityLog);
        this.redrawPlannedPaths(); // Keep paths visible on UI updates
    },

    selectSettlement(town) {
        State.selectedUnit = null;
        this.redrawPlannedPaths(); 
        this.currentContext = { type: 'settlement', data: town };
        this.updateContextBar();
        HexRenderer.drawSelectionReticle(town.location.q, town.location.r);
        
        // --- NEW: Trigger Territory Draw ---
        const radius = town.population >= 10 ? 2 : 1;
        
        if (typeof HexRenderer.drawTerritory === 'function') {
            HexRenderer.drawTerritory(town.location.q, town.location.r, radius);
        } else {
            console.error("UI: HexRenderer.drawTerritory is missing!");
        }
    },

    updateContextBar() {
        const bar = document.getElementById('context-bar');
        if (!bar) return;

        bar.classList.remove('hidden');
        requestAnimationFrame(() => bar.classList.add('active'));

        if (this.currentContext.type === 'unit') {
            const u = this.currentContext.data;
            const moves = u.movesLeft !== undefined ? u.movesLeft : (u.maxMoves || 1);
            const max = u.maxMoves || 1;
            const hp = u.hp || 10;
            const vis = u.vision || 2; 
            
            // Safe Access to Inventory
            const food = u.inventory ? u.inventory.food : 0;
            const mats = u.inventory ? u.inventory.materials : 0;

            bar.innerHTML = `
                <div class="stat-group">
                    <span class="label highlight">${u.type ? u.type.toUpperCase() : 'UNIT'}</span>
                    <div class="stat">Moves: ${moves}/${max}</div>
                    <div class="stat">HP: ${hp}</div>
                    <div class="stat">Vis: ${vis}</div>
                    
                    <div class="stat stat-separator">
                        🎒 🍞 ${food}  🪵 ${mats}
                    </div>
                </div>
                <button id="btn-context-close" class="small-btn">X</button>
            `;
        } else if (this.currentContext.type === 'settlement') {
            const t = this.currentContext.data;
            
            // Logic
            const cap = t.getHousingCap ? t.getHousingCap() : 2;
            const growthPct = t.growthThreshold 
                ? Math.floor((t.growthBucket / t.growthThreshold) * 100) 
                : 0;
            
            // Survey Data
            const pot = (typeof t.getPotentialYields === 'function') 
                ? t.getPotentialYields() 
                : { food: 0, materials: 0 };
            
            const radius = t.population >= 10 ? 2 : 1;

            // NEW LAYOUT: Flex Column to stack the two rows
            // We use a wrapper div to hold the two rows, and the close button sits to the right
            bar.innerHTML = `
                <div style="display:flex; flex-direction:column; justify-content:center;">
                    
                    <div class="stat-group" style="margin-bottom: 4px;">
                        <span class="label highlight">${t.name.toUpperCase()}</span>
                        
                        <div class="stat" title="Growth Progress">
                            👤 ${t.population}/${cap} 
                            <span class="stat-subtext">(${growthPct}%)</span>
                        </div>

                        <div class="stat">🍞 ${t.inventory.food}</div>
                        <div class="stat">🪵 ${t.inventory.materials}</div>
                        <div class="stat">🧪 ${t.inventory.science || 0}</div>
                    </div>

                    <div class="stat-group" style="border-top: 1px solid #444; padding-top: 4px; padding-left: 2px;">
                        <span class="stat-subtext" style="margin-right:8px;">SURVEY:</span>
                        <span class="stat-max" style="margin-right:12px;">🍞 Max ${pot.food}</span>
                        <span class="stat-max">🪵 Max ${pot.materials}</span>
                    </div>

                </div>
                <button id="btn-context-close" class="small-btn" style="align-self: flex-start; margin-left:10px;">X</button>
            `;
        }

        const btnClose = document.getElementById('btn-context-close');
        if (btnClose) btnClose.onclick = () => this.deselect();
    },

    renderActivityLog(logs) {
        const container = document.getElementById('activity-log-content'); 
        if (!container) return;
        
        container.innerHTML = ''; 
        if (!logs || logs.length === 0) return;

        const historyCount = 5;
        const recentLogs = logs.slice(0, historyCount);

        recentLogs.forEach((turnLog, index) => {
            const isLatest = index === 0;
            
            const turnWrapper = document.createElement('div');
            turnWrapper.className = 'log-turn';
            
            // CSS handles the opacity and border now!
            if (!isLatest) {
                turnWrapper.classList.add('historic');
            }

            const header = document.createElement('div');
            header.className = 'log-header';
            header.innerHTML = `<strong>TURN ${turnLog.turn}</strong>`;
            turnWrapper.appendChild(header);

            if (turnLog.events && turnLog.events.length > 0) {
                turnLog.events.forEach(evt => {
                    const row = document.createElement('div');
                    row.className = 'log-row';
                    
                    const rawText = evt.text || "";
                    const [type, cleanMsg] = rawText.includes('|') ? rawText.split('|') : ['info', rawText];

                    row.classList.add(`log-${type}`);
                    
                    // Use class for spacing instead of inline style
                    if (!isLatest) row.classList.add('compact'); 

                    row.innerHTML = `<span class="log-source">${evt.source}:</span> ${cleanMsg}`;
                    turnWrapper.appendChild(row);
                });
            } else {
                const empty = document.createElement('div');
                empty.className = 'log-empty'; // (Optional: Add to CSS if you want specific styling)
                empty.innerText = "No significant activity.";
                turnWrapper.appendChild(empty);
            }

            container.appendChild(turnWrapper);
        });
    },

    renderPlannedLog(plannedEvents) {
        const container = document.getElementById('planned-log-container');
        if (!container) return;
        
        container.innerHTML = '';
        if (!plannedEvents || plannedEvents.length === 0) return;

        const header = document.createElement('div');
        header.className = 'log-plan-header'; // New Class
        header.innerText = "PLANNED THIS TURN:";
        container.appendChild(header);

        plannedEvents.forEach(evt => {
            const row = document.createElement('div');
            row.className = 'log-row log-plan-row'; // New Class
            
            const [type, msg] = evt.text.includes('|') ? evt.text.split('|') : ['info', evt.text];
            
            row.classList.add(`log-${type}`); 
            row.innerHTML = `<span class="log-source">${evt.source}:</span> ${msg}`;
            container.appendChild(row);
        });
    },

    notify(message) {
        const log = document.getElementById('notifications');
        if (log) {
            const entry = document.createElement('div');
            entry.innerText = `> ${message}`;
            log.prepend(entry);
            if (log.children.length > 5) log.lastChild.remove();
        } else {
            console.log(`[NOTIFY] ${message}`);
        }
    }
};