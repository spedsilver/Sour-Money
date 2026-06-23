// Game Variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameState = 'menu'; // menu, playing, gameOver
let gameOver = false;

// Player
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 30,
    height: 40,
    speed: 5,
    vx: 0,
    vy: 0
};

// Game Stats
let money = 0;
let lemons = 0;
let heat = 0;
let maxHeat = 100;

// Keys
const keys = {};

// Customers
let customers = [];
let customerSpawnTimer = 0;

// Police
const police = {
    x: -100,
    y: -100,
    width: 40,
    height: 50,
    speed: 2,
    health: 100
};

let policeActive = false;
let policeSpawnTimer = 0;

// Projectiles
let bullets = [];

// ==================== EVENT LISTENERS ====================
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key === ' ' && gameState === 'playing') {
        e.preventDefault();
        sellLemon();
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
    } else if (gameState === 'playing') {
        buyLemon();
    }
});

// ==================== GAME FUNCTIONS ====================
function startGame() {
    gameState = 'playing';
    gameOver = false;
    money = 0;
    lemons = 0;
    heat = 0;
    policeActive = false;
    customers = [];
    bullets = [];
    
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    document.getElementById('gameMessage').textContent = 'Sell lemons and avoid the police!';
    
    gameLoop();
}

function buyLemon() {
    if (money >= 2 && lemons < 20) {
        money -= 2;
        lemons += 3;
        document.getElementById('gameMessage').textContent = 'Bought 3 lemons for $2!';
        setTimeout(() => {
            document.getElementById('gameMessage').textContent = '';
        }, 2000);
    }
}

function sellLemon() {
    if (lemons > 0) {
        lemons--;
        const profit = Math.floor(Math.random() * 8) + 5; // $5-$12 per lemon
        money += profit;
        heat += Math.random() * 15 + 5; // Heat increases when selling
        
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
    // Movement
    player.vx = 0;
    player.vy = 0;
    
    if (keys['w'] || keys['arrowup']) player.vy = -player.speed;
    if (keys['s'] || keys['arrowdown']) player.vy = player.speed;
    if (keys['a'] || keys['arrowleft']) player.vx = -player.speed;
    if (keys['d'] || keys['arrowright']) player.vx = player.speed;
    
    player.x += player.vx;
    player.y += player.vy;
    
    // Boundary check
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

function updateCustomers() {
    customerSpawnTimer--;
    if (customerSpawnTimer <= 0) {
        spawnCustomer();
        customerSpawnTimer = 60 + Math.random() * 60;
    }
    
    for (let i = customers.length - 1; i >= 0; i--) {
        const c = customers[i];
        
        // Move towards player
        const dx = player.x - c.x;
        const dy = player.y - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 5) {
            c.x += (dx / dist) * c.speed;
            c.y += (dy / dist) * c.speed;
        }
        
        // Check if reached player
        if (dist < 40) {
            customers.splice(i, 1);
            if (lemons > 0) {
                lemons--;
                money += Math.floor(Math.random() * 15) + 10;
                heat += Math.random() * 20 + 10;
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
    // Spawn police when heat is high
    if (heat >= 50 && !policeActive) {
        policeActive = true;
        police.x = Math.random() * canvas.width;
        police.y = -50;
        police.health = 100;
    }
    
    if (policeActive) {
        // Move towards player
        const dx = player.x - police.x;
        const dy = player.y - police.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 20) {
            police.x += (dx / dist) * police.speed;
            police.y += (dy / dist) * police.speed;
        }
        
        // Check collision with player
        if (dist < 50) {
            endGame('CAUGHT BY POLICE!');
        }
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
    // Heat decreases over time when not selling
    if (lemons === 0 || money > 100) {
        heat -= 0.5;
    }
    heat = Math.max(0, heat);
    
    // Heat affects police speed
    if (policeActive) {
        police.speed = 2 + (heat / maxHeat) * 3;
    }
}

function update() {
    if (gameState !== 'playing') return;
    
    updatePlayer();
    updateCustomers();
    updatePolice();
    updateBullets();
    updateHeat();
    
    // Update UI
    document.getElementById('money').textContent = money;
    document.getElementById('lemons').textContent = lemons;
    document.getElementById('heat').textContent = Math.floor(heat);
    
    const policeDistance = policeActive ? 
        Math.floor(Math.sqrt(Math.pow(police.x - player.x, 2) + Math.pow(police.y - player.y, 2))) : 
        'Safe';
    document.getElementById('policeDistance').textContent = policeDistance;
}

function draw() {
    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
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
    
    // Draw police
    if (policeActive) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(police.x - police.width/2, police.y - police.height/2, police.width, police.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👮', police.x, police.y);
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
    ctx.fillText('WASD/Arrow Keys to move', 10, 40);
    ctx.fillText('SPACE to sell', 10, 55);
    ctx.fillText('Click to buy lemons ($2)', 10, 70);
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
