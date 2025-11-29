// Clean and working NYX registration
let registerRiverCanvas, registerStarsCanvas;
let registerRiverCtx, registerStarsCtx;

// Initialize register canvases
function initializeRegisterCanvases() {
    registerRiverCanvas = document.getElementById("register-river");
    registerStarsCanvas = document.getElementById("register-stars");
    
    if (registerRiverCanvas && registerStarsCanvas) {
        registerRiverCtx = registerRiverCanvas.getContext("2d");
        registerStarsCtx = registerStarsCanvas.getContext("2d");
        resizeRegisterCanvases();
    }
}

// Resize canvases
function resizeRegisterCanvases() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    if (registerRiverCanvas && registerStarsCanvas) {
        registerRiverCanvas.width = width;
        registerRiverCanvas.height = height;
        registerStarsCanvas.width = width;
        registerStarsCanvas.height = height;
    }
}

// Animation elements
let registerRiverWaves = [];
let registerStars = [];

// Create river waves
function createRegisterRiverWaves() {
    registerRiverWaves = [];
    const waveCount = 15;
    
    for (let i = 0; i < waveCount; i++) {
        registerRiverWaves.push({
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
function createRegisterStars() {
    registerStars = [];
    const starCount = 100;
    
    for (let i = 0; i < starCount; i++) {
        registerStars.push({
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
function drawRegisterRiver() {
    if (!registerRiverCtx) return;
    
    registerRiverCtx.clearRect(0, 0, registerRiverCanvas.width, registerRiverCanvas.height);
    
    registerRiverWaves.forEach((wave, index) => {
        wave.phase += wave.frequency;
        
        const gradient = registerRiverCtx.createLinearGradient(0, wave.y, 0, wave.y + 40);
        gradient.addColorStop(0, `rgba(138, 43, 226, ${wave.opacity * 0.3})`);
        gradient.addColorStop(0.5, `rgba(75, 0, 130, ${wave.opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(20, 0, 40, ${wave.opacity * 0.2})`);
        
        registerRiverCtx.fillStyle = gradient;
        registerRiverCtx.beginPath();
        registerRiverCtx.moveTo(0, wave.y);
        
        for (let x = 0; x <= registerRiverCanvas.width; x += 10) {
            const waveY = wave.y + Math.sin(x * wave.frequency + wave.phase) * wave.amplitude;
            registerRiverCtx.lineTo(x, waveY);
        }
        
        registerRiverCtx.lineTo(registerRiverCanvas.width, wave.y + 40);
        registerRiverCtx.lineTo(0, wave.y + 40);
        registerRiverCtx.closePath();
        registerRiverCtx.fill();
        
        // Update wave position
        wave.y += wave.speed;
        if (wave.y > registerRiverCanvas.height) {
            wave.y = -40;
        }
    });
}

// Draw stars
function drawRegisterStars() {
    if (!registerStarsCtx) return;
    
    registerStarsCtx.clearRect(0, 0, registerStarsCanvas.width, registerStarsCanvas.height);
    
    registerStars.forEach(star => {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
        const currentAlpha = star.alpha * twinkle;
        
        registerStarsCtx.fillStyle = `rgba(255, 255, 255, ${currentAlpha})`;
        registerStarsCtx.beginPath();
        registerStarsCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        registerStarsCtx.fill();
        
        // Add glow for bigger stars
        if (star.size > 1.5) {
            registerStarsCtx.fillStyle = `rgba(138, 43, 226, ${currentAlpha * 0.3})`;
            registerStarsCtx.beginPath();
            registerStarsCtx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
            registerStarsCtx.fill();
        }
    });
}

// Animation loop
function animateRegister() {
    drawRegisterRiver();
    drawRegisterStars();
    requestAnimationFrame(animateRegister);
}

// Show error message
function showRegisterError(form, message) {
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
function showRegisterSuccess(form, message) {
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

// MAIN REGISTRATION FUNCTION
async function handleRegister(fullName, email, password, confirmPassword) {
    console.log('=== REGISTRATION START ===');
    
    const loadingOverlay = document.getElementById("register-loading");
    const loadingDetails = loadingOverlay ? loadingOverlay.querySelector('.loading-details') : null;
    const form = document.getElementById("register-form");
    
    if (!loadingOverlay || !form) {
        console.error('Required elements not found');
        alert('Page elements not loaded properly');
        return;
    }
    
    try {
        // Validate inputs
        if (!fullName || fullName.trim().length < 2) {
            throw new Error("Full name must be at least 2 characters");
        }
        
        if (!email || !email.includes('@')) {
            throw new Error("Please enter a valid email address");
        }
        
        if (password !== confirmPassword) {
            throw new Error("Passwords do not match");
        }
        
        if (password.length < 6) {
            throw new Error("Password must be at least 6 characters");
        }
        
        console.log('✓ Validation passed');
        
        loadingOverlay.classList.remove("hidden");
        if (loadingDetails) {
            loadingDetails.textContent = "Creating your account...";
        }
        
        // Check if Supabase is available
        if (!window.supabaseConfig || !window.supabaseConfig.supabaseClient) {
            throw new Error("Supabase not configured properly");
        }
        
        console.log('✓ Supabase config found');
        
        // Step 1: Create user account
        if (loadingDetails) {
            loadingDetails.textContent = "Creating your cosmic identity...";
        }
        
        const { data: signUpData, error: signUpError } = await window.supabaseConfig.supabaseClient.auth.signUp({
            email: email.trim().toLowerCase(),
            password: password,
            options: {
                data: {
                    full_name: fullName.trim()
                }
            }
        });
        
        if (signUpError) {
            console.error('Signup error:', signUpError);
            throw new Error(`Registration failed: ${signUpError.message}`);
        }
        
        if (!signUpData.user || !signUpData.user.id) {
            throw new Error("Account creation failed");
        }
        
        console.log('✓ User created:', signUpData.user.id);
        
        // Step 2: Create Nyx profile
        if (loadingDetails) {
            loadingDetails.textContent = "Assigning your Nyx name...";
        }
        
        console.log('Calling create_nyx_profile function...');
        
        const { data: nyxName, error: profileError } = await window.supabaseConfig.supabaseClient
            .rpc('create_nyx_profile', {
                user_id: signUpData.user.id,
                user_full_name: fullName.trim(),
                user_email: email.trim().toLowerCase()
            });
            
        console.log('Profile creation result:', { nyxName, profileError });
        
        if (profileError || !nyxName) {
            console.error('Profile creation error:', profileError);
            
            // Fallback: Create profile manually
            console.log('Trying manual profile creation...');
            
            // Get next number manually
            const { data: profiles } = await window.supabaseConfig.supabaseClient
                .from('profiles')
                .select('nyx_number')
                .order('nyx_number', { ascending: false })
                .limit(1);
                
            const nextNyxNumber = profiles && profiles.length > 0 ? profiles[0].nyx_number + 1 : 1;
            const fallbackNyxName = `Nyx ${nextNyxNumber}`;
            
            console.log('Creating fallback profile:', fallbackNyxName);
            
            const { data: fallbackProfile, error: fallbackError } = await window.supabaseConfig.supabaseClient
                .from('profiles')
                .insert({
                    id: signUpData.user.id,
                    full_name: fullName.trim(),
                    email: email.trim().toLowerCase(),
                    nyx_name: fallbackNyxName,
                    nyx_number: nextNyxNumber
                })
                .select()
                .single();
                
            if (fallbackError) {
                console.error('Fallback profile creation failed:', fallbackError);
                throw new Error(`Failed to create profile: ${fallbackError.message}`);
            }
            
            console.log('✓ Fallback profile created:', fallbackProfile);
            nyxName = fallbackProfile.nyx_name;
        } else {
            console.log('✓ Profile created via function:', nyxName);
        }
        
        // Step 3: Try to login
        if (loadingDetails) {
            loadingDetails.textContent = "Entering eternal night...";
        }
        
        const { error: signInError } = await window.supabaseConfig.supabaseClient.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password
        });
        
        if (signInError) {
            console.log('Auto-login failed, redirecting to login');
            showRegisterSuccess(form, `Welcome ${nyxName}! Registration successful! Please login to continue.`);
            
            setTimeout(() => {
                window.location.href = "login.html";
            }, 2500);
        } else {
            console.log('✓ Auto-login successful');
            showRegisterSuccess(form, `Welcome ${nyxName}! You have entered eternal night!`);
            
            setTimeout(() => {
                window.location.href = "chat.html";
            }, 2000);
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        loadingOverlay.classList.add("hidden");
        showRegisterError(form, error.message || "Registration failed. Please try again.");
    }
}

// Initialize event listeners
function initializeRegisterEventListeners() {
    console.log('Initializing register event listeners...');
    
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            console.log('Form submitted');
            e.preventDefault();
            
            const fullName = document.getElementById("full-name").value;
            const email = document.getElementById("register-email").value;
            const password = document.getElementById("register-password").value;
            const confirmPassword = document.getElementById("confirm-password").value;
            
            handleRegister(fullName, email, password, confirmPassword);
        });
    } else {
        console.error('Register form not found');
    }
}

// Window resize handler
window.addEventListener('resize', () => {
    resizeRegisterCanvases();
    createRegisterRiverWaves();
    createRegisterStars();
});

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    console.log('Register page loaded');
    initializeRegisterCanvases();
    createRegisterRiverWaves();
    createRegisterStars();
    animateRegister();
    initializeRegisterEventListeners();
});