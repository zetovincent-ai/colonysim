export const UnitRegistry = {
    "explorer": {
        id: "explorer",
        name: "Explorer",
        description: "Fast scout unit. Reveals the map.",
        cost: { food: 10, materials: 0 },
        popCost: 1,      
        trainTime: 2,    
        stats: { 
            move: 2, 
            vision: 2, 
            hp: 10,
            consumption: 1,  
            carryCap: 20,    
            initialFood: 10,
            forageCap: 1   
        }
    },
    "settler": {
        id: "settler",
        name: "Settler",
        description: "Found a new settlement. Consumes 5 Pop.",
        cost: { food: 50, materials: 50 },
        popCost: 5,
        trainTime: 5,
        stats: { 
            move: 1, 
            vision: 1, 
            hp: 10,
            consumption: 5, 
            carryCap: 100,   
            initialFood: 50, 
            initialMats: 50, 
            forageCap: 5    
        }
    }
};