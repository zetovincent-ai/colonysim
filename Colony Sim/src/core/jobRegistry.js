export const JobRegistry = {
    // TIER 1: SURVIVAL (Highest Priority)
    "forager": {
        id: "forager",
        name: "Forager",
        priority: 100, // <--- Protects Food Supply
        yield: { food: 2 },
        reqTile: ["grassland", "plains", "forest"],
        icon: "🌾",
        desc: "Gathers food from land."
    },
    
    // TIER 2: PRODUCTION
    "woodcutter": {
        id: "woodcutter",
        name: "Woodcutter",
        priority: 80,
        yield: { materials: 2 },
        reqTile: ["forest"],
        icon: "🪓",
        desc: "Chops wood."
    },
    "gatherer": {
        id: "gatherer",
        name: "Stick Gatherer",
        priority: 70,
        yield: { materials: 1 }, 
        reqTile: ["grassland", "plains"],
        icon: "🍂",
        desc: "Scavenges branches."
    },
    
    // TIER 3: SPECIALIST (Lowest Priority - First to be fired)
    "trainer": {
        id: "trainer",
        name: "Trainer",
        priority: 50, // If we lose pop, stop training new units
        yield: { unitProgress: 1 }, 
        reqTile: [],
        icon: "⚔️",
        desc: "Trains new units."
    },
    "scholar": {
        id: "scholar",
        name: "Scholar",
        priority: 40,
        yield: { science: 1 }, 
        reqTile: [], 
        icon: "📜",
        desc: "Researches new ideas."
    },
    "innovator": {
        id: "innovator",
        name: "Innovator",
        priority: 40,
        yield: { techProgress: 1 }, 
        reqTile: [],
        icon: "⚙️",
        desc: "Incorporates new tech."
    }
};