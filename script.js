// Messi Cup – Chrome‑Dino‑Style Smooth Runner (60 FPS, Physics-based)
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayDesc = document.getElementById('overlay-desc');
const startBtn = document.getElementById('start-btn');
const soundToggle = document.getElementById('sound-toggle');
const container = document.querySelector('.game-container');

// Audio Context & Sounds
let audioCtx = null;
let soundMuted = localStorage.getItem('messiSoundMuted') === 'true';
soundToggle.textContent = soundMuted ? '🔇' : '🔊';

function playSound(type) {
    if (soundMuted) return;
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        switch (type) {
            case 'eat': // Gold Cup pickup
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
                osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            case 'jump': // Jump sound
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(250, now);
                osc.frequency.linearRampToValueAtTime(450, now + 0.15);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            case 'lose': // Red card / crash sound
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.5);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
                osc.start(now);
                osc.stop(now + 0.5);
                break;
        }
    } catch (e) {
        console.log("Audio failed to play", e);
    }
}

// Game Physics Config
const groundY = 320; // Y line of the field ground
let speed = 4.8; // Scroll speed
let score = 0;
let highScore = localStorage.getItem('messiCupHighScore') || 0;
highScoreElement.textContent = highScore;

// Game State
let gameActive = false;
let gamePaused = false;
let shakeTime = 0;
let lastTime = 0;

// Player (Messi)
const player = {
    x: 60,
    y: groundY - 44,
    width: 28,
    height: 44,
    vy: 0,
    gravity: 0.52,
    jumpStrength: -11.0,
    isJumping: false,
    runCycle: 0,
    ballAngle: 0
};

// Game Entities Arrays
let obstacles = [];
let collectibles = []; // Copas (Gold Cups)
let particles = [];
let nextObstacleTime = 0;
let nextCollectibleTime = 0;
let fieldLinesOffset = 0;

// Confetti Particle Class
class GoldConfetti {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 2 + Math.random() * 3;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5 - 2;
        this.color = Math.random() > 0.4 ? '#fbbf24' : '#ffffff';
        this.alpha = 1;
        this.life = 25 + Math.random() * 20;
        this.maxLife = this.life;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.12; // Gravity on particles
        this.life--;
        this.alpha = Math.max(0, this.life / this.maxLife);
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.radius * 1.5, this.radius);
        ctx.restore();
    }
}

// Running Grass Dust Particle
class RunningDust {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = -speed * 0.4 - Math.random() * 2;
        this.vy = -Math.random() * 1.5;
        this.radius = 1 + Math.random() * 3;
        this.color = Math.random() > 0.5 ? '#10b981' : '#059669';
        this.alpha = 0.6;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.02;
    }
    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Spawners
function spawnObstacle() {
    const types = ['standing_rival', 'sliding_rival', 'red_card'];
    const type = types[Math.floor(Math.random() * types.length)];
    let width = 28;
    let height = 44;
    let y = groundY - height;

    if (type === 'sliding_rival') {
        width = 38;
        height = 22;
        y = groundY - height;
    } else if (type === 'red_card') {
        width = 14;
        height = 22;
        y = groundY - 60 - Math.random() * 20; // Floating at head height
    }

    obstacles.push({
        type,
        x: canvas.width + 20,
        y,
        width,
        height,
        color: '#ef4444'
    });
}

function spawnCollectible() {
    collectibles.push({
        x: canvas.width + 20,
        y: groundY - 45 - Math.random() * 70, // Floating at jump heights
        width: 20,
        height: 20,
        collected: false
    });
}

// Reset Game
function initGame() {
    player.y = groundY - player.height;
    player.vy = 0;
    player.isJumping = false;
    player.runCycle = 0;
    player.ballAngle = 0;

    obstacles = [];
    collectibles = [];
    particles = [];
    score = 0;
    scoreElement.textContent = score;
    speed = 4.8;
    shakeTime = 0;
    
    const now = Date.now();
    nextObstacleTime = now + 1500;
    nextCollectibleTime = now + 2500;
    
    gamePaused = false;
    gameActive = true;
    overlay.classList.add('hidden');
    container.classList.add('game-active');
    
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    if (gameActive) return;
    initGame();
}

function gameOver() {
    gameActive = false;
    playSound('lose');
    shakeTime = 20;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('messiCupHighScore', highScore);
        highScoreElement.textContent = highScore;
        // Confetti burst
        for (let i = 0; i < 80; i++) {
            particles.push(new GoldConfetti(canvas.width / 2, canvas.height / 2 - 50));
        }
    }

    overlayTitle.textContent = "¡Tarjeta Roja! 🟥";
    overlayTitle.style.color = "var(--danger-color)";
    overlayDesc.textContent = `¡Te barrieron! Juntaste ${score} Copas del Mundo.`;
    startBtn.textContent = "Jugar de nuevo";
    overlay.classList.remove('hidden');
    container.classList.remove('game-active');
}

function togglePause() {
    if (!gameActive) return;
    gamePaused = !gamePaused;
    if (gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px "Space Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('JUEGO PAUSADO', canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = '11px "Space Mono"';
        ctx.fillText('Presiona "P" para Continuar', canvas.width / 2, canvas.height / 2 + 15);
    } else {
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

// Collisions
function checkCollision(r1, r2) {
    return r1.x < r2.x + r2.width &&
           r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height &&
           r1.y + r1.height > r2.y;
}

// Input Jump triggers
function triggerJump() {
    if (!gameActive || gamePaused) return;
    if (!player.isJumping) {
        player.isJumping = true;
        player.vy = player.jumpStrength;
        playSound('jump');
    }
}

// Game Loop Update
function update(dt) {
    // 1. Physics & Ground limits
    player.vy += player.gravity;
    player.y += player.vy;
    
    if (player.y >= groundY - player.height) {
        player.y = groundY - player.height;
        player.vy = 0;
        player.isJumping = false;
    }

    // 2. Running animations & dust
    if (!player.isJumping) {
        player.runCycle += 0.22;
        player.ballAngle += 0.25;
        if (Math.random() > 0.45) {
            particles.push(new RunningDust(player.x + 4, groundY - 2));
        }
    } else {
        player.ballAngle += 0.05; // Rolls slower in air
    }

    // 3. Increment speed gradually
    speed += 0.0006;

    // 4. Scroll background elements
    fieldLinesOffset = (fieldLinesOffset + speed) % 120;

    // 5. Spawn logic over time
    const now = Date.now();
    if (now > nextObstacleTime) {
        spawnObstacle();
        // Dynamic intervals
        nextObstacleTime = now + 1200 + Math.random() * 1800;
    }
    if (now > nextCollectibleTime) {
        spawnCollectible();
        nextCollectibleTime = now + 2000 + Math.random() * 2500;
    }

    // 6. Move and handle obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= speed;

        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
            score++; // Score +1 for jumping successfully
            scoreElement.textContent = score;
            continue;
        }

        // Box collision
        if (checkCollision(player, obs)) {
            gameOver();
            return;
        }
    }

    // 7. Move and handle collectibles (world cups)
    for (let i = collectibles.length - 1; i >= 0; i--) {
        const col = collectibles[i];
        col.x -= speed;

        if (col.x + col.width < 0) {
            collectibles.splice(i, 1);
            continue;
        }

        // Grab cup
        if (!col.collected && checkCollision(player, col)) {
            col.collected = true;
            score += 5; // Collectible is worth 5 extra points!
            scoreElement.textContent = score;
            playSound('eat');
            
            // Spawn gold sparkles
            for (let p = 0; p < 12; p++) {
                particles.push(new GoldConfetti(col.x + 10, col.y + 10));
            }
            
            collectibles.splice(i, 1);
        }
    }

    // 8. Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0 || particles[i].alpha <= 0) {
            particles.splice(i, 1);
        }
    }

    // Screen Shake
    if (shakeTime > 0) shakeTime--;
}

// Drawing routines
function draw() {
    ctx.save();
    
    // Handle Game Over Screen Shake
    if (shakeTime > 0) {
        const dx = (Math.random() - 0.5) * 8;
        const dy = (Math.random() - 0.5) * 8;
        ctx.translate(dx, dy);
    }

    // 1. Dark night background
    ctx.fillStyle = '#080c15';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Stadium Skyglow/Moon
    const radGrd = ctx.createRadialGradient(canvas.width / 2, canvas.height, 10, canvas.width / 2, canvas.height, 350);
    radGrd.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
    radGrd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrd;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Draw Green Grass Pitch (Bottom half)
    ctx.fillStyle = '#059669';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

    // Draw field lawn check lines (moving smoothly)
    ctx.fillStyle = '#10b981';
    for (let x = -120; x < canvas.width + 120; x += 120) {
        ctx.fillRect(x - fieldLinesOffset, groundY, 60, canvas.height - groundY);
    }

    // Draw solid ground separation line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    // 4. Draw Collectibles (World Cups)
    collectibles.forEach(col => {
        const cx = col.x;
        const cy = col.y;
        
        ctx.save();
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        // Stand base
        ctx.fillRect(cx + 4, cy + 16, 12, 3);
        ctx.strokeRect(cx + 4, cy + 16, 12, 3);
        // Neck
        ctx.fillRect(cx + 8, cy + 9, 4, 7);
        ctx.strokeRect(cx + 8, cy + 9, 4, 7);
        // Cup head
        ctx.beginPath();
        ctx.arc(cx + 10, cy + 7, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    });

    // 5. Draw Particles (Dust, Confetti)
    particles.forEach(p => p.draw());

    // 6. Draw Obstacles (Rivals & Red Cards)
    obstacles.forEach(obs => {
        ctx.save();
        if (obs.type === 'standing_rival') {
            const rx = obs.x;
            const ry = obs.y;
            
            // Draw Standing Rival (Red jersey, angry face)
            // Jersey
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(rx + 4, ry + 16, 20, 28);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(rx + 4, ry + 16, 20, 28);
            
            // Neck & Face
            ctx.fillStyle = '#ffd6ad';
            ctx.fillRect(rx + 9, ry + 8, 10, 8);
            ctx.strokeRect(rx + 9, ry + 8, 10, 8);

            // Dark hair
            ctx.fillStyle = '#1c1917';
            ctx.fillRect(rx + 7, ry + 4, 14, 6);
            ctx.strokeRect(rx + 7, ry + 4, 14, 6);

            // Red strip
            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(rx + 12, ry + 16, 4, 28);

        } else if (obs.type === 'sliding_rival') {
            const sx = obs.x;
            const sy = obs.y;

            // Draw sliding defender (Horizontal box + dust trail)
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(sx, sy + 6, 38, 16);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(sx, sy + 6, 38, 16);

            // Head sliding ahead
            ctx.fillStyle = '#ffd6ad';
            ctx.beginPath();
            ctx.arc(sx + 8, sy + 10, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Slide dust
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(sx + 30, sy + 14, 12, 6);

        } else if (obs.type === 'red_card') {
            const cx = obs.x;
            const cy = obs.y;

            // Floating Red Card (Glowing red rectangle)
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ef4444';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.fillRect(cx, cy, obs.width, obs.height);
            ctx.strokeRect(cx, cy, obs.width, obs.height);
        }
        ctx.restore();
    });

    // 7. Draw Player (Messi + Soccer Ball)
    const px = player.x;
    const py = player.y;
    ctx.save();

    // Legs animation based on runCycle
    const leftLegOffset = player.isJumping ? 8 : Math.sin(player.runCycle) * 10;
    const rightLegOffset = player.isJumping ? -8 : -Math.sin(player.runCycle) * 10;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;

    // Left leg
    ctx.fillStyle = '#ffd6ad';
    ctx.fillRect(px + 6, py + 38 + leftLegOffset / 2, 5, 8 - leftLegOffset / 2);
    ctx.strokeRect(px + 6, py + 38 + leftLegOffset / 2, 5, 8 - leftLegOffset / 2);
    
    // Right leg
    ctx.fillRect(px + 17, py + 38 + rightLegOffset / 2, 5, 8 - rightLegOffset / 2);
    ctx.strokeRect(px + 17, py + 38 + rightLegOffset / 2, 5, 8 - rightLegOffset / 2);

    // Jersey (Argentina Shirt: Sky blue & white stripes)
    ctx.fillStyle = '#38bdf8'; // Sky blue
    ctx.fillRect(px + 3, py + 18, 22, 20);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 3, py + 18, 22, 20);
    
    // White vertical stripes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 8, py + 18, 4, 20);
    ctx.fillRect(px + 16, py + 18, 4, 20);

    // Dennis-style Head (Blonde spikes + face)
    ctx.fillStyle = '#ffd6ad';
    ctx.beginPath();
    ctx.arc(px + 14, py + 12, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair (Yellow spiky hair)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(px + 14, py + 9, 8.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Spiky details
    ctx.beginPath();
    ctx.moveTo(px + 5, py + 9);
    ctx.lineTo(px + 2, py + 3);
    ctx.lineTo(px + 10, py + 7);
    ctx.lineTo(px + 14, py + 1);
    ctx.lineTo(px + 18, py + 7);
    ctx.lineTo(px + 25, py + 3);
    ctx.lineTo(px + 23, py + 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px + 12, py + 12, 1, 0, Math.PI * 2);
    ctx.arc(px + 17, py + 12, 1, 0, Math.PI * 2);
    ctx.fill();

    // Big Smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px + 14, py + 14, 3, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // 8. Draw Soccer Ball at his feet
    const bx = px + 28;
    const by = py + 32;
    const bRadius = 7.5;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(player.ballAngle);

    // Ball Base
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, bRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Black hexagon patterns on the ball
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, bRadius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * (bRadius * 0.35), Math.sin(angle) * (bRadius * 0.35));
        ctx.lineTo(Math.cos(angle) * bRadius, Math.sin(angle) * bRadius);
        ctx.stroke();
    }
    ctx.restore();

    ctx.restore(); // Restore Player translation
    ctx.restore(); // Restore Shake translation
}

// 60 FPS Game Loop using RequestAnimationFrame & Delta Time
function gameLoop(timestamp) {
    if (!gameActive) return;
    if (gamePaused) return;

    // Calculate actual delta-time to keep movement constant
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

// Keyboard events
window.addEventListener('keydown', e => {
    if (e.code === 'KeyP') { 
        e.preventDefault(); 
        togglePause(); 
        return; 
    }
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        triggerJump();
    }
});

// Canvas click/touch anywhere to jump
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    triggerJump();
}, { passive: false });

canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    triggerJump();
});

// Mobile Jump Button
const jumpBtn = document.getElementById('jump-btn');
if (jumpBtn) {
    jumpBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        triggerJump();
    }, { passive: false });

    jumpBtn.addEventListener('mousedown', e => {
        e.preventDefault();
        triggerJump();
    });
}

// Menu Start Button
startBtn.addEventListener('click', () => {
    startGame();
});

// Sound Toggle
soundToggle.addEventListener('click', () => {
    soundMuted = !soundMuted;
    localStorage.setItem('messiSoundMuted', soundMuted);
    soundToggle.textContent = soundMuted ? '🔇' : '🔊';
    soundToggle.blur();
});

// Initial draw before start
ctx.fillStyle = '#080c15';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#059669';
ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 3;
ctx.beginPath();
ctx.moveTo(0, groundY);
ctx.lineTo(canvas.width, groundY);
ctx.stroke();
