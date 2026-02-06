export const TechRegistry = {
    // --- TIER 0 (Starting Techs) ---
    "tools_stone": {
        id: "tools_stone",
        name: "Stone Tools",
        cost: 50,    // Science Cost
        effort: 50,  // Innovation Effort (Turns x Innovators)
        req: { survival: 1 }, // Requires Survival Level 1
        unlocks: ["gatherer_hut"],
        description: "Basic stone implements for gathering."
    },

    // --- TIER 1 ---
    "agriculture_basic": {
        id: "agriculture_basic",
        name: "Basic Agriculture",
        cost: 100,
        effort: 100,
        req: { survival: 2, agriculture: 1 }, // Hybrid Requirement
        unlocks: ["farm_plot"],
        description: "The seeds of civilization."
    },
    "masonry": {
        id: "masonry",
        name: "Masonry",
        cost: 150,
        effort: 120,
        req: { construction: 2 },
        unlocks: ["hut_clay", "storage_pit"], // Unlocks your new Clay Hut asset!
        description: "Building with clay and stone."
    },
    "animal_husbandry": {
        id: "animal_husbandry",
        name: "Domestication",
        cost: 150,
        effort: 120,
        req: { husbandry: 1, survival: 2 },
        unlocks: ["pasture"],
        description: "Taming wild beasts."
    },

    // --- TIER 2 ---
    "pottery": {
        id: "pottery",
        name: "Pottery",
        cost: 300,
        effort: 200,
        req: { construction: 3, agriculture: 2 }, // Synergy!
        unlocks: ["granary"],
        description: "Vessels for storage and cooking."
    }
};