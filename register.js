// NYX register — clean, no canvas animations.
function showRegisterError(form, message) {
    document.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    form.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 6000);
}

function showRegisterSuccess(form, message) {
    document.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    form.appendChild(successDiv);
}

async function handleRegister(fullName, email, password, confirmPassword) {
    const loadingOverlay = document.getElementById("register-loading");
    const form = document.getElementById("register-form");

    try {
        if (!fullName || fullName.trim() === '') {
            throw new Error("Please enter your name");
        }
        if (!email || !email.includes('@')) {
            throw new Error("Enter a valid email address");
        }
        if (!password || password.length < 6) {
            throw new Error("Password must be at least 6 characters");
        }
        if (password !== confirmPassword) {
            throw new Error("Passwords do not match");
        }

        if (!window.supabaseConfig || !window.supabaseConfig.supabaseClient) {
            throw new Error("Supabase not configured properly");
        }

        const submitBtn = form.querySelector('.submit-btn');
        if (submitBtn) { submitBtn.disabled = true; }
        loadingOverlay.classList.remove("hidden");

        const { data, error } = await window.supabaseConfig.supabaseClient.auth.signUp({
            email: email.trim().toLowerCase(),
            password
        });

        if (error) throw new Error(error.message);
        const userId = data.user?.id;
        if (!userId) {
            throw new Error("Account created — check your email to confirm before logging in.");
        }

        const { error: profileError } = await window.supabaseConfig.supabaseClient.rpc(
            'create_nyx_profile',
            { user_id: userId, user_name: fullName.trim() }
        );

        if (profileError) {
            await window.supabaseConfig.supabaseClient.auth.signOut();
            throw new Error("Could not set up your Nyx profile. Please try again.");
        }

        await window.supabaseConfig.supabaseClient.auth.signOut();

        if (submitBtn) { submitBtn.disabled = false; }
        showRegisterSuccess(form, "Account created! Log in to enter the river.");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);

    } catch (error) {
        loadingOverlay.classList.add("hidden");
        const submitBtn = form.querySelector('.submit-btn');
        if (submitBtn) { submitBtn.disabled = false; }
        showRegisterError(form, error.message || "Could not create account. Try again.");
    }
}

function initializeRegisterEventListeners() {
    const registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const fullName = document.getElementById("full-name").value;
            const email = document.getElementById("register-email").value;
            const password = document.getElementById("register-password").value;
            const confirmPassword = document.getElementById("confirm-password").value;
            handleRegister(fullName, email, password, confirmPassword);
        });
    }
}

document.addEventListener('DOMContentLoaded', initializeRegisterEventListeners);