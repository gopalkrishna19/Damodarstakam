const CONFIG = {
    SCREEN_WIDTH: 1200,
    SCREEN_HEIGHT: 800,
    NODE_RADIUS: 30,
    ANIMATION_DURATION: 300, // ms for move animation
    AI_DELAY: 500,
    COLORS: {
        BACKGROUND: '#1e2232',
        NODE: '#5a6478',
        NODE_BORDER: '#b4b4c8',
        EDGE: '#788296',
        HIGHLIGHT: '#ffeb3b',
        HIGHLIGHT_GLOW: 'rgba(255, 235, 59, 0.3)',
        PATH_PREVIEW: 'rgba(255, 235, 59, 0.5)',
        YASHODA_BG: '#ffdcdc',
        KRISHNA_BG: '#dce6ff',
        YASHODA_TEXT: '#b4283c',
        KRISHNA_TEXT: '#1e3ca0',
        TURN_TEXT: '#ffffff'
    },
    PLAYER_YASHODA: 'Yashoda',
    PLAYER_KRISHNA: 'Krishna'
};

const HARD_CONFIG = {
    TURN_LIMIT: 3000,
    YASHODA_START: 3,
    KRISHNA_START: 18,
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
    TURN_LIMIT: 2000,
    YASHODA_START: 3,
    KRISHNA_START: 15,
    GRAPH: {
        1: [2, 10, 11], 2: [1, 3], 3: [2, 4, 9, 10], 4: [3, 5], 5: [4, 6, 8, 9],
        6: [5, 7], 7: [6, 8], 8: [5, 7, 14, 15], 9: [3, 5, 13, 14], 10: [1, 3, 11, 13],
        11: [1, 10, 12], 12: [11, 13], 13: [9, 10, 12, 17], 14: [8, 9, 16, 17],
        15: [8, 16], 16: [14, 15], 17: [13, 14]
    },
    POSITIONS: {
        1: [100, 200], 2: [200, 100], 3: [300, 200], 4: [400, 100], 5: [500, 200],
        6: [600, 100], 7: [700, 200], 8: [600, 300], 9: [400, 300], 10: [200, 300],
        11: [100, 400], 12: [200, 500], 13: [300, 400], 14: [500, 400], 15: [700, 400],
        16: [600, 500], 17: [400, 500]
    }
};

// Ensure symmetry for graphs
[HARD_CONFIG, EASY_CONFIG].forEach(cfg => {
    for (let node in cfg.GRAPH) {
        node = parseInt(node);
        cfg.GRAPH[node].forEach(neighbor => {
            if (!cfg.GRAPH[neighbor]) cfg.GRAPH[neighbor] = [];
            if (!cfg.GRAPH[neighbor].includes(node)) {
                cfg.GRAPH[neighbor].push(node);
            }
        });
    }
});

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentConfig = null;
        this.gameState = {
            yashodaPos: 0,
            krishnaPos: 0,
            turnCount: 0,
            currentPlayer: '',
            gameOver: false,
            winner: null
        };

        this.isAI = false;

        // Animation state
        this.animation = {
            active: false,
            player: null, // 'yashoda' or 'krishna'
            fromPos: null,
            toPos: null,
            currentPos: null,
            startTime: null,
            duration: CONFIG.ANIMATION_DURATION
        };

        // Visual path preview - for hover state
        this.hoveredNode = null;

        // Pulsing animation for valid moves
        this.pulsePhase = 0;

        this.assets = {
            yashoda: new Image(),
            krishna: new Image()
        };
        this.assetsLoaded = 0;

        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        this.init();
    }

    init() {
        // Load assets
        this.assets.yashoda.src = 'assets/Yashoda.jpg';
        this.assets.krishna.src = 'assets/Krishna.jpg';

        const checkLoad = () => {
            this.assetsLoaded++;
            if (this.assetsLoaded === 2) {
                this.resize();
            }
        };
        this.assets.yashoda.onload = checkLoad;
        this.assets.krishna.onload = checkLoad;

        // Error handling for assets
        this.assets.yashoda.onerror = () => console.error("Failed to load Yashoda image");
        this.assets.krishna.onerror = () => console.error("Failed to load Krishna image");

        // Event Listeners
        window.addEventListener('resize', () => this.resize());

        // Click event for desktop
        this.canvas.addEventListener('click', (e) => this.handleInteraction(e));

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        // Mouse move for hover effects (path preview)
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());

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

        // Audio
        const music = document.getElementById('bg-music');
        music.volume = 0.5;
        const startAudio = () => {
            if (music.paused) music.play().catch(e => console.log("Audio play failed", e));
        };
        document.body.addEventListener('click', startAudio, { once: true });
        document.body.addEventListener('touchstart', startAudio, { once: true });

        // Start animation loop for pulsing effects
        this.startAnimationLoop();
    }

    startAnimationLoop() {
        const animate = () => {
            this.pulsePhase += 0.05;
            if (this.pulsePhase > Math.PI * 2) this.pulsePhase = 0;

            if (this.currentConfig && !this.gameState.gameOver) {
                this.draw();
            }

            if (this.animation.active) {
                this.updateAnimation();
            }

            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    resize() {
        const container = document.getElementById('game-container');
        const aspect = CONFIG.SCREEN_WIDTH / CONFIG.SCREEN_HEIGHT;
        let width = container.clientWidth;
        let height = container.clientHeight;

        if (width / height > aspect) {
            width = height * aspect;
        } else {
            height = width / aspect;
        }

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

        this.resetGame();
    }

    resetGame() {
        this.gameState = {
            yashodaPos: this.currentConfig.YASHODA_START,
            krishnaPos: this.currentConfig.KRISHNA_START,
            turnCount: 1,
            currentPlayer: CONFIG.PLAYER_YASHODA,
            gameOver: false,
            winner: null
        };
        this.animation.active = false;
        this.hoveredNode = null;
        this.updateUI();
        this.draw();
    }

    showMenu() {
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('main-menu').classList.remove('hidden');
        document.getElementById('main-menu').classList.add('active');
        document.getElementById('game-over-modal').classList.add('hidden');
    }

    getValidMoves(player) {
        const currentPos = player === CONFIG.PLAYER_YASHODA ? this.gameState.yashodaPos : this.gameState.krishnaPos;
        return this.currentConfig.GRAPH[currentPos] || [];
    }

    // Convert screen coordinates to canvas coordinates
    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    // Touch handling for mobile
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.touchStartPos = { x: touch.clientX, y: touch.clientY };
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();
        if (this.touchStartPos && e.changedTouches.length === 1) {
            const touch = e.changedTouches[0];
            const dx = Math.abs(touch.clientX - this.touchStartPos.x);
            const dy = Math.abs(touch.clientY - this.touchStartPos.y);

            // Only register as tap if finger didn't move much
            if (dx < 30 && dy < 30) {
                this.handleInteraction({
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
            }
        }
        this.touchStartPos = null;
    }

    // Mouse move for hover preview
    handleMouseMove(e) {
        if (this.gameState.gameOver || this.animation.active) return;
        if (this.isAI && this.gameState.currentPlayer === CONFIG.PLAYER_KRISHNA) return;

        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        const node = this.getNodeAtPos(coords.x, coords.y);

        if (node !== this.hoveredNode) {
            const validMoves = this.getValidMoves(this.gameState.currentPlayer);
            if (validMoves.includes(node)) {
                this.hoveredNode = node;
            } else {
                this.hoveredNode = null;
            }
        }
    }

    handleMouseLeave() {
        this.hoveredNode = null;
    }

    handleInteraction(e) {
        if (this.gameState.gameOver) return;
        if (this.animation.active) return; // Don't allow moves during animation

        // If it's AI turn, ignore clicks
        if (this.isAI && this.gameState.currentPlayer === CONFIG.PLAYER_KRISHNA) return;

        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        const clickedNode = this.getNodeAtPos(coords.x, coords.y);

        if (clickedNode) {
            const validMoves = this.getValidMoves(this.gameState.currentPlayer);
            if (validMoves.includes(clickedNode)) {
                this.makeMove(clickedNode);
            }
        }
    }

    getNodeAtPos(x, y) {
        // Increase hit area for touch devices
        const hitRadius = CONFIG.NODE_RADIUS * 1.5;

        for (let [node, pos] of Object.entries(this.currentConfig.POSITIONS)) {
            const [nx, ny] = pos;
            const dist = Math.sqrt((x - nx) ** 2 + (y - ny) ** 2);
            if (dist <= hitRadius) {
                return parseInt(node);
            }
        }
        return null;
    }

    makeMove(targetNode) {
        const isYashoda = this.gameState.currentPlayer === CONFIG.PLAYER_YASHODA;
        const currentPos = isYashoda ? this.gameState.yashodaPos : this.gameState.krishnaPos;

        // Start animation
        const fromPos = this.currentConfig.POSITIONS[currentPos];
        const toPos = this.currentConfig.POSITIONS[targetNode];

        this.animation = {
            active: true,
            player: isYashoda ? 'yashoda' : 'krishna',
            fromPos: [...fromPos],
            toPos: [...toPos],
            currentPos: [...fromPos],
            startTime: performance.now(),
            duration: CONFIG.ANIMATION_DURATION,
            targetNode: targetNode
        };

        // Clear hover when moving
        this.hoveredNode = null;
    }

    updateAnimation() {
        if (!this.animation.active) return;

        const elapsed = performance.now() - this.animation.startTime;
        const progress = Math.min(elapsed / this.animation.duration, 1);

        // Easing function (ease-out cubic)
        const eased = 1 - Math.pow(1 - progress, 3);

        this.animation.currentPos = [
            this.animation.fromPos[0] + (this.animation.toPos[0] - this.animation.fromPos[0]) * eased,
            this.animation.fromPos[1] + (this.animation.toPos[1] - this.animation.fromPos[1]) * eased
        ];

        if (progress >= 1) {
            // Animation complete
            this.completeMove(this.animation.targetNode);
            this.animation.active = false;
        }
    }

    completeMove(node) {
        if (this.gameState.currentPlayer === CONFIG.PLAYER_YASHODA) {
            this.gameState.yashodaPos = node;
            this.gameState.currentPlayer = CONFIG.PLAYER_KRISHNA;

            // Hide Monkey GIF when Yashoda moves
            const monkeyGif = document.getElementById('monkey-gif');
            if (monkeyGif) {
                monkeyGif.classList.add('hidden');
                monkeyGif.classList.remove('active');
            }
        } else {
            this.gameState.krishnaPos = node;
            this.gameState.turnCount++;
            this.gameState.currentPlayer = CONFIG.PLAYER_YASHODA;

            // Show Monkey GIF after every 3rd turn of Krishna
            if ((this.gameState.turnCount - 1) % 3 === 0) {
                const monkeyGif = document.getElementById('monkey-gif');
                if (monkeyGif) {
                    monkeyGif.classList.remove('hidden');
                    monkeyGif.classList.add('active');
                }
            }
        }

        this.checkGameOver();
        this.updateUI();
        this.draw();

        // Trigger AI if needed
        if (!this.gameState.gameOver && this.isAI && this.gameState.currentPlayer === CONFIG.PLAYER_KRISHNA) {
            setTimeout(() => this.playAITurn(), CONFIG.AI_DELAY);
        }
    }

    playAITurn() {
        if (this.gameState.gameOver) return;

        const validMoves = this.getValidMoves(CONFIG.PLAYER_KRISHNA);
        // Filter out moves that land directly on Yashoda (immediate loss)
        const safeMoves = validMoves.filter(node => node !== this.gameState.yashodaPos);

        let move;
        if (safeMoves.length === 0) {
            // No safe moves, just pick any valid move (will lose)
            move = validMoves[Math.floor(Math.random() * validMoves.length)];
        } else {
            // Filter moves where Yashoda is NOT adjacent (i.e. not in Yashoda's neighbor list)
            const yashodaNeighbors = this.currentConfig.GRAPH[this.gameState.yashodaPos] || [];
            const bestMoves = safeMoves.filter(node => !yashodaNeighbors.includes(node));

            if (bestMoves.length > 0) {
                move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
            } else {
                // Only have moves where Yashoda is adjacent
                move = safeMoves[Math.floor(Math.random() * safeMoves.length)];
            }
        }

        this.makeMove(move);
    }

    checkGameOver() {
        if (this.gameState.yashodaPos === this.gameState.krishnaPos) {
            this.gameState.gameOver = true;
            this.gameState.winner = CONFIG.PLAYER_YASHODA;
        } else if (this.gameState.turnCount > this.currentConfig.TURN_LIMIT) {
            this.gameState.gameOver = true;
            this.gameState.winner = CONFIG.PLAYER_KRISHNA;
        }

        if (this.gameState.gameOver) {
            setTimeout(() => this.showGameOver(), CONFIG.AI_DELAY);
        }
    }

    showGameOver() {
        const modal = document.getElementById('game-over-modal');
        const text = document.getElementById('winner-text');
        text.textContent = `${this.gameState.winner} Wins!`;
        text.style.color = this.gameState.winner === CONFIG.PLAYER_YASHODA ? CONFIG.COLORS.YASHODA_TEXT : CONFIG.COLORS.KRISHNA_TEXT;
        modal.classList.remove('hidden');
        modal.classList.add('active');
    }

    updateUI() {
        document.getElementById('turn-count').textContent = `Turn: ${this.gameState.turnCount} / ${this.currentConfig.TURN_LIMIT}`;
        const playerSpan = document.getElementById('current-player');
        playerSpan.textContent = `Current Turn: ${this.gameState.currentPlayer}`;
        playerSpan.style.color = this.gameState.currentPlayer === CONFIG.PLAYER_YASHODA ? CONFIG.COLORS.YASHODA_TEXT : '#4facfe';
    }

    draw() {
        // Set background based on player
        let bgColor = CONFIG.COLORS.BACKGROUND;
        if (!this.gameState.gameOver) {
            bgColor = this.gameState.currentPlayer === CONFIG.PLAYER_YASHODA ? CONFIG.COLORS.YASHODA_BG : CONFIG.COLORS.KRISHNA_BG;
        }

        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Edges
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = CONFIG.COLORS.EDGE;
        for (let [node, neighbors] of Object.entries(this.currentConfig.GRAPH)) {
            const startPos = this.currentConfig.POSITIONS[node];
            neighbors.forEach(neighbor => {
                const endPos = this.currentConfig.POSITIONS[neighbor];
                this.ctx.beginPath();
                this.ctx.moveTo(startPos[0], startPos[1]);
                this.ctx.lineTo(endPos[0], endPos[1]);
                this.ctx.stroke();
            });
        }

        // Draw path preview (edge highlight) when hovering
        if (this.hoveredNode && !this.animation.active) {
            this.drawPathPreview();
        }

        // Draw Nodes
        const validMoves = !this.gameState.gameOver ? this.getValidMoves(this.gameState.currentPlayer) : [];

        for (let [node, pos] of Object.entries(this.currentConfig.POSITIONS)) {
            const nodeId = parseInt(node);
            const isValidMove = validMoves.includes(nodeId);
            const isHovered = this.hoveredNode === nodeId;

            // Draw glow effect for valid moves
            if (isValidMove && !this.gameState.gameOver) {
                const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.15;
                const glowRadius = (CONFIG.NODE_RADIUS + 10) * pulseScale;

                // Outer glow
                const gradient = this.ctx.createRadialGradient(
                    pos[0], pos[1], CONFIG.NODE_RADIUS,
                    pos[0], pos[1], glowRadius + 10
                );
                gradient.addColorStop(0, isHovered ? 'rgba(255, 235, 59, 0.6)' : 'rgba(255, 235, 59, 0.3)');
                gradient.addColorStop(1, 'rgba(255, 235, 59, 0)');

                this.ctx.beginPath();
                this.ctx.arc(pos[0], pos[1], glowRadius + 10, 0, Math.PI * 2);
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
            }

            // Draw node
            this.ctx.beginPath();
            this.ctx.arc(pos[0], pos[1], CONFIG.NODE_RADIUS, 0, Math.PI * 2);

            // Different fill for hovered valid move
            if (isHovered && isValidMove) {
                this.ctx.fillStyle = '#7a8498';
            } else {
                this.ctx.fillStyle = CONFIG.COLORS.NODE;
            }
            this.ctx.fill();

            this.ctx.strokeStyle = isValidMove ? CONFIG.COLORS.HIGHLIGHT : CONFIG.COLORS.NODE_BORDER;
            this.ctx.lineWidth = isValidMove ? 3 : 2;
            this.ctx.stroke();

            // Node ID
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px Outfit';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(node, pos[0], pos[1]);
        }

        // Draw Players (considering animation)
        if (this.animation.active) {
            // Draw animation player at animated position
            if (this.animation.player === 'yashoda') {
                this.drawPlayerAtPos(this.animation.currentPos, this.assets.yashoda, CONFIG.COLORS.YASHODA_BG);
                this.drawPlayer(this.gameState.krishnaPos, this.assets.krishna, CONFIG.COLORS.KRISHNA_BG);
            } else {
                this.drawPlayer(this.gameState.yashodaPos, this.assets.yashoda, CONFIG.COLORS.YASHODA_BG);
                this.drawPlayerAtPos(this.animation.currentPos, this.assets.krishna, CONFIG.COLORS.KRISHNA_BG);
            }
        } else {
            this.drawPlayer(this.gameState.yashodaPos, this.assets.yashoda, CONFIG.COLORS.YASHODA_BG);
            this.drawPlayer(this.gameState.krishnaPos, this.assets.krishna, CONFIG.COLORS.KRISHNA_BG);
        }
    }

    drawPathPreview() {
        const currentPos = this.gameState.currentPlayer === CONFIG.PLAYER_YASHODA
            ? this.gameState.yashodaPos
            : this.gameState.krishnaPos;

        const fromPos = this.currentConfig.POSITIONS[currentPos];
        const toPos = this.currentConfig.POSITIONS[this.hoveredNode];

        // Draw highlighted path
        this.ctx.save();
        this.ctx.strokeStyle = CONFIG.COLORS.PATH_PREVIEW;
        this.ctx.lineWidth = 8;
        this.ctx.lineCap = 'round';
        this.ctx.setLineDash([15, 10]);

        // Animate dash offset
        this.ctx.lineDashOffset = -this.pulsePhase * 10;

        this.ctx.beginPath();
        this.ctx.moveTo(fromPos[0], fromPos[1]);
        this.ctx.lineTo(toPos[0], toPos[1]);
        this.ctx.stroke();

        this.ctx.restore();

        // Draw arrow at the end
        this.drawArrow(fromPos, toPos);
    }

    drawArrow(from, to) {
        const headLength = 15;
        const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);

        // Position arrow at edge of target node
        const arrowX = to[0] - Math.cos(angle) * CONFIG.NODE_RADIUS;
        const arrowY = to[1] - Math.sin(angle) * CONFIG.NODE_RADIUS;

        this.ctx.save();
        this.ctx.fillStyle = CONFIG.COLORS.HIGHLIGHT;
        this.ctx.beginPath();
        this.ctx.moveTo(arrowX, arrowY);
        this.ctx.lineTo(
            arrowX - headLength * Math.cos(angle - Math.PI / 6),
            arrowY - headLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            arrowX - headLength * Math.cos(angle + Math.PI / 6),
            arrowY - headLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    }

    drawPlayer(nodeId, image, fallbackColor) {
        const pos = this.currentConfig.POSITIONS[nodeId];
        this.drawPlayerAtPos(pos, image, fallbackColor);
    }

    drawPlayerAtPos(pos, image, fallbackColor) {
        const size = CONFIG.NODE_RADIUS * 2;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(pos[0], pos[1], CONFIG.NODE_RADIUS, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.clip();

        if (image.complete && image.naturalWidth > 0) {
            this.ctx.drawImage(image, pos[0] - CONFIG.NODE_RADIUS, pos[1] - CONFIG.NODE_RADIUS, size, size);
        } else {
            this.ctx.fillStyle = fallbackColor;
            this.ctx.fill();
        }

        this.ctx.restore();

        // Border for player
        this.ctx.beginPath();
        this.ctx.arc(pos[0], pos[1], CONFIG.NODE_RADIUS, 0, Math.PI * 2);
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#fff';
        this.ctx.stroke();

        // Add shadow/glow effect
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(pos[0], pos[1], CONFIG.NODE_RADIUS, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'transparent';
        this.ctx.stroke();
        this.ctx.restore();
    }
}

// Start the game
window.onload = () => {
    const game = new Game();
};
