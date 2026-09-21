// NYX login — clean, no canvas animations.
function showLoginError(form, message) {
    document.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    form.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showLoginSuccess(form, message) {
    document.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    form.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 8000);
}

async function handleLogin(email, password) {
    const loadingOverlay = document.getElementById("login-loading");
    const form = document.getElementById("login-form");

    if (!form) return;

    try {
        if (!email || !email.includes('@')) {
            throw new Error("Enter a valid email address");
        }
        if (!password) {
            throw new Error("Enter your password");
        }

        if (!window.supabaseConfig || !window.supabaseConfig.supabaseClient) {
            throw new Error("Supabase not configured properly");
        }

        const submitBtn = form.querySelector('.submit-btn');
        if (submitBtn) { submitBtn.disabled = true; }
        loadingOverlay.classList.remove("hidden");

        const { data, error } = await window.supabaseConfig.supabaseClient.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password
        });

        if (error) throw new Error(error.message);
        if (!data.user) throw new Error("Login failed");

        const { data: profile, error: profileError } = await window.supabaseConfig.supabaseClient
            .from('profiles')
            .select('nyx_name, nyx_number, status_message')
            .eq('id', data.user.id)
            .single();

        if (profileError || !profile) {
            throw new Error("Profile not found. Please register again.");
        }

        if (window.SimpleOnlineStatus) {
            try {
                window.simpleOnlineStatus = new window.SimpleOnlineStatus(window.supabaseConfig.supabaseClient);
                await window.simpleOnlineStatus.initialize();
            } catch (e) { /* non-fatal */ }
        }

        if (submitBtn) { submitBtn.disabled = false; }
        showLoginSuccess(form, `Welcome back, ${profile.nyx_name}`);

        setTimeout(() => {
            window.location.href = "chat.html";
        }, 900);

    } catch (error) {
        loadingOverlay.classList.add("hidden");
        const submitBtn = form.querySelector('.submit-btn');
        if (submitBtn) { submitBtn.disabled = false; }
        showLoginError(form, error.message || "Login failed. Please try again.");
    }
}

function initializeLoginEventListeners() {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;
            handleLogin(email, password);
        });
    }
}

document.addEventListener('DOMContentLoaded', initializeLoginEventListeners);