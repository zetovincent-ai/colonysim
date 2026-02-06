export const BuildingRegistry = {
    "tent": {
        id: "tent",
        name: "Tent",
        category: "housing",
        tier: 1,
        description: "Basic shelter. (+2 Pop Cap)",
        cost: { materials: 10 },
        buildTime: 2, 
        effects: { housing: 2 },
        upgradeFrom: null // Base level
    },
    "hut": {
        id: "hut",
        name: "Wooden Hut",
        category: "housing",
        tier: 2,
        description: "Sturdy dwelling. Replaces Tent. (+5 Pop Cap)",
        cost: { materials: 40 }, // Cost of the upgrade itself
        buildTime: 4,
        effects: { housing: 5 },
        upgradeFrom: "tent" // <--- REQUIRES a tent to exist
    }
};