const CONFIG = {
    SCREEN_WIDTH: 1200,
    SCREEN_HEIGHT: 800,
    NODE_RADIUS: 32,
    ANIMATION_DURATION: 350,
    AI_DELAY: 500,
    MONKEY_INTERVAL: 6,
    COLORS: {
        BACKGROUND: '#0f0f1a',
        YASHODA_BG: '#1a1210',
        YASHODA_ACCENT: '#ff6b35',
        YASHODA_TEXT: '#ff6b35',
        KRISHNA_BG: '#0a1420',
        KRISHNA_ACCENT: '#4fc3f7',
        KRISHNA_TEXT: '#4fc3f7',
        NODE_FILL: '#1e1e36',
        NODE_GRADIENT_TOP: '#2a2a4a',
        NODE_GRADIENT_BOTTOM: '#1a1a2e',
        NODE_BORDER: '#3a3a5a',
        NODE_TEXT: '#b0b0c0',
        HIGHLIGHT: '#ffd700',
        HIGHLIGHT_GLOW: 'rgba(255, 215, 0, 0.4)',
        PATH_PREVIEW: 'rgba(255, 215, 0, 0.6)',
        EDGE: '#2a2a4a',
        EDGE_GLOW: 'rgba(255, 215, 0, 0.1)',
        TURN_TEXT: '#ffffff'
    },
    PLAYER_YASHODA: 'Yashoda',
    PLAYER_KRISHNA: 'Krishna'
};

const HARD_CONFIG = {
    TURN_LIMIT: 3000, YASHODA_START: 3, KRISHNA_START: 18,
    GRAPH: {
        1: [4, 11], 2: [3, 5], 3: [2, 6, 7], 4: [1, 5, 11], 5: [2, 4, 6, 9],
        6: [3, 5, 8, 10], 7: [3, 10, 12], 8: [6, 9, 16], 9: [5, 8, 11, 13],
        10: [6, 7, 15, 16], 11: [1, 4, 9, 14], 12: [7, 15], 13: [9, 14, 16, 19],
        14: [11, 13, 18], 15: [10, 12, 17], 16: [8, 10, 13, 17], 17: [15, 16, 19, 20],
        18: [14, 22, 19], 19: [13, 17, 18, 21], 20: [17, 21], 21: [19, 20, 22], 22: [18, 21]
    },
    POSITIONS: {
        1: [232, 193], 2: [208, 729], 3: [328, 717], 4: [448, 325], 5: [496, 445],
        6: [508, 565], 7: [604, 685], 8: [580, 529], 9: [604, 421], 10: [664, 589],
        11: [688, 265], 12: [748, 733], 13: [760, 385], 14: [844, 253], 15: [772, 637],
        16: [736, 553], 17: [832, 541], 18: [1024, 229], 19: [904, 421], 20: [892, 577],
        21: [1012, 505], 22: [1096, 349]
    }
};

const EASY_CONFIG = {
    TURN_LIMIT: 2000, YASHODA_START: 3, KRISHNA_START: 15,
    GRAPH: {
        1: [2, 10, 11], 2: [1, 3], 3: [2, 4, 9, 10], 4: [3, 5], 5: [4, 6, 8, 9],
        6: [5, 7], 7: [6, 8], 8: [5, 7, 14, 15], 9: [3, 5, 13, 14], 10: [1, 3, 11, 13],
        11: [1, 10, 12], 12: [11, 13], 13: [9, 10, 12, 17], 14: [8, 9, 16, 17],
        15: [8, 16], 16: [14, 15], 17: [13, 14]
    },
    POSITIONS: {
        1: [100, 300], 2: [200, 200], 3: [300, 300], 4: [400, 200], 5: [500, 300],
        6: [600, 200], 7: [700, 300], 8: [600, 400], 9: [400, 400], 10: [200, 400],
        11: [100, 500], 12: [200, 600], 13: [300, 500], 14: [500, 500], 15: [700, 500],
        16: [600, 600], 17: [400, 600]
    }
};

[HARD_CONFIG, EASY_CONFIG].forEach(cfg => {
    for (let node in cfg.GRAPH) {
        node = parseInt(node);
        cfg.GRAPH[node].forEach(neighbor => {
            if (!cfg.GRAPH[neighbor]) cfg.GRAPH[neighbor] = [];
            if (!cfg.GRAPH[neighbor].includes(node)) cfg.GRAPH[neighbor].push(node);
        });
    }
});

// Sound Effects Manager
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    playTone(freq, duration, type = 'sine', volume = 0.3) {
        if (!this.audioContext || !this.enabled) return;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }

    playHover() { this.playTone(800, 0.1, 'sine', 0.15); }
    playClick() { this.playTone(600, 0.15, 'triangle', 0.2); }
    playMove() { this.playTone(440, 0.2, 'sine', 0.25); }
    playWin() {
        [523.25, 659.25, 783.99, 1046.50].forEach((f, i) =>
            setTimeout(() => this.playTone(f, 0.3, 'sine', 0.3), i * 150));
    }
}

// Particle System
class ParticleSystem {
    constructor() {
        this.container = document.getElementById('particles-container');
        this.particles = [];
        this.maxParticles = 30;
    }

    createParticle() {
        if (this.particles.length >= this.maxParticles) return;
        const particle = document.createElement('div');
        particle.className = 'particle';
        const types = ['sparkle', 'petal', 'star'];
        particle.classList.add(types[Math.floor(Math.random() * types.length)]);
        const size = 5 + Math.random() * 15;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${8 + Math.random() * 10}s`;
        particle.style.animationDelay = `${Math.random() * 5}s`;
        this.container.appendChild(particle);
        this.particles.push(particle);
        setTimeout(() => {
            particle.remove();
            this.particles = this.particles.filter(p => p !== particle);
        }, 18000);
    }

    start() {
        for (let i = 0; i < 15; i++) setTimeout(() => this.createParticle(), i * 200);
        setInterval(() => this.createParticle(), 1000);
    }
}

// Confetti System
function createConfetti(container, count = 50) {
    const colors = ['#ffd700', '#ff6b35', '#4fc3f7', '#9c27b0', '#00c853', '#ff69b4'];
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
            confetti.style.animationDelay = `${Math.random() * 0.5}s`;
            const shapes = ['50%', '0', '50% 0 50% 0'];
            confetti.style.borderRadius = shapes[Math.floor(Math.random() * shapes.length)];
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            container.appendChild(confetti);
            setTimeout(() => confetti.remove(), 4000);
        }, i * 30);
    }
}

// Button Ripple Effect
function addRippleEffect(button) {
    button.addEventListener('click', function (e) {
        const ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentConfig = null;
        this.gameState = { yashodaPos: 0, krishnaPos: 0, turnCount: 0, currentPlayer: '', gameOver: false, winner: null };
        this.isAI = false;
        this.totalMoves = 0;
        this.monkeyAppearances = 0;
        this.animation = { active: false, player: null, fromPos: null, toPos: null, currentPos: null, startTime: null, duration: CONFIG.ANIMATION_DURATION, targetNode: null };
        this.hoveredNode = null;
        this.pulsePhase = 0;
        this.auraPhase = 0;
        this.ringRotation = 0;
        this.trailPoints = [];
        this.edgeFlowOffset = 0;
        this.assets = { yashoda: new Image(), krishna: new Image() };
        this.assetsLoaded = 0;
        this.soundManager = new SoundManager();
        this.particleSystem = new ParticleSystem();
        this.init();
    }

    init() {
        this.assets.yashoda.src = 'assets/Yashoda.jpg';
        this.assets.krishna.src = 'assets/Krishna.jpg';
        const checkLoad = () => { this.assetsLoaded++; if (this.assetsLoaded === 2) this.resize(); };
        this.assets.yashoda.onload = checkLoad;
        this.assets.krishna.onload = checkLoad;

        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('click', e => this.handleInteraction(e));
        this.canvas.addEventListener('touchstart', e => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchend', e => this.handleTouchEnd(e), { passive: false });
        this.canvas.addEventListener('mousemove', e => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => { this.hoveredNode = null; });

        document.getElementById('btn-easy').addEventListener('click', () => this.startGame(EASY_CONFIG, false));
        document.getElementById('btn-hard').addEventListener('click', () => this.startGame(HARD_CONFIG, false));
        document.getElementById('btn-easy-ai').addEventListener('click', () => this.startGame(EASY_CONFIG, true));
        document.getElementById('btn-hard-ai').addEventListener('click', () => this.startGame(HARD_CONFIG, true));
        document.getElementById('btn-restart').addEventListener('click', () => this.resetGame());
        document.getElementById('btn-menu').addEventListener('click', () => this.showMenu());
        document.getElementById('btn-play-again').addEventListener('click', () => {
            document.getElementById('game-over-modal').classList.add('hidden');
            document.getElementById('game-over-modal').classList.remove('active');
            this.resetGame();
        });

        document.querySelectorAll('.btn').forEach(btn => addRippleEffect(btn));

        this.music = document.getElementById('bg-music');
        this.music.volume = 0.5;
        this.musicEnabled = true;
        this.soundEnabled = true;

        const startAudio = () => {
            if (this.musicEnabled && this.music.paused) this.music.play().catch(() => { });
            this.soundManager.init();
        };
        document.body.addEventListener('click', startAudio, { once: true });
        document.body.addEventListener('touchstart', startAudio, { once: true });

        // Music toggle button
        document.getElementById('btn-music').addEventListener('click', () => {
            this.musicEnabled = !this.musicEnabled;
            const btn = document.getElementById('btn-music');
            if (this.musicEnabled) {
                btn.classList.add('active');
                btn.querySelector('.btn-icon').textContent = '🎵';
                this.music.play().catch(() => { });
            } else {
                btn.classList.remove('active');
                btn.querySelector('.btn-icon').textContent = '🔇';
                this.music.pause();
            }
        });

        // Sound effects toggle button
        document.getElementById('btn-sound').addEventListener('click', () => {
            this.soundEnabled = !this.soundEnabled;
            this.soundManager.enabled = this.soundEnabled;
            const btn = document.getElementById('btn-sound');
            if (this.soundEnabled) {
                btn.classList.add('active');
                btn.querySelector('.btn-icon').textContent = '🔊';
            } else {
                btn.classList.remove('active');
                btn.querySelector('.btn-icon').textContent = '🔈';
            }
        });

        this.particleSystem.start();
        this.startAnimationLoop();
    }

    startAnimationLoop() {
        const animate = () => {
            this.pulsePhase += 0.04;
            this.auraPhase += 0.05;
            this.ringRotation += 0.02;
            this.edgeFlowOffset += 0.5;
            if (this.pulsePhase > Math.PI * 2) this.pulsePhase = 0;
            if (this.auraPhase > Math.PI * 2) this.auraPhase = 0;
            if (this.currentConfig) this.draw();
            if (this.animation.active) this.updateAnimation();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    resize() {
        const container = document.getElementById('game-container');
        const aspect = CONFIG.SCREEN_WIDTH / CONFIG.SCREEN_HEIGHT;
        let width = container.clientWidth, height = container.clientHeight;
        if (width / height > aspect) width = height * aspect; else height = width / aspect;
        this.canvas.width = CONFIG.SCREEN_WIDTH;
        this.canvas.height = CONFIG.SCREEN_HEIGHT;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        if (this.currentConfig) this.draw();
    }

    startGame(config, isAI) {
        this.currentConfig = config;
        this.isAI = isAI;
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('active');
        document.getElementById('game-screen').classList.remove('hidden');
        document.getElementById('game-screen').classList.add('active');
        this.soundManager.playClick();
        this.resetGame();
    }

    resetGame() {
        this.gameState = {
            yashodaPos: this.currentConfig.YASHODA_START,
            krishnaPos: this.currentConfig.KRISHNA_START,
            turnCount: 1, currentPlayer: CONFIG.PLAYER_YASHODA, gameOver: false, winner: null
        };
        this.totalMoves = 0;
        this.monkeyAppearances = 0;
        this.animation.active = false;
        this.trailPoints = [];
        this.hoveredNode = null;
        this.hideMonkey();
        this.updateUI();
        this.draw();
    }

    showMenu() {
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('main-menu').classList.remove('hidden');
        document.getElementById('main-menu').classList.add('active');
        document.getElementById('game-over-modal').classList.add('hidden');
        this.hideMonkey();
    }

    getValidMoves(player) {
        const pos = player === CONFIG.PLAYER_YASHODA ? this.gameState.yashodaPos : this.gameState.krishnaPos;
        return this.currentConfig.GRAPH[pos] || [];
    }

    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: (clientX - rect.left) * (this.canvas.width / rect.width), y: (clientY - rect.top) * (this.canvas.height / rect.height) };
    }

    handleTouchStart(e) { e.preventDefault(); if (e.touches.length === 1) this.touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    handleTouchEnd(e) {
        e.preventDefault();
        if (this.touchStartPos && e.changedTouches.length === 1) {
            const t = e.changedTouches[0];
            if (Math.abs(t.clientX - this.touchStartPos.x) < 30 && Math.abs(t.clientY - this.touchStartPos.y) < 30)
                this.handleInteraction({ clientX: t.clientX, clientY: t.clientY });
        }
        this.touchStartPos = null;
    }

    handleMouseMove(e) {
        if (this.gameState.gameOver || this.animation.active) return;
        if (this.isAI && this.gameState.currentPlayer === CONFIG.PLAYER_KRISHNA) return;
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        const node = this.getNodeAtPos(coords.x, coords.y);
        if (node !== this.hoveredNode) {
            const validMoves = this.getValidMoves(this.gameState.currentPlayer);
            if (validMoves.includes(node)) {
                if (this.hoveredNode !== node) this.soundManager.playHover();
                this.hoveredNode = node;
            } else this.hoveredNode = null;
        }
    }

    handleInteraction(e) {
        if (this.gameState.gameOver || this.animation.active) return;
        if (this.isAI && this.gameState.currentPlayer === CONFIG.PLAYER_KRISHNA) return;
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        const clickedNode = this.getNodeAtPos(coords.x, coords.y);
        if (clickedNode && this.getValidMoves(this.gameState.currentPlayer).includes(clickedNode)) {
            this.soundManager.playClick();
            this.makeMove(clickedNode);
        }
    }

    getNodeAtPos(x, y) {
        for (let [node, pos] of Object.entries(this.currentConfig.POSITIONS)) {
            if (Math.sqrt((x - pos[0]) ** 2 + (y - pos[1]) ** 2) <= CONFIG.NODE_RADIUS * 1.5) return parseInt(node);
        }
        return null;
    }

    makeMove(targetNode) {
        const isYashoda = this.gameState.currentPlayer === CONFIG.PLAYER_YASHODA;
        const currentPos = isYashoda ? this.gameState.yashodaPos : this.gameState.krishnaPos;
        const fromPos = this.currentConfig.POSITIONS[currentPos];
        const toPos = this.currentConfig.POSITIONS[targetNode];
        this.animation = { active: true, player: isYashoda ? 'yashoda' : 'krishna', fromPos: [...fromPos], toPos: [...toPos], currentPos: [...fromPos], startTime: performance.now(), duration: CONFIG.ANIMATION_DURATION, targetNode };
        this.trailPoints = [];
        this.hoveredNode = null;
        this.soundManager.playMove();
    }

    updateAnimation() {
        if (!this.animation.active) return;
        const elapsed = performance.now() - this.animation.startTime;
        const progress = Math.min(elapsed / this.animation.duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        this.animation.currentPos = [
            this.animation.fromPos[0] + (this.animation.toPos[0] - this.animation.fromPos[0]) * eased,
            this.animation.fromPos[1] + (this.animation.toPos[1] - this.animation.fromPos[1]) * eased
        ];
        this.trailPoints.push({ x: this.animation.currentPos[0], y: this.animation.currentPos[1], age: 0 });
        if (this.trailPoints.length > 20) this.trailPoints.shift();
        this.trailPoints.forEach(p => p.age++);
        if (progress >= 1) {
            this.completeMove(this.animation.targetNode);
            this.animation.active = false;
            this.trailPoints = [];
        }
    }

    completeMove(node) {
        this.totalMoves++;
        if (this.gameState.currentPlayer === CONFIG.PLAYER_YASHODA) {
            this.gameState.yashodaPos = node;
            this.gameState.currentPlayer = CONFIG.PLAYER_KRISHNA;
        } else {
            this.gameState.krishnaPos = node;
            this.gameState.turnCount++;
            this.gameState.currentPlayer = CONFIG.PLAYER_YASHODA;
        }
        if (this.totalMoves % CONFIG.MONKEY_INTERVAL === 0) this.showMonkey(); else this.hideMonkey();
        this.checkGameOver();
        this.updateUI();
        this.draw();
        if (!this.gameState.gameOver && this.isAI && this.gameState.currentPlayer === CONFIG.PLAYER_KRISHNA)
            setTimeout(() => this.playAITurn(), CONFIG.AI_DELAY);
    }

    showMonkey() {
        const container = document.getElementById('monkey-container');
        const textEl = document.getElementById('monkey-text');
        if (container && textEl) {
            this.monkeyAppearances++;
            // Set different messages based on appearance count
            if (this.monkeyAppearances === 1) {
                textEl.textContent = "Krishna gleefully shares the stolen butter with the mischievous monkeys!";
            } else if (this.monkeyAppearances === 2) {
                textEl.textContent = "The monkeys have eaten their fill and refuse any more butter!";
            } else {
                textEl.textContent = "Krishna teases: 'Even the monkeys won't touch your butter now!'";
            }
            container.classList.remove('hidden');
            container.classList.add('active');
        }
    }
    hideMonkey() {
        const container = document.getElementById('monkey-container');
        if (container) {
            container.classList.add('hidden');
            container.classList.remove('active');
        }
    }

    playAITurn() {
        if (this.gameState.gameOver) return;
        const validMoves = this.getValidMoves(CONFIG.PLAYER_KRISHNA);
        const safeMoves = validMoves.filter(n => n !== this.gameState.yashodaPos);
        let move;
        if (safeMoves.length === 0) move = validMoves[Math.floor(Math.random() * validMoves.length)];
        else {
            const yashodaNeighbors = this.currentConfig.GRAPH[this.gameState.yashodaPos] || [];
            const bestMoves = safeMoves.filter(n => !yashodaNeighbors.includes(n));
            move = (bestMoves.length > 0 ? bestMoves : safeMoves)[Math.floor(Math.random() * (bestMoves.length > 0 ? bestMoves : safeMoves).length)];
        }
        this.makeMove(move);
    }

    checkGameOver() {
        if (this.gameState.yashodaPos === this.gameState.krishnaPos) {
            this.gameState.gameOver = true; this.gameState.winner = CONFIG.PLAYER_YASHODA;
        } else if (this.gameState.turnCount > this.currentConfig.TURN_LIMIT) {
            this.gameState.gameOver = true; this.gameState.winner = CONFIG.PLAYER_KRISHNA;
        }
        if (this.gameState.gameOver) { this.hideMonkey(); setTimeout(() => this.showGameOver(), CONFIG.AI_DELAY); }
    }

    showGameOver() {
        const modal = document.getElementById('game-over-modal');
        const text = document.getElementById('winner-text');
        const subtitle = document.getElementById('winner-subtitle');
        text.textContent = `${this.gameState.winner} Wins!`;
        text.style.color = this.gameState.winner === CONFIG.PLAYER_YASHODA ? CONFIG.COLORS.YASHODA_ACCENT : CONFIG.COLORS.KRISHNA_ACCENT;
        subtitle.textContent = this.gameState.winner === CONFIG.PLAYER_YASHODA ? 'Divine love conquers all! 💖' : 'The playful Lord escapes again! 🦚';
        modal.classList.remove('hidden'); modal.classList.add('active');
        this.soundManager.playWin();
        createConfetti(document.getElementById('confetti-container'), 60);
    }

    updateUI() {
        document.getElementById('turn-count').textContent = `Turn: ${this.gameState.turnCount} / ${this.currentConfig.TURN_LIMIT}`;
        const playerSpan = document.getElementById('current-player');
        const playerIcon = document.getElementById('player-icon');
        playerSpan.textContent = `Current: ${this.gameState.currentPlayer}`;
        playerSpan.style.color = this.gameState.currentPlayer === CONFIG.PLAYER_YASHODA ? CONFIG.COLORS.YASHODA_ACCENT : CONFIG.COLORS.KRISHNA_ACCENT;
        playerIcon.textContent = this.gameState.currentPlayer === CONFIG.PLAYER_YASHODA ? '🧡' : '💙';
    }

    draw() {
        const isYashodaTurn = this.gameState.currentPlayer === CONFIG.PLAYER_YASHODA;
        const gradient = this.ctx.createRadialGradient(this.canvas.width / 2, this.canvas.height / 2, 0, this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7);
        if (this.gameState.gameOver) { gradient.addColorStop(0, '#1a1a2e'); gradient.addColorStop(1, CONFIG.COLORS.BACKGROUND); }
        else if (isYashodaTurn) { gradient.addColorStop(0, '#251815'); gradient.addColorStop(1, CONFIG.COLORS.YASHODA_BG); }
        else { gradient.addColorStop(0, '#0d1a28'); gradient.addColorStop(1, CONFIG.COLORS.KRISHNA_BG); }
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackgroundPattern();
        this.drawEdges();
        if (this.hoveredNode && !this.animation.active) this.drawPathPreview();
        this.drawTrail();
        this.drawNodes();
        this.drawPlayers();
    }

    drawBackgroundPattern() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.02)';
        this.ctx.lineWidth = 1;
        const cx = this.canvas.width / 2, cy = this.canvas.height / 2;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy);
            this.ctx.lineTo(cx + Math.cos(angle) * this.canvas.width, cy + Math.sin(angle) * this.canvas.height);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawEdges() {
        this.ctx.save();
        for (let [node, neighbors] of Object.entries(this.currentConfig.GRAPH)) {
            const startPos = this.currentConfig.POSITIONS[node];
            neighbors.forEach(neighbor => {
                if (parseInt(node) < neighbor) {
                    const endPos = this.currentConfig.POSITIONS[neighbor];
                    const edgeGrad = this.ctx.createLinearGradient(startPos[0], startPos[1], endPos[0], endPos[1]);
                    const offset = (this.edgeFlowOffset % 100) / 100;
                    edgeGrad.addColorStop(Math.max(0, offset - 0.1), 'rgba(255, 215, 0, 0.05)');
                    edgeGrad.addColorStop(offset, 'rgba(255, 215, 0, 0.2)');
                    edgeGrad.addColorStop(Math.min(1, offset + 0.1), 'rgba(255, 215, 0, 0.05)');
                    this.ctx.strokeStyle = edgeGrad;
                    this.ctx.lineWidth = 6;
                    this.ctx.lineCap = 'round';
                    this.ctx.beginPath();
                    this.ctx.moveTo(startPos[0], startPos[1]);
                    this.ctx.lineTo(endPos[0], endPos[1]);
                    this.ctx.stroke();
                    this.ctx.strokeStyle = CONFIG.COLORS.EDGE;
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.moveTo(startPos[0], startPos[1]);
                    this.ctx.lineTo(endPos[0], endPos[1]);
                    this.ctx.stroke();
                }
            });
        }
        this.ctx.restore();
    }

    drawTrail() {
        if (this.trailPoints.length < 2) return;
        this.ctx.save();
        const color = this.animation.player === 'yashoda' ? CONFIG.COLORS.YASHODA_ACCENT : CONFIG.COLORS.KRISHNA_ACCENT;
        for (let i = 1; i < this.trailPoints.length; i++) {
            const p = this.trailPoints[i], prev = this.trailPoints[i - 1];
            const alpha = 1 - (p.age / 25);
            if (alpha <= 0) continue;
            this.ctx.strokeStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
            this.ctx.lineWidth = 8 * alpha;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(prev.x, prev.y);
            this.ctx.lineTo(p.x, p.y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawNodes() {
        const validMoves = !this.gameState.gameOver ? this.getValidMoves(this.gameState.currentPlayer) : [];
        for (let [node, pos] of Object.entries(this.currentConfig.POSITIONS)) {
            const nodeId = parseInt(node);
            const isValidMove = validMoves.includes(nodeId);
            const isHovered = this.hoveredNode === nodeId;

            if (isValidMove && !this.gameState.gameOver) {
                const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.2;
                const glowRadius = (CONFIG.NODE_RADIUS + 15) * pulseScale;
                const gradient = this.ctx.createRadialGradient(pos[0], pos[1], CONFIG.NODE_RADIUS, pos[0], pos[1], glowRadius + 15);
                gradient.addColorStop(0, isHovered ? 'rgba(255, 215, 0, 0.7)' : 'rgba(255, 215, 0, 0.4)');
                gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
                this.ctx.beginPath();
                this.ctx.arc(pos[0], pos[1], glowRadius + 15, 0, Math.PI * 2);
                this.ctx.fillStyle = gradient;
                this.ctx.fill();

                // Rotating ring
                this.ctx.save();
                this.ctx.translate(pos[0], pos[1]);
                this.ctx.rotate(this.ringRotation);
                this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([8, 8]);
                this.ctx.beginPath();
                this.ctx.arc(0, 0, CONFIG.NODE_RADIUS + 8, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.restore();
            }

            // Mandala pattern inside node
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(pos[0], pos[1], CONFIG.NODE_RADIUS, 0, Math.PI * 2);
            this.ctx.clip();
            const nodeGrad = this.ctx.createRadialGradient(pos[0] - 10, pos[1] - 10, 0, pos[0], pos[1], CONFIG.NODE_RADIUS);
            nodeGrad.addColorStop(0, isHovered && isValidMove ? '#4a4a6a' : CONFIG.COLORS.NODE_GRADIENT_TOP);
            nodeGrad.addColorStop(1, CONFIG.COLORS.NODE_GRADIENT_BOTTOM);
            this.ctx.fillStyle = nodeGrad;
            this.ctx.fill();

            // Subtle mandala lines
            this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.08)';
            this.ctx.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                this.ctx.beginPath();
                this.ctx.moveTo(pos[0], pos[1]);
                this.ctx.lineTo(pos[0] + Math.cos(angle) * CONFIG.NODE_RADIUS, pos[1] + Math.sin(angle) * CONFIG.NODE_RADIUS);
                this.ctx.stroke();
            }
            this.ctx.restore();

            this.ctx.beginPath();
            this.ctx.arc(pos[0], pos[1], CONFIG.NODE_RADIUS, 0, Math.PI * 2);
            this.ctx.strokeStyle = isValidMove ? CONFIG.COLORS.HIGHLIGHT : CONFIG.COLORS.NODE_BORDER;
            this.ctx.lineWidth = isValidMove ? 3 : 2;
            this.ctx.stroke();

            this.ctx.fillStyle = isValidMove ? CONFIG.COLORS.HIGHLIGHT : CONFIG.COLORS.NODE_TEXT;
            this.ctx.font = `bold ${isValidMove ? '18' : '16'}px Outfit`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(node, pos[0], pos[1]);
        }
    }

    drawPathPreview() {
        const currentPos = this.gameState.currentPlayer === CONFIG.PLAYER_YASHODA ? this.gameState.yashodaPos : this.gameState.krishnaPos;
        const fromPos = this.currentConfig.POSITIONS[currentPos];
        const toPos = this.currentConfig.POSITIONS[this.hoveredNode];
        this.ctx.save();
        this.ctx.strokeStyle = CONFIG.COLORS.PATH_PREVIEW;
        this.ctx.lineWidth = 6;
        this.ctx.lineCap = 'round';
        this.ctx.setLineDash([12, 8]);
        this.ctx.lineDashOffset = -this.pulsePhase * 15;
        this.ctx.beginPath();
        this.ctx.moveTo(fromPos[0], fromPos[1]);
        this.ctx.lineTo(toPos[0], toPos[1]);
        this.ctx.stroke();
        this.ctx.restore();
        this.drawArrow(fromPos, toPos);
    }

    drawArrow(from, to) {
        const headLength = 18;
        const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
        const arrowX = to[0] - Math.cos(angle) * (CONFIG.NODE_RADIUS + 5);
        const arrowY = to[1] - Math.sin(angle) * (CONFIG.NODE_RADIUS + 5);
        this.ctx.save();
        this.ctx.fillStyle = CONFIG.COLORS.HIGHLIGHT;
        this.ctx.shadowColor = CONFIG.COLORS.HIGHLIGHT;
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX, arrowY);
        this.ctx.lineTo(arrowX - headLength * Math.cos(angle - Math.PI / 6), arrowY - headLength * Math.sin(angle - Math.PI / 6));
        this.ctx.lineTo(arrowX - headLength * Math.cos(angle + Math.PI / 6), arrowY - headLength * Math.sin(angle + Math.PI / 6));
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }

    drawPlayers() {
        if (this.animation.active) {
            if (this.animation.player === 'yashoda') {
                this.drawPlayerAtPos(this.animation.currentPos, this.assets.yashoda, CONFIG.COLORS.YASHODA_ACCENT, true);
                this.drawPlayer(this.gameState.krishnaPos, this.assets.krishna, CONFIG.COLORS.KRISHNA_ACCENT, false);
            } else {
                this.drawPlayer(this.gameState.yashodaPos, this.assets.yashoda, CONFIG.COLORS.YASHODA_ACCENT, false);
                this.drawPlayerAtPos(this.animation.currentPos, this.assets.krishna, CONFIG.COLORS.KRISHNA_ACCENT, true);
            }
        } else {
            const isYashodaTurn = this.gameState.currentPlayer === CONFIG.PLAYER_YASHODA;
            this.drawPlayer(this.gameState.yashodaPos, this.assets.yashoda, CONFIG.COLORS.YASHODA_ACCENT, isYashodaTurn);
            this.drawPlayer(this.gameState.krishnaPos, this.assets.krishna, CONFIG.COLORS.KRISHNA_ACCENT, !isYashodaTurn);
        }
    }

    drawPlayer(nodeId, image, accentColor, isActive) {
        this.drawPlayerAtPos(this.currentConfig.POSITIONS[nodeId], image, accentColor, isActive);
    }

    drawPlayerAtPos(pos, image, accentColor, isActive) {
        const size = CONFIG.NODE_RADIUS * 2;

        // Animated aura for active player
        if (isActive && !this.gameState.gameOver) {
            const auraScale = 1 + Math.sin(this.auraPhase) * 0.15;
            for (let i = 3; i > 0; i--) {
                const auraRadius = (CONFIG.NODE_RADIUS + 10 + i * 8) * auraScale;
                const alpha = 0.15 - i * 0.04;
                this.ctx.beginPath();
                this.ctx.arc(pos[0], pos[1], auraRadius, 0, Math.PI * 2);
                this.ctx.fillStyle = accentColor.replace(')', `, ${alpha})`).replace('rgb', 'rgba').replace('#', '');
                const grad = this.ctx.createRadialGradient(pos[0], pos[1], CONFIG.NODE_RADIUS, pos[0], pos[1], auraRadius);
                grad.addColorStop(0, accentColor + '40');
                grad.addColorStop(1, accentColor + '00');
                this.ctx.fillStyle = grad;
                this.ctx.fill();
            }
        }

        this.ctx.save();
        this.ctx.shadowColor = accentColor;
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        this.ctx.arc(pos[0], pos[1], CONFIG.NODE_RADIUS + 2, 0, Math.PI * 2);
        this.ctx.fillStyle = 'transparent';
        this.ctx.fill();
        this.ctx.restore();

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(pos[0], pos[1], CONFIG.NODE_RADIUS, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.clip();
        if (image.complete && image.naturalWidth > 0) this.ctx.drawImage(image, pos[0] - CONFIG.NODE_RADIUS, pos[1] - CONFIG.NODE_RADIUS, size, size);
        else { this.ctx.fillStyle = accentColor; this.ctx.fill(); }
        this.ctx.restore();

        this.ctx.beginPath();
        this.ctx.arc(pos[0], pos[1], CONFIG.NODE_RADIUS, 0, Math.PI * 2);
        this.ctx.lineWidth = isActive ? 5 : 4;
        this.ctx.strokeStyle = accentColor;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(pos[0], pos[1], CONFIG.NODE_RADIUS - 3, 0, Math.PI * 2);
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.stroke();
    }
}

window.onload = () => { new Game(); };
