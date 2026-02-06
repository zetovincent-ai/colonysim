import { WorldGen } from '../world/worldGen.js'; 
import { HexRenderer } from '../view/renderer.js';
import { State, TurnManager } from './gameState.js'; 
import { UI } from '../view/ui.js';
import { HexMath } from '../world/hexMath.js';
import { Settlement } from './settlement.js';
import { UnitRegistry } from './unitRegistry.js'; 
import { PlanningUI } from '../view/planningUI.js';

export const GameEngine = {
    onSave: null,
    onQuit: null,
    
    // Track Selection
    selectedUnitIndex: null, 
    planningTownIndex: 0,    

    start(worldData, saveCallback, quitCallback) {
        console.log("🚀 Engine Starting...");
        this.onSave = saveCallback;
        this.onQuit = quitCallback;

        // Wire up PlanningUI back-reference
        PlanningUI.init(this);

        // --- Load / Init Logic ---
        if (worldData.mapData && worldData.mapData.length > 0) {
            console.log("Loading Save...");
            WorldGen.loadWorld(worldData.mapData);
            
            // 1. Load State
            Object.assign(State, worldData.stateData);
            State.discoveredCoords = new Set(worldData.stateData.discoveredCoords);

            State.selectedUnit = null; 
            this.selectedUnitIndex = null;

            // HYDRATION: Settlements (via factory)
            if (State.settlements) {
                State.settlements = State.settlements.map(data => Settlement.fromSaveData(data));
            }

            // HYDRATION: Units
            if (State.units) {
                State.units = State.units.map(u => {
                    const blueprint = UnitRegistry[u.type];
                    if (blueprint) {
                        if (u.vision === undefined) u.vision = blueprint.stats.vision;
                        if (u.maxMoves === undefined) u.maxMoves = blueprint.stats.move;
                        if (u.hp === undefined) u.hp = blueprint.stats.hp;
                        if (u.movesLeft === undefined) u.movesLeft = u.maxMoves; 
                        
                        console.log(`🛠️ Hydrated Unit ${u.type}: Moves ${u.movesLeft}/${u.maxMoves}, Vis ${u.vision}`);
                    }
                    return u;
                });
            } else {
                State.units = [];
            }

            if (!State.pendingActions.unitMoves) State.pendingActions.unitMoves = {};

        } else {
            console.log("Generating New World...");
            WorldGen.initWorld(50);
            const startPos = WorldGen.findSafeSpawn();

            State.turn = 1;
            State.phase = 'PLANNING';
            State.isSettled = false;
            State.unitPos = startPos; 
            State.units = []; 
            
            State.tribe = { inventory: { food: 50, materials: 50 } };
            State.resources = { science: 0 }; 
            State.pendingActions = { move: null, unitMoves: {} }; 
            
            State.discoveredCoords = new Set([`${startPos.q},${startPos.r}`]);
            const neighbors = HexMath.getNeighbors(startPos.q, startPos.r);
            neighbors.forEach(n => State.discoveredCoords.add(`${n.q},${n.r}`));
            
            State.selectedUnit = null;
            this.selectedUnitIndex = null;
        }

        const container = document.getElementById('map-container');
        container.innerHTML = ''; 
        HexRenderer.init('map-container');
        UI.update(State);
        
        this.updatePlannedLog();

        // DETERMINE CAMERA START POSITION
        let startQ = 0;
        let startR = 0;

        if (State.settlements && State.settlements.length > 0) {
            startQ = State.settlements[0].location.q;
            startR = State.settlements[0].location.r;
        } else if (State.units && State.units.length > 0) {
            startQ = State.units[0].location.q;
            startR = State.units[0].location.r;
        } else if (State.unitPos) {
            startQ = State.unitPos.q;
            startR = State.unitPos.r;
        }

        HexRenderer.renderInitialView(startQ, startR, 10); 
        HexRenderer.centerCameraOn(startQ, startR); 

        State.discoveredCoords.forEach(key => {
            const [q, r] = key.split(',').map(Number);
            HexRenderer.revealTile(q, r);
        });

        HexRenderer.renderUnits(State.units, State.unitPos);
        if (State.settlements) {
            State.settlements.forEach(town => {
                HexRenderer.renderSettlement(town.location.q, town.location.r, town.population);
            });
        }

        this.updateEmpireVisibility();

        this.attachListeners();
        this.resetUIState();
    },

    // =========================================================
    //  PLANNING MODAL — Delegated to PlanningUI
    // =========================================================

    updatePlanningModal() {
        PlanningUI.updatePlanningModal();
    },

    // =========================================================
    //  TURN EXECUTION
    // =========================================================

    executeTurn() {
        TurnManager.processTurn(State.pendingActions, (newState) => {
            UI.update(newState);
            
            HexRenderer.clearUnits();
            HexRenderer.clearSettlements(); 
            
            HexRenderer.renderUnits(newState.units, newState.unitPos);

            if (newState.settlements) {
                HexRenderer.clearSettlements(); 
                newState.settlements.forEach(town => {
                    HexRenderer.renderSettlement(town.location.q, town.location.r, town.population);
                });
            }

            this.updateEmpireVisibility();
            
            State.discoveredCoords.forEach(key => {
                const [q, r] = key.split(',').map(Number);
                HexRenderer.revealTile(q, r);
            });

            this.selectedUnitIndex = null;
            UI.deselect(); 

            this.resetUIState();
            this.updatePlannedLog();
            this.triggerSave();
            UI.notify(`Turn ${newState.turn} started & Auto-saved.`);
        });
    },

    // =========================================================
    //  VISIBILITY
    // =========================================================

    updateEmpireVisibility() {
        if (!State.settlements && !State.units) return;

        // 1. Reveal around Settlements (Dynamic Range)
        if (State.settlements) {
            State.settlements.forEach(town => {
                let workRadius = (town.population >= 10) ? 2 : 1;
                let sightRadius = workRadius + 1;

                const tiles = HexMath.getHexesInRange(town.location.q, town.location.r, sightRadius);
                tiles.forEach(t => {
                    State.discoveredCoords.add(`${t.q},${t.r}`);
                    HexRenderer.revealTile(t.q, t.r);
                });
            });
        }

        // 2. Reveal around Units (Standard Range)
        if (State.units) {
            State.units.forEach(u => {
                const range = u.vision || 2;
                const tiles = HexMath.getHexesInRange(u.location.q, u.location.r, range);
                tiles.forEach(t => {
                    State.discoveredCoords.add(`${t.q},${t.r}`);
                    HexRenderer.revealTile(t.q, t.r);
                });
            });
        }
    },

    // =========================================================
    //  INPUT HANDLING
    // =========================================================

    handleExploreEvent(e) {
        const tileData = e.detail;
        const { q, r } = tileData;

        // 1. IS THIS A MOVE COMMAND?
        if (this.selectedUnitIndex !== null) {
            const u = this.selectedUnitIndex === 'tribe' 
                ? { location: State.unitPos, ...State.tribe } 
                : State.units[this.selectedUnitIndex];

            if (u.location.q !== q || u.location.r !== r) {
                const success = UI.handleMoveCommand(this.selectedUnitIndex, { q, r });
                if (success) {
                    this.updatePlannedLog();
                }
                return; 
            }
        }

        // 2. CHECK FOR UNITS
        let foundUnit = null;
        if (State.unitPos && State.unitPos.q === q && State.unitPos.r === r) {
            foundUnit = { type: 'tribe', location: State.unitPos, ...State.tribe }; 
        } else if (State.units) {
            foundUnit = State.units.find(u => u.location.q === q && u.location.r === r);
        }

        if (foundUnit) {
            if (State.selectedUnit && 
                State.selectedUnit.location.q === foundUnit.location.q && 
                State.selectedUnit.location.r === foundUnit.location.r) {
                
                UI.cancelPlan(this.selectedUnitIndex);
                this.updatePlannedLog();
                return;
            }

            if (foundUnit.type === 'tribe') {
                this.selectedUnitIndex = 'tribe';
            } else {
                this.selectedUnitIndex = State.units.indexOf(foundUnit);
            }
            
            UI.selectUnit(foundUnit);
            return;
        }

        // 3. CHECK FOR SETTLEMENTS
        const foundTown = State.settlements.find(s => s.location.q === q && s.location.r === r);
        if (foundTown) {
            this.selectedUnitIndex = null; 
            this.planningTownIndex = State.settlements.indexOf(foundTown);
            UI.selectSettlement(foundTown);
            return;
        }

        // 4. CLICKED EMPTY GROUND -> DESELECT
        this.selectedUnitIndex = null;
        UI.deselect();
    },

    handleRightClick() {
        console.log("🖱️ Right Click -> Deselect");
        this.selectedUnitIndex = null;
        UI.deselect();
    },

    // =========================================================
    //  PLANNED LOG
    // =========================================================

    updatePlannedLog() {
        const plannedEvents = [];

        // 1. Settlement planned events
        if (State.settlements) {
            State.settlements.forEach(town => {
                if (typeof town.getPlannedEvents === 'function') {
                    town.getPlannedEvents().forEach(evt => {
                        plannedEvents.push({ source: town.name, text: evt });
                    });
                }
            });
        }

        // 2. Unit planned events
        if (State.units) {
            State.units.forEach((unit, idx) => {
                const blueprint = UnitRegistry[unit.type];
                const consumption = blueprint?.stats?.consumption || 1;
                const forageCap = blueprint?.stats?.forageCap || 0;

                const dest = State.pendingActions.unitMoves[idx];
                const targetQ = dest ? dest.q : unit.location.q;
                const targetR = dest ? dest.r : unit.location.r;

                const tile = WorldGen.getTileData(targetQ, targetR);
                const tileType = tile ? tile.type : 'unknown';
                const forageableTiles = ['grassland', 'plains', 'forest'];
                const validTiles = forageableTiles.includes(tileType) ? 1 : 0;

                let foragedAmount = 0;
                if (validTiles > 0 && forageCap > 0) {
                    foragedAmount = Math.min(validTiles, forageCap, consumption);
                }

                const netChange = foragedAmount - consumption;
                const currentFood = unit.inventory ? unit.inventory.food : 0;

                if (netChange < 0) {
                    if (currentFood + netChange < 0) {
                        plannedEvents.push({ source: unit.type, text: `warning|⚠️ STARVATION RISK! (Will run out of food)` });
                    } else {
                        plannedEvents.push({ source: unit.type, text: `consumption|Eating Rations (${netChange} Food)` });
                    }
                } else {
                    plannedEvents.push({ source: unit.type, text: `production|Sustainable (Foraging matches needs)` });
                }
            });
        }

        if (typeof UI.renderPlannedLog === 'function') {
            UI.renderPlannedLog(plannedEvents);
        }
    },

    // =========================================================
    //  SAVE / QUIT
    // =========================================================

    triggerSave() {
        const stateCopy = JSON.parse(JSON.stringify(State));
        stateCopy.discoveredCoords = Array.from(State.discoveredCoords);

        const payload = {
            mapData: Array.from(WorldGen.getWorldMap().entries()),
            stateData: stateCopy,
            timestamp: Date.now()
        };
        if (this.onSave) this.onSave(payload);
    },

    // =========================================================
    //  LISTENERS
    // =========================================================

    attachListeners() {
        const replace = (id) => {
            const el = document.getElementById(id);
            if (!el) return null;
            const clone = el.cloneNode(true);
            el.parentNode.replaceChild(clone, el);
            return clone;
        };

        const newBtnPlan = replace('btn-plan');
        const newBtnEnd = replace('btn-end-turn');
        const newBtnSavePlan = replace('btn-save-plan');
        const newBtnCancel = replace('btn-cancel-plan');
        const newBtnSaveQuit = replace('btn-save-quit');
        const modal = document.getElementById('planning-modal');

        if (newBtnPlan) {
            newBtnPlan.addEventListener('click', () => {
                modal.classList.remove('hidden');
                this.planningTownIndex = 0; 
                this.updatePlanningModal();
            });
        }

        if (newBtnEnd) {
            newBtnEnd.addEventListener('click', () => {
                this.executeTurn();
            });
        }

        if (newBtnSavePlan) {
            newBtnSavePlan.addEventListener('click', () => {
                modal.classList.add('hidden');
                UI.notify("Plan Saved.");
                this.updatePlannedLog(); 
            });
        }

        if (newBtnCancel) {
            newBtnCancel.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        if (newBtnSaveQuit) {
            newBtnSaveQuit.addEventListener('click', () => {
                this.triggerSave(); 
                if (this.onQuit) this.onQuit();
            });
        }

        // --- MOUSE LISTENERS ---
        window.removeEventListener('explore-tile', this.handleExploreEvent);
        window.addEventListener('explore-tile', this.handleExploreEvent.bind(this));

        window.addEventListener('contextmenu', (e) => {
            e.preventDefault(); 
            this.handleRightClick();
        });
    },

    // =========================================================
    //  DEV MODE & UI RESET
    // =========================================================

    isDevMode: false,

    toggleDevMode() {
        this.isDevMode = !this.isDevMode; 
        console.log(`🛠️ Dev Mode: ${this.isDevMode ? "ON" : "OFF"}`);
        const allTiles = WorldGen.getWorldMap();
        allTiles.forEach(tile => HexRenderer.setVisualFog(tile.q, tile.r, this.isDevMode));
        UI.notify(`DEV: Map Visibility ${this.isDevMode ? "ENABLED" : "DISABLED"}`);
    },

    resetUIState() {
        State.phase = 'PLANNING';
        const btnMain = document.getElementById('btn-main-action');
        if (btnMain) {
            btnMain.innerText = 'Open Planning';
            btnMain.classList.remove('primary');
        }
        this.selectedUnitIndex = null;
    }
};
