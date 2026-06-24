// Messi Cup – Chrome‑Dino‑Style Runner (Jump‑Only)
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

let audioCtx = null;
let soundMuted = localStorage.getItem('messiSoundMuted') === 'true';
soundToggle.textContent = soundMuted ? '🔇' : '🔊';
function playSound(type) {
    if (soundMuted) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    switch (type) {
        case 'eat':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.08);
            osc.frequency.setValueAtTime(783.99, now + 0.16);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
            break;
        case 'turn':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(150, now + 0.04);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
            osc.start(now);
            osc.stop(now + 0.04);
            break;
        case 'lose':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
            gain.gain.linearRampToValueAtTime(0.02, now + 0.12);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.15);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.45);
            const vibrato = audioCtx.createOscillator();
            const vibratoGain = audioCtx.createGain();
            vibrato.frequency.value = 32;
            vibratoGain.gain.value = 20;
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);
            vibrato.start(now);
            vibrato.stop(now + 0.45);
            osc.start(now);
            osc.stop(now + 0.45);
            break;
    }
}

// Grid configuration
const gridSize = 20;
const tileCount = canvas.width / gridSize; // 20 tiles per side
let gameSpeed = 140; // ms per frame

// Game state
let player = { x: 5, y: tileCount - 2, vy: 0, isJumping: false };
let rivals = [];
let rivalSpawnInterval = 1500; // ms between rivals
let lastRivalSpawn = 0;
let foodX = 0, foodY = 0; // Copa collectible
let score = 0;
let highScore = localStorage.getItem('messiCupHighScore') || 0;
let gameLoopId = null;
let gameActive = false;
let gamePaused = false;
let particles = [];
let shakeTime = 0;
let lastFrameTime = 0;

highScoreElement.textContent = highScore;

class GoldConfetti {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 2 + Math.random() * 4;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5 - 1;
        this.color = Math.random() > 0.4 ? '#fbbf24' : '#ffffff';
        this.alpha = 1;
        this.life = 20 + Math.random() * 15;
        this.maxLife = this.life;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1;
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

function placeFood() {
    foodX = Math.floor(Math.random() * tileCount);
    foodY = Math.floor(Math.random() * (tileCount - 4)) + 2; // avoid top/bottom edges
    // Ensure not on player
    if (foodX === player.x && foodY === player.y) placeFood();
}

function spawnRival() {
    const rivalY = tileCount - 2; // ground level
    rivals.push({ x: tileCount - 1, y: rivalY });
}

function initGame() {
    player = { x: 5, y: tileCount - 2, vy: 0, isJumping: false };
    rivals = [];
    score = 0;
    scoreElement.textContent = score;
    gameSpeed = 140;
    particles = [];
    shakeTime = 0;
    placeFood();
    lastRivalSpawn = Date.now();
    gamePaused = false;
    gameActive = true;
    overlay.classList.add('hidden');
    container.classList.add('game-active');
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    lastFrameTime = Date.now();
    gameLoop();
}

function startGame() {
    if (gameActive) return;
    initGame();
}

function gameOver() {
    gameActive = false;
    clearTimeout(gameLoopId);
    playSound('lose');
    shakeTime = 18;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('messiCupHighScore', highScore);
        highScoreElement.textContent = highScore;
        for (let i = 0; i < 70; i++) {
            particles.push(new GoldConfetti(canvas.width / 2 + (Math.random() - 0.5) * 200, canvas.height / 2 + (Math.random() - 0.5) * 100));
        }
    }
    overlayTitle.textContent = "¡Tarjeta Roja! 🟥";
    overlayTitle.style.color = "var(--danger-color)";
    overlayDesc.textContent = `¡El equipo chocó! Lograste juntar ${score} Copas del Mundo.`;
    startBtn.textContent = "Volver a Jugar";
    overlay.classList.remove('hidden');
    container.classList.remove('game-active');
}

function togglePause() {
    if (!gameActive) return;
    gamePaused = !gamePaused;
    if (gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px "Space Mono"';
        ctx.textAlign = 'center';
        ctx.fillText('JUEGO PAUSADO', canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = '10px "Space Mono"';
        ctx.fillText('Presiona "P" para Continuar', canvas.width / 2, canvas.height / 2 + 15);
    }
}

function update(delta) {
    // Player jump physics
    if (player.isJumping) {
        player.vy += 0.3; // gravity
        player.y += player.vy;
        if (player.y >= tileCount - 2) {
            player.y = tileCount - 2;
            player.vy = 0;
            player.isJumping = false;
        }
    }
    // Move rivals left
    rivals.forEach((r, i) => {
        r.x -= 1;
        if (r.x < 0) rivals.splice(i, 1);
        // Collision with player
        if (Math.round(r.x) === player.x && Math.round(r.y) === Math.round(player.y)) {
            gameOver();
        }
    });
    // Food collection
    if (Math.round(player.x) === foodX && Math.round(player.y) === foodY) {
        score++;
        scoreElement.textContent = score;
        playSound('eat');
        const px = foodX * gridSize + gridSize / 2;
        const py = foodY * gridSize + gridSize / 2;
        for (let i = 0; i < 15; i++) particles.push(new GoldConfetti(px, py));
        gameSpeed = Math.max(75, 140 - score * 2.5);
        placeFood();
    }
    // Update particles
    particles.forEach((p, idx) => {
        p.update();
        if (p.life <= 0) particles.splice(idx, 1);
    });
    if (shakeTime > 0) shakeTime--;
    // Spawn rivals
    if (Date.now() - lastRivalSpawn > rivalSpawnInterval) {
        spawnRival();
        lastRivalSpawn = Date.now();
    }
}

function draw() {
    ctx.save();
    if (shakeTime > 0) {
        const sx = (Math.random() - 0.5) * 6;
        const sy = (Math.random() - 0.5) * 6;
        ctx.translate(sx, sy);
    }
    // Background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Grass checkerboard
    for (let y = 0; y < tileCount; y++) {
        for (let x = 0; x < tileCount; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? '#059669' : '#10b981';
            ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
        }
    }
    // Field lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.strokeRect(gridSize, gridSize, canvas.width - gridSize * 2, canvas.height - gridSize * 2);
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, gridSize * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    // Food (gold cup)
    const fx = foodX * gridSize;
    const fy = foodY * gridSize;
    ctx.save();
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.fillRect(fx + 4, fy + 16, 12, 3);
    ctx.strokeRect(fx + 4, fy + 16, 12, 3);
    ctx.fillRect(fx + 8, fy + 9, 4, 7);
    ctx.strokeRect(fx + 8, fy + 9, 4, 7);
    ctx.beginPath();
    ctx.arc(fx + 10, fy + 7, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // Particles
    particles.forEach(p => p.draw());
    // Draw player (Messi head)
    const px = player.x * gridSize;
    const py = player.y * gridSize;
    ctx.save();
    // Shirt neck
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(px + 4, py + 14, 12, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 9, py + 14, 2, 5);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 4, py + 14, 12, 5);
    // Face
    ctx.fillStyle = '#ffd6ad';
    ctx.beginPath();
    ctx.arc(px + 10, py + 10, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Hair
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(px + 10, py + 7, 7.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Spikes
    ctx.beginPath();
    ctx.moveTo(px + 3, py + 7);
    ctx.lineTo(px + 1, py + 2);
    ctx.lineTo(px + 7, py + 6);
    ctx.lineTo(px + 10, py + 1);
    ctx.lineTo(px + 13, py + 6);
    ctx.lineTo(px + 18, py + 2);
    ctx.lineTo(px + 17, py + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px + 8, py + 10, 1, 0, Math.PI * 2);
    ctx.arc(px + 12, py + 10, 1, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(px + 10, py + 12, 2.5, 0.1, Math.PI - 0.1);
    ctx.stroke();
    ctx.restore();
    // Rivals (red blocks)
    rivals.forEach(r => {
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(r.x * gridSize, r.y * gridSize, gridSize, gridSize);
        ctx.restore();
    });
    ctx.restore();
}

function gameLoop() {
    if (!gameActive) return;
    if (!gamePaused) {
        const now = Date.now();
        const delta = now - lastFrameTime;
        lastFrameTime = now;
        update(delta);
        draw();
    }
    gameLoopId = setTimeout(gameLoop, gameSpeed);
}

// Input handling – jump on Space or tap Jump button
window.addEventListener('keydown', e => {
    if (e.code === 'KeyP') { togglePause(); return; }
    if (!gameActive || gamePaused) return;
    if (e.code === 'Space') {
        e.preventDefault();
        if (!player.isJumping) {
            player.isJumping = true;
            player.vy = -5;
            playSound('turn');
        }
    }
});

const jumpBtn = document.getElementById('jump-btn');
if (jumpBtn) {
    jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); if (!player.isJumping) { player.isJumping = true; player.vy = -5; playSound('turn'); } }, { passive: false });
    jumpBtn.addEventListener('mousedown', () => { if (!player.isJumping) { player.isJumping = true; player.vy = -5; playSound('turn'); } });
}

startBtn.addEventListener('click', startGame);
soundToggle.addEventListener('click', () => {
    soundMuted = !soundMuted;
    localStorage.setItem('messiSoundMuted', soundMuted);
    soundToggle.textContent = soundMuted ? '🔇' : '🔊';
    soundToggle.blur();
});

// Initial static draw
initGame();
draw();
