import { BuildingRegistry } from './buildingRegistry.js';
import { JobRegistry } from './jobRegistry.js';
import { TechRegistry } from './techRegistry.js';
import { TechCategories } from './techCategories.js';
import { UnitRegistry } from './unitRegistry.js'; 
import { WorldGen } from '../world/worldGen.js';
import { HexMath } from '../world/hexMath.js';
import { State } from './gameState.js'; 

export class Settlement {
    constructor(name, q, r) {
        this.name = name;
        this.location = { q, r };
        this.population = 5; 
        this.growthBucket = 0; 
        this.growthThreshold = 10; 

        this.inventory = {
            food: 50,      
            materials: 50,
            science: 0
        };

        this.buildings = []; 
        this.currentProject = null; 
        
        // --- TECH SYSTEM 2.0 ---
        this.knownTechs = [];
        this.techProject = null; 
        this.techLevels = {
            survival: 1,
            construction: 1,
            agriculture: 1,
            husbandry: 1
        };

        this.unitProject = null; 
        this.assignments = {}; 
        this.jobCap = {};      
        
        this.turnLogs = [];
        this.scanResources();
    }

    // =========================================================
    //  SAVE / LOAD — Centralized Hydration
    // =========================================================

    /**
     * Reconstruct a Settlement from raw save data with safe defaults.
     * Handles missing fields from older saves gracefully.
     * @param {object} data - Plain object from JSON save
     * @returns {Settlement}
     */
    static fromSaveData(data) {
        const town = new Settlement(data.name, data.location.q, data.location.r);
        
        // Overlay saved values onto the fresh instance
        Object.assign(town, data);

        // --- Defensive hydration for fields that may be missing in older saves ---
        if (!town.assignments) town.assignments = {};
        if (!town.knownTechs) town.knownTechs = [];
        if (town.techProject === undefined) town.techProject = null;
        if (town.unitProject === undefined) town.unitProject = null;

        // Ensure every tech category exists (handles new categories added after save)
        if (!town.techLevels) town.techLevels = {};
        Object.keys(TechCategories).forEach(catId => {
            if (town.techLevels[catId] === undefined) {
                town.techLevels[catId] = 1;
                console.log(`🛠️ Hydrated Category '${catId}' for ${town.name}`);
            }
        });

        // Validate active techProject references a real tech
        if (town.techProject && !TechRegistry[town.techProject.id]) {
            console.warn(`⚠️ Save Migration: Tech project '${town.techProject.id}' not found in registry. Clearing.`);
            town.techProject = null;
        }

        // Validate active unitProject references a real unit
        if (town.unitProject && !UnitRegistry[town.unitProject.id]) {
            console.warn(`⚠️ Save Migration: Unit project '${town.unitProject.id}' not found in registry. Clearing.`);
            town.unitProject = null;
        }

        // Recalculate job caps from current map data
        town.scanResources();

        return town;
    }

    // =========================================================
    //  RESOURCE SCANNING
    // =========================================================

    scanResources() {
        // Reset Caps
        this.jobCap = {
            forager: 0, gatherer: 0, woodcutter: 0, 
            scholar: 100, innovator: 100, trainer: 100 
        };

        // 1. Determine Dynamic Radius
        // Default is 1. If Pop >= 10, expand to 2.
        // (Future: Techs like 'Surveying' could add +1 too)
        let radius = 1;
        if (this.population >= 10) radius = 2;

        // 2. Get All Tiles in Range (using new helper)
        const rangeTiles = HexMath.getHexesInRange(this.location.q, this.location.r, radius);

        // 3. Tally Up Jobs based on Tile Types
        rangeTiles.forEach(coord => {
            if (coord.q === this.location.q && coord.r === this.location.r) return;

            const tile = WorldGen.getTileData(coord.q, coord.r);
            if (!tile) return;

            if (JobRegistry.forager.reqTile.includes(tile.type)) this.jobCap.forager++;
            if (JobRegistry.gatherer.reqTile.includes(tile.type)) this.jobCap.gatherer++;
            if (JobRegistry.woodcutter.reqTile.includes(tile.type)) this.jobCap.woodcutter++;
        });
    }

    // =========================================================
    //  TURN UPDATE
    // =========================================================

    update() {
        this.turnLogs = []; 
        this.produceResources(); 
        this.advanceConstruction();
        this.advanceTech();
        this.advanceRecruitment();
        this.handleGrowth();
        return this.turnLogs; 
    }

    produceResources() {
        Object.entries(this.assignments).forEach(([jobId, count]) => {
            if (count > 0) {
                const job = JobRegistry[jobId];
                if (job) {
                    let logParts = [];
                    if (job.yield.food) {
                        const amt = job.yield.food * count;
                        this.inventory.food += amt;
                        logParts.push(`${amt} Food`);
                    }
                    if (job.yield.materials) {
                        const amt = job.yield.materials * count;
                        this.inventory.materials += amt;
                        logParts.push(`${amt} Mats`);
                    }
                    if (job.yield.science) {
                        const amt = job.yield.science * count;
                        this.inventory.science += amt;
                        logParts.push(`${amt} Science`);
                    }
                    if (logParts.length > 0) {
                        this.turnLogs.push(`production|${job.icon} ${count} ${job.name}s produced ${logParts.join(' & ')}`);
                    }
                }
            }
        });
    }

    getPotentialYields() {
        let potential = { food: 0, materials: 0, science: 0 };
        
        let radius = (this.population >= 10) ? 2 : 1;
        const rangeTiles = HexMath.getHexesInRange(this.location.q, this.location.r, radius);

        rangeTiles.forEach(coord => {
            if (coord.q === this.location.q && coord.r === this.location.r) return;

            const tile = WorldGen.getTileData(coord.q, coord.r);
            if (!tile) return;

            Object.values(JobRegistry).forEach(job => {
                if (job.reqTile && job.reqTile.includes(tile.type)) {
                    if (job.yield.food) potential.food += job.yield.food;
                    if (job.yield.materials) potential.materials += job.yield.materials;
                    if (job.yield.science) potential.science += job.yield.science;
                }
            });
        });
        
        return potential;
    }

    // =========================================================
    //  TECH & CATEGORY LOGIC
    // =========================================================

    getCategoryCost(catId) {
        const cat = TechCategories[catId];
        if (!cat) return 9999;
        const currentLvl = this.techLevels[catId] || 1;
        return Math.floor(cat.baseCost * Math.pow(cat.costMultiplier, currentLvl - 1));
    }

    upgradeCategory(catId) {
        const cost = this.getCategoryCost(catId);
        if (this.inventory.science >= cost) {
            this.inventory.science -= cost;
            if (!this.techLevels[catId]) this.techLevels[catId] = 1;
            this.techLevels[catId]++;
            
            this.turnLogs.push(`tech|📚 Upgraded ${TechCategories[catId].name} to Level ${this.techLevels[catId]}!`);
            return true;
        }
        return false;
    }

    startTechProject(techId) {
        if (this.techProject) return false; 
        const tech = TechRegistry[techId];
        
        if (tech.req) {
            for (const [catId, reqLvl] of Object.entries(tech.req)) {
                const myLvl = this.techLevels[catId] || 0;
                if (myLvl < reqLvl) return false;
            }
        }

        if (this.inventory.science < tech.cost) return false; 
        this.inventory.science -= tech.cost;

        this.techProject = { 
            id: techId, 
            progress: tech.effort,
            max: tech.effort 
        };
        this.turnLogs.push(`tech|🎓 Started incorporating ${tech.name}`);
        return true;
    }
    
    advanceTech() {
        if (!this.techProject) return;
        const innovators = this.assignments['innovator'] || 0;
        if (innovators > 0) {
            const progress = innovators * 1; 
            this.techProject.progress -= progress;
            this.turnLogs.push(`tech|⚙️ Incorporating ${TechRegistry[this.techProject.id].name} (${this.techProject.progress} effort left)`);
            if (this.techProject.progress <= 0) this.completeTech();
        } else {
            this.turnLogs.push(`warning|⚠️ ${TechRegistry[this.techProject.id].name} incorporation stalled (Need Innovators)`);
        }
    }

    completeTech() {
        const techId = this.techProject.id;
        this.knownTechs.push(techId);
        this.turnLogs.push(`tech|💡 Tech Unlocked: ${TechRegistry[techId].name}!`);
        this.techProject = null;
    }

    // =========================================================
    //  RECRUITMENT & CONSTRUCTION
    // =========================================================

    startUnitProject(unitId) {
        if (this.unitProject) return false;
        const blueprint = UnitRegistry[unitId];
        if (this.inventory.food < blueprint.cost.food) return false;
        if (this.inventory.materials < blueprint.cost.materials) return false;

        this.inventory.food -= blueprint.cost.food;
        this.inventory.materials -= blueprint.cost.materials;

        this.unitProject = {
            id: unitId,
            progress: blueprint.trainTime,
            max: blueprint.trainTime
        };
        this.turnLogs.push(`unit|⚔️ Started recruiting ${blueprint.name}`);
        return true;
    }

    advanceRecruitment() {
        if (!this.unitProject) return;
        const trainers = this.assignments['trainer'] || 0;
        if (trainers > 0) {
            this.unitProject.progress -= trainers;
            this.turnLogs.push(`unit|⚔️ Training ${UnitRegistry[this.unitProject.id].name} (${this.unitProject.progress} work left)`);
            if (this.unitProject.progress <= 0) this.completeUnit();
        } else {
            this.turnLogs.push(`warning|⚠️ Training stalled (No Trainers assigned)`);
        }
    }

    completeUnit() {
        const blueprint = UnitRegistry[this.unitProject.id];
        if (this.population <= blueprint.popCost) {
            this.turnLogs.push(`warning|⚠️ Cannot finish ${blueprint.name}: Population too low!`);
            return; 
        }
        this.population -= blueprint.popCost;
        this.rebalanceJobs();

        if (!State.units) State.units = [];
        State.units.push({
            type: this.unitProject.id,
            location: { q: this.location.q, r: this.location.r },
            moves: blueprint.stats.move,
            maxMoves: blueprint.stats.move,
            vision: blueprint.stats.vision || 1,
            hp: blueprint.stats.hp || 10,
            maxHp: blueprint.stats.hp || 10,
            inventory: { 
                food: blueprint.stats.initialFood || 5, 
                materials: blueprint.stats.initialMats || 0 
            }
        });
        this.turnLogs.push(`unit|🎉 Unit Ready: ${blueprint.name} joined the empire!`);
        this.unitProject = null;
    }
    
    startConstruction(buildingId) {
        const blueprint = BuildingRegistry[buildingId];
        if (!blueprint) return false;
        
        const unlockingTech = Object.values(TechRegistry).find(t => t.unlocks.includes(blueprint.id));
        if (unlockingTech && !this.knownTechs.includes(unlockingTech.id)) return false;

        if (this.inventory.materials < blueprint.cost.materials) return false;
        if (blueprint.upgradeFrom && !this.buildings.includes(blueprint.upgradeFrom)) return false;
        if (this.currentProject) return false;

        this.inventory.materials -= blueprint.cost.materials;
        this.currentProject = {
            id: buildingId,
            progress: blueprint.buildTime,
            name: blueprint.name
        };
        return true;
    }

    advanceConstruction() {
        if (!this.currentProject) return;
        this.currentProject.progress -= 1;
        if (this.currentProject.progress <= 0) {
            this.completeConstruction();
        } else {
            this.turnLogs.push(`build|🔨 Working on ${this.currentProject.name} (${this.currentProject.progress} turns left)`);
        }
    }
    
    completeConstruction() {
        if (!this.currentProject) return;
        const finishedId = this.currentProject.id;
        const blueprint = BuildingRegistry[finishedId];
        if (blueprint.upgradeFrom) {
            const index = this.buildings.indexOf(blueprint.upgradeFrom);
            if (index !== -1) this.buildings.splice(index, 1);
        }
        this.buildings.push(finishedId);
        this.turnLogs.push(`build|✅ Construction complete: ${blueprint.name}`);
        this.currentProject = null; 
    }

    // =========================================================
    //  GROWTH & JOBS
    // =========================================================

    getHousingCap() {
        let cap = 2; 
        this.buildings.forEach(bId => {
            const blueprint = BuildingRegistry[bId];
            if (blueprint && blueprint.effects.housing) cap += blueprint.effects.housing;
        });
        return cap;
    }

    handleGrowth() {
        if (this.population >= this.getHousingCap()) {
            this.consumeFood(false); 
            return; 
        }
        const surplus = this.consumeFood(true); 
        if (surplus) {
            this.growthBucket += 1;
            
            this.turnLogs.push(`growth|📈 Population growing (${this.growthBucket}/${this.growthThreshold})`);

            if (this.growthBucket >= this.growthThreshold) {
                this.population++;
                this.growthBucket = 0;
                this.growthThreshold = Math.floor(this.growthThreshold * 1.2); 
                this.turnLogs.push(`growth|🎉 A new citizen was born! Pop is now ${this.population}`);
            }
        }
    }

    consumeFood(allowSurplus) {
        const foodNeed = this.population;
        let growthCost = 0;
        if (allowSurplus && this.inventory.food >= foodNeed + 1) {
            growthCost = 1;
        }

        const totalToEat = foodNeed + growthCost;

        if (this.inventory.food >= totalToEat) {
            this.inventory.food -= totalToEat;
            
            if (growthCost > 0) {
                this.turnLogs.push(`consumption|🍽️ Consumed ${totalToEat} Food (${foodNeed} eaten, ${growthCost} growth)`);
                return true;
            } else {
                this.turnLogs.push(`consumption|🍽️ Consumed ${totalToEat} Food (Maintenance)`);
            }
        } else {
            const eaten = this.inventory.food;
            this.inventory.food = 0;
            this.turnLogs.push(`warning|⚠️ STARVATION: Population needed ${foodNeed} but only ate ${eaten}`);
        }
        return false;
    }

    assignJob(jobId, delta) {
        const current = this.assignments[jobId] || 0;
        const cap = this.jobCap[jobId] || 0;
        const totalAssigned = this.getTotalAssigned();
        const idle = this.population - totalAssigned;

        if (delta > 0) {
            if (idle <= 0) return false; 
            if (current >= cap) return false; 
            this.assignments[jobId] = current + 1;
        } else {
            if (current <= 0) return false;
            this.assignments[jobId] = current - 1;
        }
        return true;
    }

    getTotalAssigned() {
        return Object.values(this.assignments).reduce((a, b) => a + b, 0);
    }

    rebalanceJobs() {
        let totalAssigned = this.getTotalAssigned();
        while (totalAssigned > this.population) {
            let worstJobId = null;
            let minPriority = 9999;
            Object.entries(this.assignments).forEach(([jobId, count]) => {
                if (count > 0) {
                    const job = JobRegistry[jobId];
                    const prio = job ? job.priority : 0; 
                    if (prio < minPriority) {
                        minPriority = prio;
                        worstJobId = jobId;
                    }
                }
            });
            if (worstJobId) {
                this.assignments[worstJobId]--;
                this.turnLogs.push(`warning|📉 Lost a ${JobRegistry[worstJobId].name} (Population dropped)`);
                totalAssigned--;
            } else {
                break;
            }
        }
    }

    // =========================================================
    //  PLANNED EVENTS (Preview for Activity Log)
    // =========================================================

    getPlannedEvents() {
        let events = [];
        let projectedFoodIn = 0; 
        
        // 1. CALCULATE PRODUCTION FIRST
        let prodStrings = [];
        Object.entries(this.assignments).forEach(([jobId, count]) => {
            if (count > 0) {
                const job = JobRegistry[jobId];
                if (job) {
                    let yields = [];
                    if (job.yield.food) {
                        const amt = job.yield.food * count;
                        yields.push(`${amt} Food`);
                        projectedFoodIn += amt;
                    }
                    if (job.yield.materials) yields.push(`${job.yield.materials * count} Mats`);
                    if (job.yield.science) yields.push(`${job.yield.science * count} Sci`);
                    
                    if (yields.length > 0) {
                        prodStrings.push(`production|${job.icon} ${count} ${job.name}s: +${yields.join(', +')}`);
                    }
                }
            }
        });

        // 2. CALCULATE CONSUMPTION
        const foodNeed = this.population;
        const currentStock = this.inventory.food;
        const totalAvailable = currentStock + projectedFoodIn;
        const housingCap = this.getHousingCap();
        
        let projectedGrowthCost = 0;
        let projectedOut = foodNeed;
        
        if (totalAvailable >= foodNeed + 1 && this.population < housingCap) {
            projectedGrowthCost = 1;
            projectedOut += 1;
        }

        const netChange = projectedFoodIn - projectedOut;
        const sign = netChange >= 0 ? "+" : "";

        // 3. ADD SUMMARY LINES
        events.push(`info|📊 NET FOOD: ${sign}${netChange} (In: ${projectedFoodIn}, Out: ${projectedOut})`);
        
        if (projectedGrowthCost > 0) {
            events.push(`consumption|🍽️ Anticipated: ${projectedOut} Food (${foodNeed} eat, ${projectedGrowthCost} growth)`);
        } else if (totalAvailable < foodNeed) {
            events.push(`warning|⚠️ WARNING: Starvation Imminent! (Short by ${foodNeed - totalAvailable})`);
        } else {
            events.push(`consumption|🍽️ Anticipated: ${projectedOut} Food (Maintenance)`);
        }

        // 4. ADD PRODUCTION DETAILS
        prodStrings.forEach(s => events.push(s));

        // 5. PROJECTS
        if (this.techProject) {
            const innovators = this.assignments['innovator'] || 0;
            if (innovators > 0) events.push(`tech|⚙️ Tech: ${TechRegistry[this.techProject.id].name} (+${innovators} prog)`);
            else events.push(`warning|⚠️ Tech: ${TechRegistry[this.techProject.id].name} (Stalled)`);
        }
        if (this.unitProject) {
            const trainers = this.assignments['trainer'] || 0;
            if (trainers > 0) events.push(`unit|⚔️ Unit: ${UnitRegistry[this.unitProject.id].name} (+${trainers} prog)`);
            else events.push(`warning|⚠️ Unit: ${UnitRegistry[this.unitProject.id].name} (Stalled)`);
        }
        if (this.currentProject) {
            events.push(`build|🔨 Building: ${this.currentProject.name} (1 turn closer)`);
        }
        
        return events;
    }
}
