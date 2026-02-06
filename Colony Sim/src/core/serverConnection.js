/**
 * Connects the Client to the Node.js Backend API.
 * Replaces LocalStorage with Real File System calls.
 */
export const ServerConnection = {
    
    // Fetch list of files from ./saves/
    async getWorldList() {
        try {
            const res = await fetch('/api/worlds');
            if (!res.ok) throw new Error("Server Error");
            return await res.json();
        } catch (e) {
            console.error("Connection Failed:", e);
            return [];
        }
    },

    // Check if world exists (by checking the list)
    async checkWorldExists(worldName) {
        const list = await this.getWorldList();
        return list.includes(worldName);
    },

    // Create New World (Just saves the initial template)
    async createWorld(worldName) {
        // Double check existence to be safe
        const exists = await this.checkWorldExists(worldName);
        if (exists) throw new Error("World already exists!");

        const initialData = {
            name: worldName,
            turn: 1,
            created: Date.now(),
            mapData: null,
            stateData: null
        };

        await this.saveWorldPayload(worldName, initialData);
        return initialData;
    },

    // Load JSON from ./saves/filename.json
    async loadWorld(worldName) {
        const res = await fetch(`/api/world/${worldName}`);
        if (!res.ok) throw new Error("Could not load save file.");
        return await res.json();
    },

    // Write JSON to ./saves/filename.json
    async saveWorldPayload(worldName, data) {
        const res = await fetch(`/api/world/${worldName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            console.log(`[Client] Uploaded save for: ${worldName}`);
        } else {
            console.error(`[Client] Save Failed for: ${worldName}`);
        }
    }
};