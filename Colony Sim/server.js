const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 8080;

// --- CONFIGURATION: Your Local Save Locations ---
const SERVER_SAVES_DIR = path.join(__dirname, 'saves');

// Ensure save directory exists
if (!fs.existsSync(SERVER_SAVES_DIR)) {
    fs.mkdirSync(SERVER_SAVES_DIR);
    console.log(`[System] Created save directory at: ${SERVER_SAVES_DIR}`);
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Allow big save files
app.use(express.static(__dirname)); // Serve the game files (index.html, etc.)

// --- API ROUTES ---

// 1. GET List of Worlds
app.get('/api/worlds', (req, res) => {
    fs.readdir(SERVER_SAVES_DIR, (err, files) => {
        if (err) return res.status(500).json({ error: "Failed to read saves dir" });
        // Filter only .json files and remove extension
        const worlds = files
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace('.json', ''));
        res.json(worlds);
    });
});

// 2. POST (Create/Save) World
app.post('/api/world/:name', (req, res) => {
    const worldName = req.params.name;
    const filePath = path.join(SERVER_SAVES_DIR, `${worldName}.json`);
    
    // Write the JSON payload to disk
    fs.writeFile(filePath, JSON.stringify(req.body, null, 2), (err) => {
        if (err) {
            console.error("Save Error:", err);
            return res.status(500).json({ error: "Failed to write file" });
        }
        console.log(`[Server] Saved world: ${worldName}`);
        res.json({ success: true });
    });
});

// 3. GET (Load) World
app.get('/api/world/:name', (req, res) => {
    const worldName = req.params.name;
    const filePath = path.join(SERVER_SAVES_DIR, `${worldName}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Save file not found" });
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: "Failed to read file" });
        res.json(JSON.parse(data));
    });
});

// Start the Engine
app.listen(PORT, () => {
    console.log(`\n🌍 COLONY SIM SERVER RUNNING`);
    console.log(`👉 Local:   http://localhost:${PORT}`);
    console.log(`📂 Saves:   ${SERVER_SAVES_DIR}\n`);
});