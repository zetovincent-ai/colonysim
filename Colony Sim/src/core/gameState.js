import { HexMath } from '../world/hexMath.js'; 
import { UnitRegistry } from './unitRegistry.js'; 
import { WorldGen } from '../world/worldGen.js';

export const State = {
    turn: 1,
    phase: 'PLANNING', 
    settlements: [], 
    
    // Legacy Tribe (Pre-settlement)
    unitPos: { q: 0, r: 0 }, 
    tribe: { inventory: { food: 50, materials: 50 } },

    // NEW: Multi-Unit System
    units: [], // Array of { type, location, moves }

    resources: { science: 0 }, 
    pendingActions: { move: null, unitMoves: {} }, // unitMoves is map: unitIndex -> {q,r}
    discoveredCoords: new Set(['0,0']),
    
    activityLog: []
};

export const TurnManager = {
    processTurn(plan, updateUI) {
        console.log("🔒 Execution Phase Started");
        const turnMessages = []; // Collector for all log events this turn

        // 1. Resolve Tribe Movement (Legacy)
        if (State.unitPos && plan.move) {
            State.unitPos = plan.move;
            State.pendingActions.move = null;
        }

        // 2. Resolve Unit Movement
        if (plan.unitMoves) {
            Object.entries(plan.unitMoves).forEach(([index, dest]) => {
                const i = parseInt(index);
                if (State.units[i]) State.units[i].location = dest;
            });
            State.pendingActions.unitMoves = {}; 
        }

        // 3. Tribe Consumption (Legacy)
        if (State.unitPos) {
            if (State.tribe.inventory.food > 0) {
                State.tribe.inventory.food -= 1; 
            } else {
                turnMessages.push({ source: "Tribe", text: "warning|⚠️ The Tribe is starving!" });
            }
        }

        // --- NEW: UNIT METABOLISM & FORAGING ---
        // Iterate backwards so we can safely remove dead units
        for (let i = State.units.length - 1; i >= 0; i--) {
            const u = State.units[i];
            const blueprint = UnitRegistry[u.type];
            
            // Default to 1 if missing
            const consumption = blueprint.stats.consumption !== undefined ? blueprint.stats.consumption : 1;
            const forageCap = blueprint.stats.forageCap || 0;
            
            // A. CALCULATE FORAGING
            let foragedAmount = 0;
            
            if (forageCap > 0) {
                // Get tiles to check: Current Tile + Neighbors (if cap > 1)
                let candidates = [{q: u.location.q, r: u.location.r}];
                
                // If unit represents multiple people (Settler), check neighbors too
                if (forageCap > 1) {
                    const neighbors = HexMath.getNeighbors(u.location.q, u.location.r);
                    candidates = candidates.concat(neighbors);
                }

                // Check valid tiles in WorldGen
                let validTiles = 0;
                candidates.forEach(coord => {
                    const tile = WorldGen.getTileData(coord.q, coord.r);
                    // "Arable" tiles support foraging
                    if (tile && ['grassland', 'forest', 'plains'].includes(tile.type)) {
                        validTiles++;
                    }
                });

                // Rules: 
                // 1. Can't forage more than land offers (validTiles)
                // 2. Can't forage more than manpower (forageCap)
                // 3. Can't forage more than hunger (consumption - no net positive gain)
                foragedAmount = Math.min(validTiles, forageCap, consumption);
            }

            // B. APPLY CONSUMPTION
            const netNeed = consumption - foragedAmount;
            
            if (netNeed > 0) {
                if (u.inventory && u.inventory.food >= netNeed) {
                    u.inventory.food -= netNeed;
                } else {
                    // Eat whatever is left, then starve
                    if (u.inventory) u.inventory.food = 0;
                    u.hp -= 2; // Starvation damage
                    turnMessages.push({ 
                        source: u.type, 
                        text: `warning|💔 Unit starving at ${u.location.q},${u.location.r} (Foraged ${foragedAmount}, Needed ${consumption})` 
                    });
                }
            }

            // C. PASSIVE HEAL (If at city)
            const atCity = State.settlements.find(s => s.location.q === u.location.q && s.location.r === u.location.r);
            if (atCity && u.hp < u.maxHp) {
                u.hp = Math.min(u.hp + 2, u.maxHp);
            }

            // D. DEATH CHECK
            if (u.hp <= 0) {
                turnMessages.push({ 
                    source: "Casualty", 
                    text: `death|💀 ${u.type} perished at ${u.location.q},${u.location.r}.` 
                });
                State.units.splice(i, 1);
            }
        }

        // 4. Process Settlements (Units are born here!)
        State.settlements.forEach(town => {
            if (typeof town.update === 'function') {
                const logs = town.update(); 
                logs.forEach(msg => {
                    turnMessages.push({
                        source: town.name,
                        text: msg
                    });
                });
            }
        });

        // 5. AUTO-EXPLORE (Moved to END so new units reveal fog immediately)
        const reveal = (q, r, radius) => {
            State.discoveredCoords.add(`${q},${r}`); 
            const ring1 = HexMath.getNeighbors(q, r);
            ring1.forEach(n => {
                State.discoveredCoords.add(`${n.q},${n.r}`);
                if (radius > 1) {
                    HexMath.getNeighbors(n.q, n.r).forEach(n2 => 
                        State.discoveredCoords.add(`${n2.q},${n2.r}`)
                    );
                }
            });
        };

        if (State.unitPos) reveal(State.unitPos.q, State.unitPos.r, 1);
        if (State.units) State.units.forEach(u => reveal(u.location.q, u.location.r, u.vision || 1));
        State.settlements.forEach(town => reveal(town.location.q, town.location.r, 2));

        // 6. Archive Logs
        if (turnMessages.length > 0) {
            State.activityLog.unshift({
                turn: State.turn,
                events: turnMessages
            });
            if (State.activityLog.length > 20) State.activityLog.pop();
        }

        State.turn++;
        updateUI(State);
        return { movedTo: State.unitPos };
    }
};