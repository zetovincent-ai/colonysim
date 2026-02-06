/**
 * PlanningUI - Extracted from GameEngine
 * Owns all DOM rendering for the Planning Modal tabs:
 *   - City & Jobs (workforce sliders, building list)
 *   - Research (category upgrades, tech tree)
 *   - Recruit (unit training)
 *   - Unit Planning (settle action for tribe/settler)
 *
 * Communicates back to GameEngine via stored reference.
 */

import { State } from '../core/gameState.js';
import { Settlement } from '../core/settlement.js';
import { BuildingRegistry } from '../core/buildingRegistry.js';
import { JobRegistry } from '../core/jobRegistry.js';
import { TechRegistry } from '../core/techRegistry.js';
import { TechCategories } from '../core/techCategories.js';
import { UnitRegistry } from '../core/unitRegistry.js';
import { UI } from './ui.js';

export const PlanningUI = {
    engine: null,

    /**
     * Call once during GameEngine.start() to wire up the back-reference.
     * @param {object} engineRef - The GameEngine object
     */
    init(engineRef) {
        this.engine = engineRef;
    },

    // =========================================================
    //  MODAL ENTRY POINT
    // =========================================================

    updatePlanningModal() {
        const container = document.getElementById('planning-options');
        container.innerHTML = '';

        const contextTown = State.settlements.find(s => UI.currentContext === s);

        let activeTown = contextTown;
        if (!activeTown && State.settlements.length > 0) {
            activeTown = State.settlements[this.engine.planningTownIndex];
        }

        if (activeTown) {
            const showArrows = !contextTown;
            this.renderCityManager(container, activeTown, showArrows);
            return;
        }

        this.renderUnitPlanning(container);
    },

    // =========================================================
    //  UNIT / SETTLE PLANNING (Pre-settlement or Settler unit)
    // =========================================================

    renderUnitPlanning(container) {
        let canSettle = false;
        let settlerPos = null;

        if (this.engine.selectedUnitIndex === 'tribe') {
            canSettle = true;
            settlerPos = State.unitPos;
        } else if (this.engine.selectedUnitIndex !== null) {
            const u = State.units[this.engine.selectedUnitIndex];
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
            btnSettle.className = "primary settle-btn";

            btnSettle.onclick = () => {
                const newTown = new Settlement("New Outpost", settlerPos.q, settlerPos.r);

                if (this.engine.selectedUnitIndex === 'tribe') {
                    newTown.inventory.food += State.tribe.inventory.food;
                    newTown.inventory.materials += State.tribe.inventory.materials;
                    State.unitPos = null;
                } else {
                    State.units.splice(this.engine.selectedUnitIndex, 1);
                    this.engine.selectedUnitIndex = null;
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

    // =========================================================
    //  CITY MANAGER (Tabs: City & Jobs | Research | Recruit)
    // =========================================================

    renderCityManager(container, town, showArrows) {
        // --- Header with City Cycling Arrows ---
        const headerDiv = document.createElement('div');
        headerDiv.className = 'city-cycle-header';

        const btnPrev = document.createElement('button');
        btnPrev.innerText = "◀";
        btnPrev.className = 'cycle-btn';
        btnPrev.style.visibility = (showArrows && State.settlements.length > 1) ? 'visible' : 'hidden';
        btnPrev.onclick = () => {
            this.engine.planningTownIndex = (this.engine.planningTownIndex - 1 + State.settlements.length) % State.settlements.length;
            this.updatePlanningModal();
        };

        const title = document.createElement('span');
        title.className = 'city-manager-title';
        title.innerText = `Managing: ${town.name}`;

        const btnNext = document.createElement('button');
        btnNext.innerText = "▶";
        btnNext.className = 'cycle-btn';
        btnNext.style.visibility = (showArrows && State.settlements.length > 1) ? 'visible' : 'hidden';
        btnNext.onclick = () => {
            this.engine.planningTownIndex = (this.engine.planningTownIndex + 1) % State.settlements.length;
            this.updatePlanningModal();
        };

        headerDiv.appendChild(btnPrev);
        headerDiv.appendChild(title);
        headerDiv.appendChild(btnNext);
        container.appendChild(headerDiv);

        // --- Tab Bar ---
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

        // --- Tab Content ---
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

    // =========================================================
    //  TAB: City & Jobs
    // =========================================================

    renderCityTab(container, town) {
        // 1. WORKFORCE & POPULATION
        const totalPop = town.population;
        const assignedPop = town.getTotalAssigned();
        const idlePop = totalPop - assignedPop;
        const housingCap = town.getHousingCap();

        const popLabel = document.createElement('div');
        popLabel.className = 'workforce-label';
        popLabel.innerHTML = `<strong>Workforce:</strong> ${idlePop} Idle / ${totalPop} Total (Cap: ${housingCap})`;
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
                    if (town.assignJob(job.id, -1)) this.updatePlanningModal();
                };

                const countSpan = document.createElement('span');
                countSpan.className = 'job-count';
                countSpan.innerText = ` ${current} / ${displayCap} `;

                const btnPlus = document.createElement('button');
                btnPlus.innerText = "+";
                btnPlus.className = "small-btn";

                const capped = !isCityJob && current >= cap;
                btnPlus.disabled = (idlePop <= 0 || capped);

                btnPlus.onclick = () => {
                    if (town.assignJob(job.id, 1)) this.updatePlanningModal();
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

    // =========================================================
    //  TAB: Research
    // =========================================================

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
        catHeader.className = "tech-header";
        container.appendChild(catHeader);

        const catGrid = document.createElement('div');
        catGrid.className = "tech-grid";

        Object.values(TechCategories).forEach(cat => {
            const currentLvl = town.techLevels[cat.id] || 1;
            const cost = town.getCategoryCost(cat.id);
            const canAfford = town.inventory.science >= cost;

            const card = document.createElement('div');
            card.className = 'building-card tech-card';

            card.innerHTML = `
                <div class="tech-card-name">${cat.name} (Lv ${currentLvl})</div>
                <div class="tech-card-desc">${cat.description}</div>
                <div class="tech-card-footer">
                    <span class="text-info">${cost} Sci</span>
                </div>
            `;

            const btn = document.createElement('button');
            btn.className = "small-btn upgrade-btn";
            btn.innerText = "Upgrade";
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
        techHeader.className = "tech-header";
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
                <div class="tech-req-text">Req: ${reqText || "None"}</div>
                <span class="cost-display">🧪 ${tech.cost} Sci | ⚙️ ${tech.effort} Effort</span>
            `;

            const btn = document.createElement('button');
            btn.className = 'build-btn';

            if (locked) {
                btn.innerText = "Locked";
                btn.disabled = true;
                btn.classList.add('locked');
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

    // =========================================================
    //  TAB: Recruit
    // =========================================================

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

            info.innerHTML = `
                <h4>${unit.name}</h4>
                <span class="cost-display">🍞 ${unit.cost.food} Food | 🪵 ${unit.cost.materials || 0} Mats</span><br>
                <span class="text-warning recruit-pop-req">Req: ${unit.popCost} Pop</span>
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
    }
};
