import { ServerConnection } from './core/serverConnection.js';
import { GameEngine } from './core/gameEngine.js';
import { DevTools } from './view/devtools.js';
import { MapLegend } from './view/mapLegend.js';
import { UI } from './view/ui.js'; // <--- NEW IMPORT

const screens = {
    menu: document.getElementById('screen-menu'),
    game: document.getElementById('screen-game')
};

const modals = {
    newWorld: document.getElementById('modal-new-world'),
    loadWorld: document.getElementById('modal-load-world')
};

// --- Initialization ---
initMenu();

// We must make this async to wait for the server response
async function initMenu() {
    showScreen('menu');
    
    const btnContinue = document.getElementById('btn-continue');
    btnContinue.innerText = "Connecting...";
    btnContinue.disabled = true;

    // Fetch real file list
    const worlds = await ServerConnection.getWorldList();
    
    if (worlds.length === 0) {
        btnContinue.disabled = true;
        btnContinue.innerText = "No Saves Found";
    } else {
        btnContinue.disabled = false;
        btnContinue.innerText = "Continue";
    }
}

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[name].classList.remove('hidden');
}

// --- Event Listeners ---

// 1. New Game Flow
document.getElementById('btn-new-game').addEventListener('click', () => {
    modals.newWorld.classList.remove('hidden');
    document.getElementById('input-world-name').value = '';
    document.getElementById('error-new-world').innerText = '';
});

document.getElementById('btn-create-confirm').addEventListener('click', async () => {
    const name = document.getElementById('input-world-name').value.trim();
    if (!name) return;

    try {
        // Async Create
        const worldData = await ServerConnection.createWorld(name);
        launchGame(worldData);
    } catch (err) {
        document.getElementById('error-new-world').innerText = err.message;
    }
});

// 2. Continue Flow
document.getElementById('btn-continue').addEventListener('click', async () => {
    modals.loadWorld.classList.remove('hidden');
    const list = document.getElementById('select-world-list');
    list.innerHTML = 'Loading...';
    
    const worlds = await ServerConnection.getWorldList();
    list.innerHTML = '';

    worlds.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.innerText = name;
        list.appendChild(opt);
    });
});

document.getElementById('btn-load-confirm').addEventListener('click', async () => {
    const name = document.getElementById('select-world-list').value;
    if (!name) return;
    
    // 1. Load the raw data (which is missing the name property)
    const worldData = await ServerConnection.loadWorld(name);
    
    // 2. THE FIX: Manually re-attach the name from the file selection
    worldData.name = name; 
    
    console.log(`[System] Loaded World: ${name}`); 
    launchGame(worldData);
});

// 3. Cancel Buttons
document.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
        Object.values(modals).forEach(m => m.classList.add('hidden'));
    });
});

// --- Game Launcher ---
function launchGame(worldData) {
    Object.values(modals).forEach(m => m.classList.add('hidden'));
    showScreen('game');

    // 2. Initialize UI Components
    DevTools.init(); 
    MapLegend.init();
    
    // THE CRITICAL FIX: Initialize UI Hover Listeners for Pathfinding
    UI.initInputListeners(); // <--- ADDED

    GameEngine.start(
        worldData,
        // Async Save Callback
        async (payload) => {
            await ServerConnection.saveWorldPayload(worldData.name, payload);
        },
        // Quit Callback
        () => {
            location.reload(); 
        }
    );
}