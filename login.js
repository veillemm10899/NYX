// Clean and working NYX login
let loginRiverCanvas, loginStarsCanvas;
let loginRiverCtx, loginStarsCtx;

// Initialize login canvases
function initializeLoginCanvases() {
    loginRiverCanvas = document.getElementById("login-river");
    loginStarsCanvas = document.getElementById("login-stars");
    
    if (loginRiverCanvas && loginStarsCanvas) {
        loginRiverCtx = loginRiverCanvas.getContext("2d");
        loginStarsCtx = loginStarsCanvas.getContext("2d");
        resizeLoginCanvases();
    }
}

// Resize canvases
function resizeLoginCanvases() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    if (loginRiverCanvas && loginStarsCanvas) {
        loginRiverCanvas.width = width;
        loginRiverCanvas.height = height;
        loginStarsCanvas.width = width;
        loginStarsCanvas.height = height;
    }
}

// Animation elements
let loginRiverWaves = [];
let loginStars = [];

// Create river waves
function createLoginRiverWaves() {
    loginRiverWaves = [];
    const waveCount = 15;
    
    for (let i = 0; i < waveCount; i++) {
        loginRiverWaves.push({
            y: (window.innerHeight / waveCount) * i,
            amplitude: Math.random() * 20 + 15,
            frequency: Math.random() * 0.02 + 0.01,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 1.5 + 0.5,
            opacity: Math.random() * 0.2 + 0.1
        });
    }
}

// Create stars
function createLoginStars() {
    loginStars = [];
    const starCount = 100;
    
    for (let i = 0; i < starCount; i++) {
        loginStars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.8 + 0.2,
            twinkleSpeed: Math.random() * 0.02 + 0.01,
            twinklePhase: Math.random() * Math.PI * 2
        });
    }
}

// Draw river
function drawLoginRiver() {
    if (!loginRiverCtx) return;
    
    loginRiverCtx.clearRect(0, 0, loginRiverCanvas.width, loginRiverCanvas.height);
    
    loginRiverWaves.forEach((wave, index) => {
        wave.phase += wave.frequency;
        
        const gradient = loginRiverCtx.createLinearGradient(0, wave.y, 0, wave.y + 40);
        gradient.addColorStop(0, `rgba(138, 43, 226, ${wave.opacity * 0.3})`);
        gradient.addColorStop(0.5, `rgba(75, 0, 130, ${wave.opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(20, 0, 40, ${wave.opacity * 0.2})`);
        
        loginRiverCtx.fillStyle = gradient;
        loginRiverCtx.beginPath();
        loginRiverCtx.moveTo(0, wave.y);
        
        for (let x = 0; x <= loginRiverCanvas.width; x += 10) {
            const waveY = wave.y + Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
            loginRiverCtx.lineTo(x, waveY);
        }
        
        loginRiverCtx.lineTo(loginRiverCanvas.width, wave.y + 40);
        loginRiverCtx.lineTo(0, wave.y + 40);
        loginRiverCtx.closePath();
        loginRiverCtx.fill();
        
        // Update wave position
        wave.y += wave.speed;
        if (wave.y > loginRiverCanvas.height) {
            wave.y = -40;
        }
    });
}

// Draw stars
function drawLoginStars() {
    if (!loginStarsCtx) return;
    
    loginStarsCtx.clearRect(0, 0, loginStarsCanvas.width, loginStarsCanvas.height);
    
    loginStars.forEach(star => {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
        const currentAlpha = star.alpha * twinkle;
        
        loginStarsCtx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        loginStarsCtx.beginPath();
        loginStarsCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        loginStarsCtx.fill();
        
        // Add glow for bigger stars
        if (star.size > 1.5) {
            loginStarsCtx.fillStyle = `rgba(138, 43, 226, ${currentAlpha * 0.3})`;
            loginStarsCtx.beginPath();
            loginStarsCtx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
            loginStarsCtx.fill();
        }
    });
}

// Animation loop
function animateLogin() {
    drawLoginRiver();
    drawLoginStars();
    requestAnimationFrame(animateLogin);
}

// Show error message
function showLoginError(form, message) {
    // Remove existing error
    const existingError = form.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    form.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// Show success message
function showLoginSuccess(form, message) {
    // Remove existing success
    const existingSuccess = form.querySelector('.success-message');
    if (existingSuccess) {
        existingSuccess.remove();
    }
    
    // Add new success
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    form.appendChild(successDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 5000);
}

// MAIN LOGIN FUNCTION
async function handleLogin(email, password) {
    console.log('=== LOGIN START ===');
    
    const loadingOverlay = document.getElementById("login-loading");
    const loadingText = loadingOverlay ? loadingOverlay.querySelector('.loading-text') : null;
    const form = document.getElementById("login-form");
    
    if (!loadingOverlay || !form) {
        console.error('Required elements not found');
        alert('Page elements not loaded properly');
        return;
    }
    
    try {
        // Validate inputs
        if (!email || !email.includes('@')) {
            throw new Error("Please enter a valid email address");
        }
        
        if (!password || password.length < 1) {
            throw new Error("Please enter your password");
        }
        
        console.log('✓ Validation passed');
        
        loadingOverlay.classList.remove("hidden");
        if (loadingText) {
            loadingText.textContent = "Entering eternal night...";
        }
        
        // Check if Supabase is available
        if (!window.supabaseConfig || !window.supabaseConfig.supabaseClient) {
            throw new Error("Supabase not configured properly");
        }
        
        console.log('✓ Supabase config found');
        
        // Authenticate user
        const { data, error } = await window.supabaseConfig.supabaseClient.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password
        });
        
        if (error) {
            console.error('Login error:', error);
            throw new Error(`Login failed: ${error.message}`);
        }
        
        if (!data.user || !data.user.id) {
            throw new Error("Login failed - no session created");
        }
        
        console.log('✓ User authenticated:', data.user.id);
        
        // Check if user has profile
        const { data: profile, error: profileError } = await window.supabaseConfig.supabaseClient
            .from('profiles')
            .select('nyx_name, nyx_number, status_message')
            .eq('id', data.user.id)
            .single();
            
        if (profileError || !profile) {
            console.error('Profile error:', profileError);
            throw new Error("Profile not found. Please register again.");
        }
        
        console.log('✓ Profile loaded:', profile.nyx_name);
        
        // Initialize online status
        if (window.SimpleOnlineStatus) {
            try {
                window.simpleOnlineStatus = new window.SimpleOnlineStatus(window.supabaseConfig.supabaseClient);
                await window.simpleOnlineStatus.initialize();
                console.log('✓ Online status initialized');
            } catch (statusError) {
                console.error('Online status error:', statusError);
            }
        }
        
        showLoginSuccess(form, `Welcome back ${profile.nyx_name}!`);
        
        setTimeout(() => {
            window.location.href = "chat.html";
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        loadingOverlay.classList.add("hidden");
        showLoginError(form, error.message || "Login failed. Please try again.");
    }
}

// Initialize event listeners
function initializeLoginEventListeners() {
    console.log('Initializing login event listeners...');
    
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            console.log('Login form submitted');
            e.preventDefault();
            
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;
            
            handleLogin(email, password);
        });
    } else {
        console.error('Login form not found');
    }
}

// Window resize handler
window.addEventListener('resize', () => {
    resizeLoginCanvases();
    createLoginRiverWaves();
    createLoginStars();
});

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    console.log('Login page loaded');
    initializeLoginCanvases();
    createLoginRiverWaves();
    createLoginStars();
    animateLogin();
    initializeLoginEventListeners();
});