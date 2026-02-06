import { WorldGen } from '../world/worldGen.js'; 
import { HexRenderer } from '../view/renderer.js';
import { State, TurnManager } from './gameState.js'; 
import { UI } from '../view/ui.js';
import { HexMath } from '../world/hexMath.js';
import { Settlement } from './settlement.js';
import { BuildingRegistry } from './buildingRegistry.js';
import { JobRegistry } from './jobRegistry.js';
import { TechRegistry } from './techRegistry.js'; 
import { UnitRegistry } from './unitRegistry.js'; 
import { TechCategories } from './techCategories.js';

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

        // --- Load / Init Logic ---
        if (worldData.mapData && worldData.mapData.length > 0) {
            console.log("Loading Save...");
            WorldGen.loadWorld(worldData.mapData);
            
            // 1. Load State
            Object.assign(State, worldData.stateData);
            State.discoveredCoords = new Set(worldData.stateData.discoveredCoords);

            State.selectedUnit = null; 
            this.selectedUnitIndex = null;

            // HYDRATION: Settlements
            if (State.settlements) {
                State.settlements = State.settlements.map(data => {
                    const town = new Settlement(data.name, data.location.q, data.location.r);
                    Object.assign(town, data); 
                    
                    // --- EXISTING CHECKS ---
                    if (!town.assignments) town.assignments = {};
                    if (!town.knownTechs) town.knownTechs = []; // KEEP THIS
                    if (town.techProject === undefined) town.techProject = null;
                    if (town.unitProject === undefined) town.unitProject = null; 

                    // --- Dynamic Category Hydration ---
                    if (!town.techLevels) town.techLevels = {};

                    // iterate through the master list to ensure we have every category
                    Object.keys(TechCategories).forEach(catId => {
                        if (town.techLevels[catId] === undefined) {
                            town.techLevels[catId] = 1; // Default to Level 1
                            console.log(`🛠️ Hydrated Category '${catId}' for ${town.name}`);
                        }
                    });

                    console.log("🛠️ Hydration: Updating resource scan for " + town.name);
                    town.scanResources();
                    return town;
                });
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

    // --- NEW: Right Click Handler ---
    handleRightClick() {
        console.log("🖱️ Right Click -> Deselect");
        this.selectedUnitIndex = null;
        UI.deselect(); // This clears the visual ring
    },

    updatePlannedLog() {
        const plannedEvents = [];

        // 1. Settlement Events (Existing)
        if (State.settlements) {
            State.settlements.forEach(town => {
                if (typeof town.getPlannedEvents === 'function') {
                    const events = town.getPlannedEvents();
                    events.forEach(text => {
                        plannedEvents.push({ source: town.name, text: text });
                    });
                }
            });
        }

        // 2. Tribe Move (Existing)
        if (State.pendingActions.move) {
            plannedEvents.push({ 
                source: "Tribe", 
                text: `move|Migration to ${State.pendingActions.move.q},${State.pendingActions.move.r}` 
            });
        }
        
        // 3. Unit Moves & Survival (UPDATED)
        State.units.forEach((unit, idx) => {
            const blueprint = UnitRegistry[unit.type];
            const moveDest = State.pendingActions.unitMoves[idx];
            
            // A. Log Movement
            if (moveDest) {
                plannedEvents.push({ 
                    source: unit.type, 
                    text: `move|Moving to ${moveDest.q},${moveDest.r}` 
                });
            }

            // B. Predict Metabolism (The "Simulation")
            // Use Destination if moving, otherwise Current Location
            const finalPos = moveDest || unit.location;
            
            const consumption = blueprint.stats.consumption || 1;
            const forageCap = blueprint.stats.forageCap || 0;
            let predictedForage = 0;

            if (forageCap > 0) {
                let candidates = [{q: finalPos.q, r: finalPos.r}];
                if (forageCap > 1) {
                    const neighbors = HexMath.getNeighbors(finalPos.q, finalPos.r);
                    candidates = candidates.concat(neighbors);
                }
                
                let validTiles = 0;
                candidates.forEach(c => {
                    const t = WorldGen.getTileData(c.q, c.r);
                    if (t && ['grassland', 'forest', 'plains'].includes(t.type)) validTiles++;
                });
                
                predictedForage = Math.min(validTiles, forageCap, consumption);
            }

            const netChange = predictedForage - consumption;
            const currentFood = unit.inventory ? unit.inventory.food : 0;
            
            // Format the Log
            if (netChange < 0) {
                // Warning logic
                if (currentFood + netChange < 0) {
                    plannedEvents.push({ source: unit.type, text: `warning|⚠️ STARVATION RISK! (Will run out of food)` });
                } else {
                    plannedEvents.push({ source: unit.type, text: `consumption|Eating Rations (${netChange} Food)` });
                }
            } else {
                plannedEvents.push({ source: unit.type, text: `production|Sustainable (Foraging matches needs)` });
            }
        });

        if (typeof UI.renderPlannedLog === 'function') {
            UI.renderPlannedLog(plannedEvents);
        }
    },

    handleExploreEvent(e) {
        const tileData = e.detail;
        const { q, r } = tileData;

        // 1. IS THIS A MOVE COMMAND?
        if (this.selectedUnitIndex !== null) {
            const u = this.selectedUnitIndex === 'tribe' 
                ? { location: State.unitPos, ...State.tribe } 
                : State.units[this.selectedUnitIndex];

            if (u.location.q !== q || u.location.r !== r) {
                // Attempt the move
                const success = UI.handleMoveCommand(this.selectedUnitIndex, { q, r });
                
                // If success, update the log immediately
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
                // Canceling also updates log
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

    // --- NEW: Dynamic Visibility Logic ---
    updateEmpireVisibility() {
        if (!State.settlements && !State.units) return;

        // 1. Reveal around Settlements (Dynamic Range)
        if (State.settlements) {
            State.settlements.forEach(town => {
                // Logic: If Pop >= 10, Work Radius is 2.
                // Sight is usually Work Radius + 1.
                let workRadius = (town.population >= 10) ? 2 : 1;
                let sightRadius = workRadius + 1;

                // Use the new HexMath helper
                const tiles = HexMath.getHexesInRange(town.location.q, town.location.r, sightRadius);
                tiles.forEach(t => {
                    State.discoveredCoords.add(`${t.q},${t.r}`); // Add to memory
                    HexRenderer.revealTile(t.q, t.r);             // Update visuals
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

    // ... (rest of renderUnitPlanning, renderCityManager, etc. remains the same) ...
    // Skipping to executeTurn for the fix

    updatePlanningModal() {
        const container = document.getElementById('planning-options');
        container.innerHTML = ''; 

        const contextTown = State.settlements.find(s => UI.currentContext === s);
        
        let activeTown = contextTown;
        if (!activeTown && State.settlements.length > 0) {
            activeTown = State.settlements[this.planningTownIndex];
        }

        if (activeTown) {
            const showArrows = !contextTown; 
            this.renderCityManager(container, activeTown, showArrows);
            return;
        }

        this.renderUnitPlanning(container);
    },

    renderUnitPlanning(container) {
        let canSettle = false;
        let settlerPos = null;

        if (this.selectedUnitIndex === 'tribe') {
            canSettle = true;
            settlerPos = State.unitPos;
        } else if (this.selectedUnitIndex !== null) {
            const u = State.units[this.selectedUnitIndex];
            if (u && u.type === 'settler') {
                canSettle = true;
                settlerPos = u.location;
            }
        }

        if (canSettle) {
            const title = document.createElement('h3');
            title.innerText = "Found a Settlement?";
            container.appendChild(title);

            const btnSettle = document.createElement('button');
            btnSettle.innerText = "Settle Here";
            btnSettle.className = "primary";
            btnSettle.style.marginTop = "15px";
            
            btnSettle.onclick = () => {
                const newTown = new Settlement("New Outpost", settlerPos.q, settlerPos.r);
                
                if (this.selectedUnitIndex === 'tribe') {
                    newTown.inventory.food += State.tribe.inventory.food;
                    newTown.inventory.materials += State.tribe.inventory.materials;
                    State.unitPos = null; 
                } else {
                    State.units.splice(this.selectedUnitIndex, 1);
                    this.selectedUnitIndex = null;
                }

                State.settlements.push(newTown);
                UI.notify(`Settlement '${newTown.name}' founded!`);
                UI.update(State);
                
                document.getElementById('btn-save-plan').click(); 
            };
            container.appendChild(btnSettle);
        } else {
            container.innerHTML = `<p>Select a Settlement or Settler Unit.</p>`;
        }
    },
    
    // ... renderCityManager and others omitted for brevity (no changes there) ...
    renderCityManager(container, town, showArrows) {
        // [Existing renderCityManager code...]
        // Just providing the executeTurn update below
        const headerDiv = document.createElement('div');
        headerDiv.className = 'city-cycle-header';
        
        const btnPrev = document.createElement('button');
        btnPrev.innerText = "◀";
        btnPrev.className = 'cycle-btn';
        btnPrev.style.visibility = (showArrows && State.settlements.length > 1) ? 'visible' : 'hidden';
        btnPrev.onclick = () => {
            this.planningTownIndex = (this.planningTownIndex - 1 + State.settlements.length) % State.settlements.length;
            this.updatePlanningModal();
        };

        const title = document.createElement('span');
        title.style.color = "white";
        title.style.fontWeight = "bold";
        title.innerText = `Managing: ${town.name}`;

        const btnNext = document.createElement('button');
        btnNext.innerText = "▶";
        btnNext.className = 'cycle-btn';
        btnNext.style.visibility = (showArrows && State.settlements.length > 1) ? 'visible' : 'hidden';
        btnNext.onclick = () => {
            this.planningTownIndex = (this.planningTownIndex + 1) % State.settlements.length;
            this.updatePlanningModal();
        };

        headerDiv.appendChild(btnPrev);
        headerDiv.appendChild(title);
        headerDiv.appendChild(btnNext);
        container.appendChild(headerDiv);

        const tabContainer = document.createElement('div');
        tabContainer.className = 'tab-container';
        
        const tabCity = document.createElement('button');
        tabCity.className = 'tab-btn active'; 
        tabCity.innerText = "City & Jobs";
        
        const tabTech = document.createElement('button');
        tabTech.className = 'tab-btn';
        const sci = town.inventory.science || 0;
        tabTech.innerText = `Research (${sci} 🧪)`;
        
        const tabRecruit = document.createElement('button');
        tabRecruit.className = 'tab-btn';
        tabRecruit.innerText = "Recruit";
        
        tabContainer.appendChild(tabCity);
        tabContainer.appendChild(tabTech);
        tabContainer.appendChild(tabRecruit);
        container.appendChild(tabContainer);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'tab-content';
        container.appendChild(contentDiv);

        const switchTab = (tabName) => {
            contentDiv.innerHTML = ''; 
            tabCity.classList.remove('active');
            tabTech.classList.remove('active');
            tabRecruit.classList.remove('active');

            if (tabName === 'city') {
                tabCity.classList.add('active');
                this.renderCityTab(contentDiv, town);
            } else if (tabName === 'tech') {
                tabTech.classList.add('active');
                this.renderTechTab(contentDiv, town);
            } else {
                tabRecruit.classList.add('active');
                this.renderRecruitTab(contentDiv, town); 
            }
        };

        tabCity.onclick = () => switchTab('city');
        tabTech.onclick = () => switchTab('tech');
        tabRecruit.onclick = () => switchTab('recruit');
        switchTab('city');
    },
    
    renderCityTab(container, town) {
        // 1. WORKFORCE & POPULATION
        const totalPop = town.population;
        const assignedPop = town.getTotalAssigned();
        const idlePop = totalPop - assignedPop;
        
        const popLabel = document.createElement('div');
        popLabel.innerHTML = `<strong>Workforce:</strong> ${idlePop} Idle / ${totalPop} Total`;
        popLabel.style.marginBottom = "10px"; 
        container.appendChild(popLabel);

        // 2. JOB ASSIGNMENT LIST
        Object.values(JobRegistry).forEach(job => {
            const cap = town.jobCap[job.id] || 0;
            const isCityJob = !job.reqTile || job.reqTile.length === 0;

            if (cap > 0 || isCityJob) {
                const row = document.createElement('div');
                row.className = 'job-row'; 

                const current = town.assignments[job.id] || 0;
                const displayCap = isCityJob ? "∞" : cap;

                const nameSpan = document.createElement('span');
                nameSpan.innerText = `${job.icon} ${job.name}`;
                
                const ctrlDiv = document.createElement('div');
                const btnMinus = document.createElement('button');
                btnMinus.innerText = "-";
                btnMinus.className = "small-btn";
                btnMinus.onclick = () => {
                    if(town.assignJob(job.id, -1)) this.updatePlanningModal();
                };

                const countSpan = document.createElement('span');
                countSpan.innerText = ` ${current} / ${displayCap} `;
                countSpan.style.margin = "0 5px";

                const btnPlus = document.createElement('button');
                btnPlus.innerText = "+";
                btnPlus.className = "small-btn";
                
                const capped = !isCityJob && current >= cap;
                btnPlus.disabled = (idlePop <= 0 || capped);
                
                btnPlus.onclick = () => {
                    if(town.assignJob(job.id, 1)) this.updatePlanningModal();
                };

                ctrlDiv.appendChild(btnMinus);
                ctrlDiv.appendChild(countSpan);
                ctrlDiv.appendChild(btnPlus);

                row.appendChild(nameSpan);
                row.appendChild(ctrlDiv);
                container.appendChild(row);
            }
        });

        // 3. BUILDING LIST
        container.appendChild(document.createElement('hr'));
        this.renderBuildingList(container, town);
    },

    renderBuildingList(container, town) {
        // [Existing Code...]
        if (town.currentProject) {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'project-status';
            statusDiv.innerHTML = `<div>🚧 ${town.currentProject.name}</div><div class="progress-bar-bg"><div class="progress-fill" style="width:50%"></div></div>`;
            container.appendChild(statusDiv);
        } else {
            const list = document.createElement('div');
            list.className = 'building-list';

            Object.values(BuildingRegistry).forEach(blueprint => {
                const card = document.createElement('div');
                card.className = 'building-card';

                let canBuild = true;
                let reason = "";

                if (town.inventory.materials < blueprint.cost.materials) {
                    canBuild = false;
                    reason = "Need Mats";
                }

                if (blueprint.upgradeFrom) {
                    if (!town.buildings.includes(blueprint.upgradeFrom)) {
                        canBuild = false;
                        reason = `Req ${BuildingRegistry[blueprint.upgradeFrom].name}`;
                    }
                }

                const unlockingTech = Object.values(TechRegistry).find(t => t.unlocks.includes(blueprint.id));
                if (unlockingTech) {
                    if (!town.knownTechs.includes(unlockingTech.id)) {
                        canBuild = false;
                        reason = `Req: ${unlockingTech.name}`;
                    }
                }

                const info = document.createElement('div');
                info.className = 'building-info';
                info.innerHTML = `
                    <h4>${blueprint.name}</h4>
                    <span class="cost">🪵 ${blueprint.cost.materials} Mats | ⏳ ${blueprint.buildTime} Turns</span>
                `;

                const btn = document.createElement('button');
                btn.className = 'build-btn';
                btn.innerText = canBuild ? "Build" : reason;
                btn.disabled = !canBuild;

                btn.onclick = () => {
                    if (town.startConstruction(blueprint.id)) {
                        UI.notify(`Started work on ${blueprint.name}`);
                        this.updatePlanningModal(); 
                    }
                };

                card.appendChild(info);
                card.appendChild(btn);
                list.appendChild(card);
            });
            container.appendChild(list);
        }
    },

    renderTechTab(container, town) {
        // A. ACTIVE PROJECT STATUS
        if (town.techProject) {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'project-status';
            const progressPercent = ((town.techProject.max - town.techProject.progress) / town.techProject.max) * 100;
            statusDiv.innerHTML = `
                <h4>Incorporating: ${TechRegistry[town.techProject.id].name}</h4>
                <div class="progress-bar-bg"><div class="progress-fill" style="width: ${progressPercent}%"></div></div>
                <p>Needs <strong>Innovators</strong> to finish (${town.techProject.progress} effort left)</p>
            `;
            container.appendChild(statusDiv);
            return; 
        }

        // B. CATEGORY SKILLS
        const catHeader = document.createElement('h4');
        catHeader.innerText = "Category Proficiency";
        catHeader.className = "tech-header"; // NEW CLASS
        container.appendChild(catHeader);

        const catGrid = document.createElement('div');
        catGrid.className = "tech-grid"; // NEW CLASS (No more inline grid styles!)

        Object.values(TechCategories).forEach(cat => {
            const currentLvl = town.techLevels[cat.id] || 1;
            const cost = town.getCategoryCost(cat.id);
            const canAfford = town.inventory.science >= cost;

            const card = document.createElement('div');
            card.className = 'building-card tech-card'; // NEW CLASS

            card.innerHTML = `
                <div style="font-weight:bold;">${cat.name} (Lv ${currentLvl})</div>
                <div style="font-size:0.85em; color:#ccc;">${cat.description}</div>
                <div class="tech-card-footer">
                    <span class="text-info">${cost} Sci</span>
                </div>
            `;

            const btn = document.createElement('button');
            btn.className = "small-btn";
            btn.innerText = "Upgrade";
            btn.style.marginTop = "5px"; // (Keeping this small tweak is okay, or move to css)
            btn.disabled = !canAfford;
            
            btn.onclick = () => {
                if (town.upgradeCategory(cat.id)) {
                    UI.notify(`Upgraded ${cat.name} to Level ${currentLvl + 1}`);
                    this.updatePlanningModal();
                }
            };

            card.appendChild(btn);
            catGrid.appendChild(card);
        });
        container.appendChild(catGrid);

        // C. SPECIFIC TECHS
        const techHeader = document.createElement('h4');
        techHeader.innerText = "Available Technologies";
        techHeader.className = "tech-header"; // NEW CLASS
        container.appendChild(techHeader);

        const list = document.createElement('div');
        list.className = 'building-list';

        Object.values(TechRegistry).forEach(tech => {
            if (town.knownTechs.includes(tech.id)) return; 

            const card = document.createElement('div');
            card.className = 'building-card'; 

            // Check Requirements
            let locked = false;
            let reqText = "";
            if (tech.req) {
                const reqs = Object.entries(tech.req).map(([catId, lvl]) => {
                    const myLvl = town.techLevels[catId] || 1;
                    // NEW CLASSES: text-success / text-warning
                    const colorClass = myLvl >= lvl ? "text-success" : "text-warning"; 
                    if (myLvl < lvl) locked = true;
                    return `<span class="${colorClass}">${TechCategories[catId].name} ${lvl}</span>`;
                });
                reqText = reqs.join(", ");
            }

            const info = document.createElement('div');
            info.className = 'building-info';
            info.innerHTML = `
                <h4>${tech.name}</h4>
                <div style="font-size:0.8em; margin-bottom:4px;">Req: ${reqText || "None"}</div>
                <span class="cost-display">🧪 ${tech.cost} Sci | ⚙️ ${tech.effort} Effort</span>
            `;

            const btn = document.createElement('button');
            btn.className = 'build-btn';
            
            if (locked) {
                btn.innerText = "Locked";
                btn.disabled = true;
                btn.style.opacity = "0.5";
            } else if (town.inventory.science >= tech.cost) {
                btn.innerText = "Unlock";
                btn.onclick = () => {
                    if (town.startTechProject(tech.id)) this.updatePlanningModal();
                };
            } else {
                btn.innerText = "Need Sci";
                btn.disabled = true;
            }

            card.appendChild(info);
            card.appendChild(btn);
            list.appendChild(card);
        });
        container.appendChild(list);
    },

    renderRecruitTab(container, town) {
        // 1. ACTIVE TRAINING STATUS
        if (town.unitProject) {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'project-status';
            const progressPercent = 100 - ((town.unitProject.progress / town.unitProject.max) * 100);
            
            statusDiv.innerHTML = `
                <h4>Training: ${UnitRegistry[town.unitProject.id].name}</h4>
                <div class="progress-bar-bg"><div class="progress-fill" style="width: ${progressPercent}%"></div></div>
                <p>${town.unitProject.progress} effort left</p>
            `;
            container.appendChild(statusDiv);
            return;
        }

        // 2. RECRUITMENT LIST
        const list = document.createElement('div');
        list.className = 'building-list';

        Object.values(UnitRegistry).forEach(unit => {
            const card = document.createElement('div');
            card.className = 'building-card';

            const info = document.createElement('div');
            info.className = 'building-info';
            
            // CLEAN HTML: Uses 'cost-display' and 'text-warning' classes
            info.innerHTML = `
                <h4>${unit.name}</h4>
                <span class="cost-display">🍞 ${unit.cost.food} Food | 🪵 ${unit.cost.materials || 0} Mats</span><br>
                <span class="text-warning" style="font-size:0.9em">Req: ${unit.popCost} Pop</span>
            `;

            const btn = document.createElement('button');
            btn.className = 'build-btn';
            
            const canAfford = town.inventory.food >= unit.cost.food && 
                              town.inventory.materials >= (unit.cost.materials || 0);
            
            const hasPop = town.population > unit.popCost;

            if (canAfford && hasPop) {
                btn.innerText = "Train";
                btn.onclick = () => {
                    if (town.startUnitProject(unit.id)) this.updatePlanningModal();
                };
            } else {
                btn.innerText = hasPop ? "Need Res" : "Need Pop";
                btn.disabled = true;
            }

            card.appendChild(info);
            card.appendChild(btn);
            list.appendChild(card);
        });
        container.appendChild(list);
    },

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

            this.updateEmpireVisibility(); // Recalculate based on new Pop/Positions
            
            // Re-reveal everything in memory (redundant safety, but good)
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