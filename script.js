// Canvas setup
const riverCanvas = document.getElementById("cosmic-river");
const tunnelCanvas = document.getElementById("star-tunnel");
const nebulaCanvas = document.getElementById("nebula-clouds");
const riverCtx = riverCanvas.getContext("2d");
const tunnelCtx = tunnelCanvas.getContext("2d");
const nebulaCtx = nebulaCanvas.getContext("2d");

// Set canvas sizes
function resizeCanvases() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    [riverCanvas, tunnelCanvas, nebulaCanvas].forEach(canvas => {
        canvas.width = width;
        canvas.height = height;
    });
}

resizeCanvases();
window.addEventListener('resize', resizeCanvases);

// Journey elements
let riverWaves = [];
let tunnelStars = [];
let nebulaClouds = [];
let debrisParticles = [];
let connectionProgress = 0;
let journeyPhase = 'starting';

// Create river waves (like The River's water flow)
function createRiverWaves() {
    riverWaves = [];
    const waveCount = 20;
    
    for (let i = 0; i < waveCount; i++) {
        riverWaves.push({
            y: (riverCanvas.height / waveCount) * i,
            amplitude: Math.random() * 30 + 20,
            frequency: Math.random() * 0.02 + 0.01,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 2 + 1,
            opacity: Math.random() * 0.3 + 0.1
        });
    }
}

// Create tunnel stars (like moving through space) - BEAUTIFUL CENTER STARS
function createTunnelStars() {
    tunnelStars = [];
    const starCount = 300; // More stars for beautiful effect
    
    for (let i = 0; i < starCount; i++) {
        tunnelStars.push({
            x: Math.random() * tunnelCanvas.width,
            y: Math.random() * tunnelCanvas.height,
            z: Math.random() * 3 + 1,
            speed: Math.random() * 5 + 2,
            opacity: Math.random() * 0.8 + 0.2,
            twinklePhase: Math.random() * Math.PI * 2,
            twinkleSpeed: Math.random() * 0.02 + 0.01,
            color: Math.random() > 0.8 ? '#B8D4FF' : 
                   Math.random() > 0.6 ? '#FFE4B5' : '#FFFFFF'
        });
    }
}

// Create nebula clouds
function createNebulaClouds() {
    nebulaClouds = [];
    for (let i = 0; i < 6; i++) {
        nebulaClouds.push({
            x: Math.random() * nebulaCanvas.width,
            y: Math.random() * nebulaCanvas.height,
            radius: Math.random() * 150 + 100,
            color: `hsla(${260 + Math.random() * 60}, 70%, 40%, 0.03)`,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            pulsePhase: Math.random() * Math.PI * 2
        });
    }
}

// Draw cosmic river
function drawRiver() {
    riverCtx.clearRect(0, 0, riverCanvas.width, riverCanvas.height);
    
    // Draw river flow
    riverWaves.forEach((wave, index) => {
        wave.phase += wave.frequency;
        
        const gradient = riverCtx.createLinearGradient(0, wave.y, 0, wave.y + 50);
        gradient.addColorStop(0, `rgba(138, 43, 226, ${wave.opacity * 0.3})`);
        gradient.addColorStop(0.5, `rgba(75, 0, 130, ${wave.opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(20, 0, 40, ${wave.opacity * 0.2})`);
        
        riverCtx.fillStyle = gradient;
        riverCtx.beginPath();
        riverCtx.moveTo(0, wave.y);
        
        for (let x = 0; x <= riverCanvas.width; x += 10) {
            const waveY = wave.y + Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
            riverCtx.lineTo(x, waveY);
        }
        
        riverCtx.lineTo(riverCanvas.width, wave.y + 50);
        riverCtx.lineTo(0, wave.y + 50);
        riverCtx.closePath();
        riverCtx.fill();
        
        // Update wave position
        wave.y += wave.speed;
        if (wave.y > riverCanvas.height) {
            wave.y = -50;
        }
    });
}

// Draw star tunnel with beautiful center stars
function drawTunnel() {
    tunnelCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    tunnelCtx.fillRect(0, 0, tunnelCanvas.width, tunnelCanvas.height);
    
    const centerX = tunnelCanvas.width / 2;
    const centerY = tunnelCanvas.height / 2;
    
    tunnelStars.forEach(star => {
        // Twinkling effect
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
        const currentOpacity = star.opacity * twinkle;
        
        // Move stars toward center (tunnel effect)
        const dx = star.x - centerX;
        const dy = star.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            star.x -= (dx / distance) * star.speed;
            star.y -= (dy / distance) * star.speed;
        }
        
        // Reset stars that go off screen
        if (star.x < 0 || star.x > tunnelCanvas.width || 
            star.y < 0 || star.y > tunnelCanvas.height) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.max(tunnelCanvas.width, tunnelCanvas.height);
            star.x = centerX + Math.cos(angle) * radius;
            star.y = centerY + Math.sin(angle) * radius;
        }
        
        // Draw star with glow
        tunnelCtx.shadowBlur = star.z * 3;
        tunnelCtx.shadowColor = star.color;
        tunnelCtx.fillStyle = star.color.replace('rgb', 'rgba').replace(')', `, ${currentOpacity})`);
        tunnelCtx.beginPath();
        tunnelCtx.arc(star.x, star.y, star.z, 0, Math.PI * 2);
        tunnelCtx.fill();
        
        // Add extra glow for bright stars
        if (star.z > 2) {
            tunnelCtx.fillStyle = star.color.replace('rgb', 'rgba').replace(')', `, ${currentOpacity * 0.3})`);
            tunnelCtx.beginPath();
            tunnelCtx.arc(star.x, star.y, star.z * 2, 0, Math.PI * 2);
            tunnelCtx.fill();
        }
        
        tunnelCtx.shadowBlur = 0;
    });
}

// Draw nebula clouds
function drawNebula() {
    nebulaCtx.clearRect(0, 0, nebulaCanvas.width, nebulaCanvas.height);
    
    nebulaClouds.forEach(cloud => {
        cloud.pulsePhase += 0.01;
        const pulse = Math.sin(cloud.pulsePhase) * 0.3 + 1;
        
        const gradient = nebulaCtx.createRadialGradient(
            cloud.x, cloud.y, 0,
            cloud.x, cloud.y, cloud.radius * pulse
        );
        gradient.addColorStop(0, cloud.color.replace('0.03', '0.06'));
        gradient.addColorStop(0.5, cloud.color);
        gradient.addColorStop(1, 'transparent');
        
        nebulaCtx.fillStyle = gradient;
        nebulaCtx.fillRect(
            cloud.x - cloud.radius * pulse,
            cloud.y - cloud.radius * pulse,
            cloud.radius * 2 * pulse,
            cloud.radius * 2 * pulse
        );
        
        // Update position
        cloud.x += cloud.vx;
        cloud.y += cloud.vy;
        
        // Wrap around screen
        if (cloud.x < -cloud.radius) cloud.x = nebulaCanvas.width + cloud.radius;
        if (cloud.x > nebulaCanvas.width + cloud.radius) cloud.x = -cloud.radius;
        if (cloud.y < -cloud.radius) cloud.y = nebulaCanvas.height + cloud.radius;
        if (cloud.y > nebulaCanvas.height + cloud.radius) cloud.y = -cloud.radius;
    });
}

// Create cosmic debris
function createCosmicDebris() {
    const debrisContainer = document.getElementById("cosmic-debris");
    
    setInterval(() => {
        if (debrisContainer.children.length < 20) {
            const debris = document.createElement("div");
            debris.className = "debris-particle";
            debris.style.left = Math.random() * 100 + "%";
            debris.style.animationDelay = Math.random() * 15 + "s";
            debris.style.animationDuration = (Math.random() * 10 + 15) + "s";
            debrisContainer.appendChild(debris);
            
            setTimeout(() => {
                if (debris.parentNode) {
                    debris.parentNode.removeChild(debris);
                }
            }, 25000);
        }
    }, 1000);
}

// Connection simulation
function simulateConnection() {
    const proxyCount = document.getElementById("proxy-count");
    const connectionBars = document.querySelectorAll(".connection-bar");
    
    const connectionInterval = setInterval(() => {
        if (connectionProgress < 2500) {
            connectionProgress += Math.floor(Math.random() * 50) + 10;
            if (connectionProgress > 2500) connectionProgress = 2500;
            
            proxyCount.textContent = connectionProgress;
            
            // Update connection bars
            const barCount = Math.floor((connectionProgress / 2500) * 5);
            connectionBars.forEach((bar, index) => {
                if (index < barCount) {
                    bar.classList.add("active");
                } else {
                    bar.classList.remove("active");
                }
            });
        } else {
            clearInterval(connectionInterval);
            setTimeout(() => {
                document.getElementById("connection-status").style.opacity = "0";
                setTimeout(() => {
                    document.getElementById("connection-status").style.display = "none";
                }, 1000);
            }, 2000);
        }
    }, 100);
}

// Journey animation
function animateJourney() {
    drawRiver();
    drawTunnel();
    drawNebula();
    requestAnimationFrame(animateJourney);
}

// Mouse interaction
document.addEventListener('mousemove', (e) => {
    const boat = document.getElementById("void-boat");
    if (boat) {
        const moveX = (e.clientX - window.innerWidth / 2) / 50;
        boat.style.transform = `translateX(calc(-50% + ${moveX}px))`;
    }
    
    // Parallax on cavern walls
    const leftWall = document.querySelector(".cavern-wall.left");
    const rightWall = document.querySelector(".cavern-wall.right");
    if (leftWall && rightWall) {
        const wallMove = (e.clientX - window.innerWidth / 2) / 100;
        leftWall.style.transform = `translateX(${wallMove}px)`;
        rightWall.style.transform = `translateX(${-wallMove}px)`;
    }
});

// Journey transition
function createJourneyTransition(callback) {
    const transition = document.createElement("div");
    transition.className = "journey-transition";
    transition.innerHTML = `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 20px; animation: spin 2s linear infinite;">⚫</div>
            <div style="font-size: 1.2rem; color: rgba(255,255,255,0.8);">Entering eternal night...</div>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(transition);
    
    setTimeout(() => {
        transition.classList.add("active");
        setTimeout(() => {
            callback();
            setTimeout(() => {
                transition.style.opacity = "0";
                setTimeout(() => {
                    document.body.removeChild(transition);
                }, 1500);
            }, 500);
        }, 2000);
    }, 100);
}

// Enter button functionality
document.getElementById("enter-nyx").addEventListener("click", function() {
    createJourneyTransition(() => {
        window.location.href = "login.html";
    });
});

// Initialize journey
function initializeJourney() {
    createRiverWaves();
    createTunnelStars();
    createNebulaClouds();
    createCosmicDebris();
    animateJourney();
    
    // Start connection simulation after delay
    setTimeout(() => {
        simulateConnection();
    }, 2000);
}

// Start journey
initializeJourney();

// Initialize simple online status if available
if (window.SimpleOnlineStatus && !window.simpleOnlineStatus) {
    window.simpleOnlineStatus = new window.SimpleOnlineStatus(window.supabaseConfig.supabaseClient);
    window.simpleOnlineStatus.initialize();
}

// Add ambient effects
setInterval(() => {
    // Random light beam intensification
    const lightBeams = document.querySelectorAll(".light-beam");
    const randomBeam = lightBeams[Math.floor(Math.random() * lightBeams.length)];
    randomBeam.style.opacity = "0.8";
    setTimeout(() => {
        randomBeam.style.opacity = "";
    }, 500);
}, 3000);

// Create initial debris
for (let i = 0; i < 10; i++) {
    setTimeout(() => {
        const debris = document.createElement("div");
        debris.className = "debris-particle";
        debris.style.left = Math.random() * 100 + "%";
        debris.style.animationDelay = Math.random() * 10 + "s";
        debris.style.animationDuration = (Math.random() * 8 + 12) + "s";
        document.getElementById("cosmic-debris").appendChild(debris);
    }, i * 200);
}