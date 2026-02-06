export const TechCategories = {
    "survival": {
        id: "survival",
        name: "Survival Skills",
        description: "Foraging, hunting, and basic shelter.",
        baseCost: 100, 
        costMultiplier: 1.5
    },
    "construction": {
        id: "construction",
        name: "Masonry & Engineering",
        baseCost: 150,
        costMultiplier: 1.5
    },
    "agriculture": {
        id: "agriculture",
        name: "Farming & Cultivation",
        baseCost: 150,
        costMultiplier: 1.5
    },
    "husbandry": {
        id: "husbandry",
        name: "Animal Husbandry",
        baseCost: 150,
        costMultiplier: 1.5
    }
    // FUTURE: Add "metallurgy", "seafaring", etc. here.
    // The engine will automatically pick them up.
};