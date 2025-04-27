document.addEventListener('DOMContentLoaded', () => {
    // Game elements
    const bird = document.getElementById('bird');
    const gameArea = document.getElementById('game-area');
    const gameMessage = document.getElementById('game-message');
    const scoreDisplay = document.getElementById('score');
    const highScoreDisplay = document.getElementById('high-score');
    const timerDisplay = document.getElementById('timer'); // Add timer display element

    // Game variables
    let gameStarted = false;
    let gameOver = false;
    let gracePeriod = true; // Add grace period flag
    let gracePeriodTimer = 3; // Timer for grace period
    let score = 0;
    let highScore = localStorage.getItem('flappyHighScore') || 0;
    let survivalTime = 0; // Variable to track survival time
    let timeInterval = null; // Interval for updating time
    let birdPosition = 50;
    let birdVelocity = 0;
    let birdAcceleration = 0.5;
    let pipes = [];
    let clouds = []; // Array to store cloud objects
    let bgBirds = []; // Array to store background bird objects
    let pipeInterval;
    let cloudInterval; // Interval for creating clouds
    let bgBirdInterval; // Interval for creating background birds
    let gravity = 0.18; // Increased from 0.12
    let jumpStrength = -3; // Adjusted jump strength
    const pipeGap = 150;
    const maxFallSpeed = 2.0; // Increased from 1.5
    let animationFrameId;
    let lastTime = 0;

    // Set high score from local storage
    highScoreDisplay.textContent = `High Score: ${highScore}`;
    timerDisplay.textContent = 'Time: 0s'; // Initialize timer display

    // Create ground element
    const ground = document.createElement('div');
    ground.classList.add('ground');
    gameArea.appendChild(ground);

    // Create sun element
    createSun();

    // Generate initial clouds
    generateInitialClouds();
    
    // Generate initial background birds
    generateInitialBgBirds();

    // Handle user input
    document.addEventListener('keydown', handleInput);
    gameArea.addEventListener('click', handleInput);
    gameArea.addEventListener('touchstart', handleInput, { passive: false }); // Add touch listener

    function handleInput(event) {
        // Prevent default touch behavior like scrolling or zooming
        if (event.type === 'touchstart') {
            event.preventDefault();
        }
        
        // Check game state and perform action
        if (!gameStarted) {
            startGame();
        } else if (!gameOver) {
            birdJump();
        } else {
            // Only allow reset if the event is specifically a keydown (Space) or click/touch
            // This prevents accidental resets from other key presses while game over screen is up
            if (event.type === 'keydown' && event.code === 'Space') {
                 resetGame();
            } else if (event.type === 'click' || event.type === 'touchstart'){
                 resetGame();
            }
        }
    }

    function startGame() {
        gameStarted = true;
        gameOver = false;
        score = 0;
        survivalTime = 0; // Reset survival time
        scoreDisplay.textContent = score;
        timerDisplay.textContent = 'Time: 0s'; // Reset timer display
        birdPosition = 50;
        birdVelocity = 0;
        bird.style.top = `${birdPosition}%`;
        gameMessage.style.display = 'none';
        
        // Clear existing pipes
        pipes.forEach(pipe => {
            gameArea.removeChild(pipe.top);
            gameArea.removeChild(pipe.bottom);
        });
        pipes = [];
        
        // Enable grace period - bird will hover in place
        gracePeriod = true;
        
        // Show a "Get Ready" message
        const readyMessage = document.createElement('div');
        readyMessage.id = 'ready-message';
        readyMessage.style.position = 'absolute';
        readyMessage.style.top = '30%';
        readyMessage.style.left = '50%';
        readyMessage.style.transform = 'translate(-50%, -50%)';
        readyMessage.style.color = 'white';
        readyMessage.style.fontSize = '28px';
        readyMessage.style.fontWeight = 'bold';
        readyMessage.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
        readyMessage.style.zIndex = '10';
        readyMessage.textContent = 'Get Ready!';
        gameArea.appendChild(readyMessage);
        
        // Set timer for grace period (1.5 seconds)
        clearTimeout(gracePeriodTimer);
        gracePeriodTimer = setTimeout(() => {
            gracePeriod = false;
            
            // Remove the ready message
            const message = document.getElementById('ready-message');
            if (message) {
                gameArea.removeChild(message);
            }
            
            // Start generating pipes after grace period
            clearInterval(pipeInterval);
            pipeInterval = setInterval(createPipe, 2000);
            
            // Start the survival timer after grace period
            clearInterval(timeInterval);
            timeInterval = setInterval(updateTimer, 1000);
        }, 1500);
        
        // Generate clouds at intervals (start immediately)
        clearInterval(cloudInterval);
        cloudInterval = setInterval(createCloud, 3000);
        
        // Generate background birds at intervals (start immediately)
        clearInterval(bgBirdInterval);
        bgBirdInterval = setInterval(createBgBird, 5000); // Birds appear less frequently than clouds
        
        // Start game loop
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        lastTime = performance.now();
        gameLoop(lastTime);
    }

    function gameLoop(timestamp) {
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        if (!gameOver) {
            updateBird(deltaTime);
            updatePipes(deltaTime);
            updateClouds(deltaTime); // Update cloud positions
            updateBgBirds(deltaTime); // Update background bird positions
            checkCollisions();
        }

        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function updateBird(deltaTime) {
        // Normalize for 60fps
        const normalizedDelta = deltaTime / 16.67;
        
        // Only apply gravity if grace period is over
        if (!gracePeriod) {
            // Apply gravity with more gentle acceleration
            birdVelocity += gravity * normalizedDelta;
            
            // Limit maximum falling speed with terminal velocity
            if (birdVelocity > maxFallSpeed) {
                birdVelocity = maxFallSpeed;
            }
            
            birdPosition += birdVelocity;
        } else {
            // During grace period, make the bird hover slightly
            birdPosition += Math.sin(Date.now() / 200) * 0.05;
        }
        
        // Keep bird within game area
        if (birdPosition < 0) {
            birdPosition = 0;
            birdVelocity = 0;
        }
        
        bird.style.top = `${birdPosition}%`;
        
        // Rotate bird based on velocity with smoother rotation and limits
        const rotation = gracePeriod ? 0 : Math.max(-30, Math.min(30, birdVelocity * 2));
        bird.style.transform = `translateY(-50%) rotate(${rotation}deg)`;
    }

    function birdJump() {
        // Allow jumps even during grace period
        birdVelocity = jumpStrength;
        
        // If the player jumps during grace period, end it early
        if (gracePeriod) {
            gracePeriod = false;
            clearTimeout(gracePeriodTimer);
            
            // Remove the ready message
            const message = document.getElementById('ready-message');
            if (message) {
                gameArea.removeChild(message);
            }
            
            // Start generating pipes immediately
            clearInterval(pipeInterval);
            pipeInterval = setInterval(createPipe, 2000);
            
            // Start the survival timer immediately if grace period is skipped
            clearInterval(timeInterval);
            timeInterval = setInterval(updateTimer, 1000);
        }
    }

    function createPipe() {
        if (gameOver) return;

        // Random height for the gap
        const randomHeight = Math.floor(Math.random() * 40) + 10; // 10% to 50% from the top
        
        // Create top pipe
        const topPipe = document.createElement('div');
        topPipe.classList.add('pipe', 'pipe-top');
        topPipe.style.height = `${randomHeight}%`;
        topPipe.style.left = '100%';
        
        // Create bottom pipe
        const bottomPipe = document.createElement('div');
        bottomPipe.classList.add('pipe', 'pipe-bottom');
        bottomPipe.style.height = `${80 - randomHeight - (pipeGap / 6.4)}%`; // Calculate bottom pipe height
        bottomPipe.style.left = '100%';
        
        // Add pipes to game area
        gameArea.appendChild(topPipe);
        gameArea.appendChild(bottomPipe);
        
        // Add pipes to pipes array
        pipes.push({
            top: topPipe,
            bottom: bottomPipe,
            position: 100,
            counted: false
        });
    }

    function updatePipes(deltaTime) {
        const speed = 0.1 * deltaTime;
        
        pipes.forEach((pipe, index) => {
            pipe.position -= speed;
            
            // Update pipe positions
            pipe.top.style.left = `${pipe.position}%`;
            pipe.bottom.style.left = `${pipe.position}%`;
            
            // Check if bird passed the pipe
            if (pipe.position < 30 && !pipe.counted) {
                score++;
                scoreDisplay.textContent = score;
                
                if (score > highScore) {
                    highScore = score;
                    highScoreDisplay.textContent = `High Score: ${highScore}`;
                    localStorage.setItem('flappyHighScore', highScore);
                }
                
                pipe.counted = true;
            }
            
            // Remove pipe when it's off screen
            if (pipe.position < -10) {
                gameArea.removeChild(pipe.top);
                gameArea.removeChild(pipe.bottom);
                pipes.splice(index, 1);
            }
        });
    }

    function checkCollisions() {
        const birdRect = bird.getBoundingClientRect();
        const groundRect = ground.getBoundingClientRect();
        
        // Check ground collision
        if (birdRect.bottom >= groundRect.top) {
            endGame();
            return;
        }
        
        // Check pipe collisions
        pipes.forEach(pipe => {
            const topPipeRect = pipe.top.getBoundingClientRect();
            const bottomPipeRect = pipe.bottom.getBoundingClientRect();
            
            if (
                (birdRect.right > topPipeRect.left && 
                 birdRect.left < topPipeRect.right && 
                 birdRect.top < topPipeRect.bottom) || 
                (birdRect.right > bottomPipeRect.left && 
                 birdRect.left < bottomPipeRect.right && 
                 birdRect.bottom > bottomPipeRect.top)
            ) {
                endGame();
            }
        });
    }

    function generateInitialClouds() {
        // Create some initial clouds at random positions
        for (let i = 0; i < 5; i++) {
            createCloud(true);
        }
    }

    function createCloud(isInitial = false) {
        // Skip cloud creation when game is over
        if (gameOver && !isInitial) return;
        
        // Create cloud element
        const cloud = document.createElement('div');
        cloud.classList.add('cloud');
        
        // Random cloud size
        const cloudSizes = ['cloud-small', 'cloud-medium', 'cloud-large'];
        const size = cloudSizes[Math.floor(Math.random() * cloudSizes.length)];
        cloud.classList.add(size);
        
        // Position the cloud
        const posY = Math.random() * 60; // Random vertical position (top 60% of screen)
        let posX;
        
        if (isInitial) {
            // For initial clouds, distribute across the screen
            posX = Math.random() * 100;
        } else {
            // For new clouds, start from the right edge
            posX = 100;
        }
        
        cloud.style.top = `${posY}%`;
        cloud.style.left = `${posX}%`;
        
        // Add some randomness to cloud appearance
        cloud.style.opacity = (0.6 + Math.random() * 0.4).toString(); // Between 0.6 and 1.0
        
        // Add cloud to game area
        gameArea.appendChild(cloud);
        
        // Add cloud to clouds array with speed property
        clouds.push({
            element: cloud,
            position: posX,
            speed: 0.01 + Math.random() * 0.03 // Random speed between 0.01 and 0.04
        });
    }

    function updateClouds(deltaTime) {
        // Move each cloud from right to left
        clouds.forEach((cloud, index) => {
            cloud.position -= cloud.speed * deltaTime;
            cloud.element.style.left = `${cloud.position}%`;
            
            // Remove cloud when it's off screen
            if (cloud.position < -20) {
                gameArea.removeChild(cloud.element);
                clouds.splice(index, 1);
            }
        });
    }

    function generateInitialBgBirds() {
        // Create some initial background birds
        for (let i = 0; i < 3; i++) {
            createBgBird(true);
        }
    }

    function createBgBird(isInitial = false) {
        // Skip creation when game is over
        if (gameOver && !isInitial) return;
        
        // Create background bird element
        const bgBird = document.createElement('div');
        bgBird.classList.add('bg-bird');
        
        // Position the bird
        const posY = Math.random() * 50 + 5; // Random vertical position (top 5% to 55% of screen)
        let posX = isInitial ? Math.random() * 100 : 100; // Start from right edge or random if initial
        
        bgBird.style.top = `${posY}%`;
        bgBird.style.left = `${posX}%`;
        
        // Add random delay to animation to desynchronize flapping
        bgBird.style.animationDelay = `-${Math.random() * 0.8}s`;
        
        // Add bird to game area
        gameArea.appendChild(bgBird);
        
        // Add bird to bgBirds array with speed property
        bgBirds.push({
            element: bgBird,
            position: posX,
            speed: 0.05 + Math.random() * 0.05 // Random speed between 0.05 and 0.1 (faster than clouds)
        });
    }

    function updateBgBirds(deltaTime) {
        // Move each background bird from right to left
        bgBirds.forEach((bgBird, index) => {
            bgBird.position -= bgBird.speed * deltaTime;
            bgBird.element.style.left = `${bgBird.position}%`;
            
            // Remove bird when it's off screen
            if (bgBird.position < -10) {
                gameArea.removeChild(bgBird.element);
                bgBirds.splice(index, 1);
            }
        });
    }

    function updateTimer() {
        if (!gameOver && gameStarted) {
            survivalTime++;
            timerDisplay.textContent = `Time: ${survivalTime}s`;
        }
    }

    function endGame() {
        gameOver = true;
        clearInterval(pipeInterval);
        clearInterval(cloudInterval);
        clearInterval(bgBirdInterval); // Stop generating background birds
        clearInterval(timeInterval); // Stop the timer
        
        // Create retry screen element
        const retryScreen = document.createElement('div');
        retryScreen.classList.add('retry-screen');
        retryScreen.id = 'retry-screen';
        
        // New score achievement text
        let achievementText = '';
        if (score > 0) {
            if (score > highScore) {
                achievementText = 'New High Score!';
            } else if (score > highScore * 0.8) {
                achievementText = 'Almost beat your record!';
            } else if (score >= 10) {
                achievementText = 'Great job!';
            } else if (score >= 5) {
                achievementText = 'Getting better!';
            } else {
                achievementText = 'Keep practicing!';
            }
        } else {
            achievementText = 'Try again!';
        }
        
        retryScreen.innerHTML = `
            <h2>Game Over</h2>
            <p>${achievementText}</p>
            <div class="score-display">Score: ${score}</div>
            <p>Time Survived: ${survivalTime}s</p>
            <p>High Score: ${highScore}</p>
            <button class="retry-button" id="retry-button">Play Again</button>
        `;
        
        // Add retry screen to game area
        gameArea.appendChild(retryScreen);
        
        // Hide the default game message
        gameMessage.style.display = 'none';
        
        // Add event listener to retry button (already handles click/touch via handleInput)
        const retryButton = document.getElementById('retry-button');
        // retryButton.addEventListener('click', resetGame); // No longer needed, handled by gameArea listener
        
        // Keep the space key functionality for retry screen
        // document.removeEventListener('keydown', handleInput); // Keep handleInput active
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && gameOver) {
                // Check if retry screen exists before resetting
                 const retryScreen = document.getElementById('retry-screen');
                 if(retryScreen){
                    resetGame();
                 } 
            }
        }, { once: true }); 
    }

    function resetGame() {
        gameStarted = false;
        
        // Remove retry screen if it exists
        const retryScreen = document.getElementById('retry-screen');
        if (retryScreen) {
            gameArea.removeChild(retryScreen);
        }
        
        // Reset the game message
        gameMessage.style.display = 'flex';
        gameMessage.innerHTML = '<p>Press SPACE to start</p>';
        
        // Reset bird position and rotation
        bird.style.transform = 'translateY(-50%)';
        
        // Start a new game
        startGame();
    }

    function createSun() {
        const sun = document.createElement('div');
        sun.classList.add('sun');
        
        // Add a little randomness to sun position
        const topPosition = 30 + Math.random() * 20; // Between 30-50px from top
        const rightPosition = 30 + Math.random() * 30; // Between 30-60px from right
        
        sun.style.top = `${topPosition}px`;
        sun.style.right = `${rightPosition}px`;
        
        // Add sun to game area (add it before clouds so clouds can sometimes overlap it)
        gameArea.appendChild(sun);
    }
}); 
