// Game Variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'menu'; // menu, playing, gameOver, location
let gameOver = false;

// Locations
const locations = {
    hub: { x: 400, y: 300, name: 'HUB', color: '#ffff00', type: 'hub' },
    blackMarket: { x: 100, y: 100, name: 'BLACK MARKET', color: '#ff00ff', type: 'shop' },
    docks: { x: 700, y: 100, name: 'DOCKS', color: '#0099ff', type: 'afk' },
    suburbs: { x: 100, y: 500, name: 'SUBURBS', color: '#00ff99', type: 'lowrisk' },
    underground: { x: 700, y: 500, name: 'UNDERGROUND ORCHARD', color: '#ff6600', type: 'grow' }
};

let currentLocation = 'hub';
let inLocation = false;

// Player
const player = {
    x: 400,
    y: 300,
    width: 30,
    height: 40,
    speed: 3,
    vx: 0,
    vy: 0
};

// Game Stats
let money = 0;
let lemons = 0;
let heat = 0;
let maxHeat = 100;
let harvestTimer = 0; // For docks passive income
let growTimer = 0; // For underground orchard

// Upgrades
let upgrades = {
    sellingPrice: 1.0, // Multiplier
    sellingSpeed: 1.0,
    lemonCapacity: 20,
    heatResistance: 1.0, // Lower is better
    purchased: []
};

// Shop items
const shopItems = [
    { id: 'priceBoost', name: 'Better Sales Pitch', cost: 50, effect: 'Increases selling price by 25%' },
    { id: 'fastSell', name: 'Speed Boost', cost: 75, effect: 'Sell faster' },
    { id: 'capacity', name: 'Bigger Backpack', cost: 40, effect: 'Hold 30 lemons' },
    { id: 'heatShield', name: 'Police Scanner', cost: 100, effect: 'Reduces heat buildup' }
];

// Keys
const keys = {};

// Customers
let customers = [];
let customerSpawnTimer = 0;

// Police
let policePatrols = [];
let policeSpawnTimer = 0;

// Projectiles
let bullets = [];

// Location UI vars
let inShop = false;
let shopMessage = '';
let policeIntel = '';
let intelTimer = 0;

// ==================== EVENT LISTENERS ====================
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key === ' ' && gameState === 'playing' && !inLocation) {
        e.preventDefault();
        sellLemon();
    }
    
    if (e.key === 'Escape') {
        if (inLocation) {
            exitLocation();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

canvas.addEventListener('click', (e) => {
    if (gameState === 'menu') {
        startGame();
    } else if (gameState === 'playing' && !inLocation) {
        // Check if clicked on a location
        const rect = canvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        for (let [locKey, loc] of Object.entries(locations)) {
            const dist = Math.sqrt((clickX - loc.x) ** 2 + (clickY - loc.y) ** 2);
            if (dist < 40) {
                enterLocation(locKey);
            }
        }
    } else if (inLocation && inShop) {
        // Handle shop item clicks
        const rect = canvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
        
        shopItems.forEach((item, idx) => {
            const itemY = 120 + idx * 60;
            if (clickX > 50 && clickX < 350 && clickY > itemY && clickY < itemY + 50) {
                purchaseUpgrade(item);
            }
        });
    }
});

// ==================== GAME FUNCTIONS ====================
function startGame() {
    gameState = 'playing';
    gameOver = false;
    money = 0;
    lemons = 0;
    heat = 0;
    harvestTimer = 0;
    currentLocation = 'hub';
    inLocation = false;
    policePatrols = [];
    customers = [];
    bullets = [];
    
    upgrades = {
        sellingPrice: 1.0,
        sellingSpeed: 1.0,
        lemonCapacity: 20,
        heatResistance: 1.0,
        purchased: []
    };
    
    player.x = locations.hub.x;
    player.y = locations.hub.y;
    
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    document.getElementById('gameMessage').textContent = 'Travel to locations to grow your empire!';
    
    gameLoop();
}

function enterLocation(locKey) {
    currentLocation = locKey;
    inLocation = true;
    inShop = false;
    shopMessage = '';
    policeIntel = '';
    const loc = locations[locKey];
    
    if (loc.type === 'shop') {
        inShop = true;
    }
}

function exitLocation() {
    inLocation = false;
    inShop = false;
    shopMessage = '';
    player.x = locations.hub.x;
    player.y = locations.hub.y;
    currentLocation = 'hub';
}

function purchaseUpgrade(item) {
    if (money >= item.cost && !upgrades.purchased.includes(item.id)) {
        money -= item.cost;
        upgrades.purchased.push(item.id);
        
        switch(item.id) {
            case 'priceBoost':
                upgrades.sellingPrice *= 1.25;
                break;
            case 'fastSell':
                upgrades.sellingSpeed *= 1.5;
                break;
            case 'capacity':
                upgrades.lemonCapacity = 30;
                break;
            case 'heatShield':
                upgrades.heatResistance = 0.6;
                break;
        }
        
        shopMessage = `Purchased ${item.name}!`;
        setTimeout(() => { shopMessage = ''; }, 2000);
    }
}

function sellLemon() {
    if (lemons > 0 && !inLocation) {
        lemons--;
        const baseProfit = Math.floor(Math.random() * 8) + 5;
        const profit = Math.floor(baseProfit * upgrades.sellingPrice);
        money += profit;
        heat += (Math.random() * 15 + 5) * upgrades.heatResistance;
        
        // Create lemon particles
        for (let i = 0; i < 5; i++) {
            bullets.push({
                x: player.x,
                y: player.y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 30
            });
        }
        
        if (heat > maxHeat) {
            heat = maxHeat;
        }
    }
}

function updatePlayer() {
    if (inLocation) return; // Don't move in location
    
    player.vx = 0;
    player.vy = 0;
    
    if (keys['w'] || keys['arrowup']) player.vy = -player.speed;
    if (keys['s'] || keys['arrowdown']) player.vy = player.speed;
    if (keys['a'] || keys['arrowleft']) player.vx = -player.speed;
    if (keys['d'] || keys['arrowright']) player.vx = player.speed;
    
    player.x += player.vx;
    player.y += player.vy;
    
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

function updateCustomers() {
    if (inLocation || currentLocation !== 'hub') return;
    
    customerSpawnTimer--;
    if (customerSpawnTimer <= 0) {
        spawnCustomer();
        customerSpawnTimer = 60 + Math.random() * 60;
    }
    
    for (let i = customers.length - 1; i >= 0; i--) {
        const c = customers[i];
        
        const dx = player.x - c.x;
        const dy = player.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
            c.x += (dx / dist) * c.speed;
            c.y += (dy / dist) * c.speed;
        }
        
        if (dist < 40) {
            customers.splice(i, 1);
            if (lemons > 0) {
                lemons--;
                money += Math.floor(Math.random() * 15) + 10;
                heat += (Math.random() * 20 + 10) * upgrades.heatResistance;
            }
        }
    }
}

function spawnCustomer() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0: x = Math.random() * canvas.width; y = -20; break;
        case 1: x = canvas.width + 20; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + 20; break;
        case 3: x = -20; y = Math.random() * canvas.height; break;
    }
    
    customers.push({
        x: x,
        y: y,
        width: 25,
        height: 30,
        speed: 2 + Math.random() * 1.5
    });
}

function updatePolice() {
    if (inLocation) {
        // Police in location areas
        policeSpawnTimer--;
        if (policeSpawnTimer <= 0 && policePatrols.length < 2) {
            spawnPolicePatrol();
            policeSpawnTimer = 300 + Math.random() * 200;
        }
    } else if (heat >= 50 && currentLocation === 'hub') {
        // Police at hub when heat is high
        policeSpawnTimer--;
        if (policeSpawnTimer <= 0 && policePatrols.length < Math.floor(heat / 30)) {
            spawnPolicePatrol();
            policeSpawnTimer = 150 + Math.random() * 150;
        }
    }
    
    for (let i = policePatrols.length - 1; i >= 0; i--) {
        const p = policePatrols[i];
        
        const dx = player.x - p.x;
        const dy = player.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        p.patrolTimer--;
        if (p.patrolTimer <= 0) {
            p.targetX = Math.random() * canvas.width;
            p.targetY = Math.random() * canvas.height;
            p.patrolTimer = 200;
        }
        
        const pdx = p.targetX - p.x;
        const pdy = p.targetY - p.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        
        if (pdist > 5) {
            p.x += (pdx / pdist) * p.speed;
            p.y += (pdy / pdist) * p.speed;
        }
        
        if (dist < 50) {
            endGame('CAUGHT BY POLICE!');
        }
        
        // Remove if off screen
        if (p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) {
            policePatrols.splice(i, 1);
        }
    }
}

function spawnPolicePatrol() {
    policePatrols.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        width: 40,
        height: 50,
        speed: 1.5 + (heat / maxHeat) * 2,
        targetX: Math.random() * canvas.width,
        targetY: Math.random() * canvas.height,
        patrolTimer: 200
    });
}

function updateLocationEvents() {
    if (!inLocation) return;
    
    const loc = locations[currentLocation];
    
    if (loc.type === 'afk') {
        // Docks - passive income
        harvestTimer++;
        if (harvestTimer > 120) {
            lemons += 2;
            money += 5;
            if (lemons > upgrades.lemonCapacity) {
                lemons = upgrades.lemonCapacity;
            }
            harvestTimer = 0;
        }
    } else if (loc.type === 'grow') {
        // Underground Orchard - grow lemons
        growTimer++;
        if (growTimer > 180) {
            lemons += 5;
            if (lemons > upgrades.lemonCapacity) {
                lemons = upgrades.lemonCapacity;
            }
            growTimer = 0;
        }
    } else if (loc.type === 'lowrisk') {
        // Suburbs - lower risk, lower reward
        if (lemons > 0 && Math.random() < 0.02) {
            lemons--;
            money += Math.floor(Math.random() * 4) + 3;
            heat += (Math.random() * 5 + 1);
        }
    } else if (loc.type === 'shop') {
        // Black market - give police intel
        if (intelTimer <= 0) {
            const nextLocation = Object.keys(locations)[Math.floor(Math.random() * Object.keys(locations).length)];
            policeIntel = `🕵️ Intel: Police heading to ${locations[nextLocation].name}!`;
            intelTimer = 180;
        }
        intelTimer--;
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;
        
        if (b.life <= 0) {
            bullets.splice(i, 1);
        }
    }
}

function updateHeat() {
    if (lemons === 0 || money > 100) {
        heat -= 0.3;
    }
    heat = Math.max(0, heat);
}

function update() {
    if (gameState !== 'playing') return;
    
    updatePlayer();
    updateCustomers();
    updatePolice();
    updateBullets();
    updateLocationEvents();
    updateHeat();
    
    // Update UI
    document.getElementById('money').textContent = money;
    document.getElementById('lemons').textContent = lemons;
    document.getElementById('heat').textContent = Math.floor(heat);
    document.getElementById('policeDistance').textContent = policePatrols.length > 0 ? `${policePatrols.length} Patrols` : 'Clear';
}

function drawWorldMap() {
    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Draw location connections
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 2;
    const locArray = Object.values(locations);
    for (let i = 0; i < locArray.length; i++) {
        for (let j = i + 1; j < locArray.length; j++) {
            ctx.beginPath();
            ctx.moveTo(locArray[i].x, locArray[i].y);
            ctx.lineTo(locArray[j].x, locArray[j].y);
            ctx.stroke();
        }
    }
    
    // Draw locations
    for (let [key, loc] of Object.entries(locations)) {
        ctx.fillStyle = loc.color;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(loc.x - 35, loc.y - 35, 70, 70);
        ctx.globalAlpha = 1;
        
        ctx.strokeStyle = loc.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(loc.x - 35, loc.y - 35, 70, 70);
        
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(loc.name, loc.x, loc.y);
    }
    
    // Draw customers
    ctx.fillStyle = '#00ff00';
    for (let c of customers) {
        ctx.fillRect(c.x - c.width/2, c.y - c.height/2, c.width, c.height);
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', c.x, c.y);
        ctx.fillStyle = '#00ff00';
    }
    
    // Draw police patrols
    for (let p of policePatrols) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(p.x - p.width/2, p.y - p.height/2, p.width, p.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👮', p.x, p.y);
    }
    
    // Draw player
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(player.x - player.width/2, player.y - player.height/2, player.width, player.height);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍋', player.x, player.y);
    
    // Draw lemon particles
    ctx.fillStyle = '#ffff00';
    for (let b of bullets) {
        ctx.globalAlpha = b.life / 30;
        ctx.fillRect(b.x - 5, b.y - 5, 10, 10);
    }
    ctx.globalAlpha = 1;
    
    // Heat bar
    ctx.fillStyle = '#444444';
    ctx.fillRect(10, 10, 200, 20);
    const heatColor = heat < 50 ? '#00ff00' : heat < 80 ? '#ffff00' : '#ff0000';
    ctx.fillStyle = heatColor;
    ctx.fillRect(10, 10, (heat / maxHeat) * 200, 20);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 200, 20);
    
    // Instructions
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('WASD to move | Click location to enter', 10, 40);
    ctx.fillText('SPACE to sell | ESC to exit location', 10, 55);
}

function drawLocation() {
    const loc = locations[currentLocation];
    
    // Background
    ctx.fillStyle = loc.color;
    ctx.globalAlpha = 0.2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    
    // Title
    ctx.fillStyle = loc.color;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(loc.name, canvas.width / 2, 50);
    
    if (inShop) {
        drawBlackMarket();
    } else if (loc.type === 'afk') {
        drawDocks();
    } else if (loc.type === 'grow') {
        drawOrchard();
    } else if (loc.type === 'lowrisk') {
        drawSuburbs();
    }
    
    // Back button
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(20, canvas.height - 60, 100, 40);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ESC to Exit', 70, canvas.height - 40);
    
    // Police patrols in location
    for (let p of policePatrols) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(p.x - p.width/2, p.y - p.height/2, p.width, p.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👮', p.x, p.y);
    }
    
    // Player
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(player.x - player.width/2, player.y - player.height/2, player.width, player.height);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍋', player.x, player.y);
}

function drawBlackMarket() {
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('🛍️ UPGRADE SHOP', 50, 100);
    
    shopItems.forEach((item, idx) => {
        const y = 120 + idx * 60;
        const purchased = upgrades.purchased.includes(item.id);
        
        ctx.fillStyle = purchased ? '#888888' : '#00ff00';
        ctx.fillRect(50, y, 300, 50);
        
        ctx.fillStyle = '#000';
        ctx.font = purchased ? 'italic 12px Arial' : 'bold 12px Arial';
        ctx.fillText(item.name, 60, y + 15);
        ctx.font = '10px Arial';
        ctx.fillText(item.effect, 60, y + 30);
        ctx.fillText(purchased ? 'OWNED' : `$${item.cost}`, 320, y + 25);
    });
    
    if (shopMessage) {
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(shopMessage, canvas.width / 2, 400);
    }
    
    if (policeIntel) {
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(policeIntel, canvas.width / 2, 450);
    }
}

function drawDocks() {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚓ DOCKS - AFK HARVESTING ⚓', canvas.width / 2, 120);
    ctx.font = '14px Arial';
    ctx.fillText('Workers collect lemons while you relax', canvas.width / 2, 160);
    ctx.fillText('+2 Lemons every 2 seconds', canvas.width / 2, 200);
    ctx.fillText('+$5 every 2 seconds', canvas.width / 2, 240);
    ctx.font = 'bold 16px Arial';
    ctx.fillText('⚠️ Police patrol here occasionally', canvas.width / 2, 300);
}

function drawOrchard() {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🌿 UNDERGROUND ORCHARD 🌿', canvas.width / 2, 120);
    ctx.font = '14px Arial';
    ctx.fillText('Grow your own illegal fruits', canvas.width / 2, 160);
    ctx.fillText('+5 Lemons every 3 seconds', canvas.width / 2, 200);
    ctx.fillText('Low risk, requires patience', canvas.width / 2, 240);
    ctx.font = 'bold 16px Arial';
    ctx.fillText('🌱 Progress: ' + Math.floor(growTimer / 180 * 100) + '%', canvas.width / 2, 300);
}

function drawSuburbs() {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏘️ SUBURBS - LOW RISK 🏘️', canvas.width / 2, 120);
    ctx.font = '14px Arial';
    ctx.fillText('Wealthy neighborhoods, cautious customers', canvas.width / 2, 160);
    ctx.fillText('Small profits, very low heat', canvas.width / 2, 200);
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Customers come to you!', canvas.width / 2, 300);
}

function draw() {
    if (inLocation) {
        drawLocation();
    } else {
        drawWorldMap();
    }
}

function endGame(reason) {
    gameState = 'gameOver';
    document.getElementById('restartBtn').style.display = 'block';
    document.getElementById('gameMessage').textContent = `${reason}\nFinal Money: $${money}\nFinal Heat: ${Math.floor(heat)}%`;
}

function gameLoop() {
    update();
    draw();
    
    if (gameState === 'playing') {
        requestAnimationFrame(gameLoop);
    }
}

// Initial draw
draw();
