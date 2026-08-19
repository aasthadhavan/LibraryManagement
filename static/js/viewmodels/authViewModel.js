class AuthViewModel {
    constructor(app) {
        this.app = app;
        this.currentUser = null;
        this.currentTab = 'login'; // 'login' or 'signup'
    }

    switchTab(tab) {
        this.currentTab = tab;
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const tabLogin = document.getElementById('tab-login');
        const tabSignup = document.getElementById('tab-signup');
        const authIllustration = document.getElementById('auth-illustration');
        const authBreadcrumb = document.getElementById('auth-breadcrumb-active');

        if (tab === 'login') {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            tabLogin.classList.add('active');
            tabSignup.classList.remove('active');
            if (authIllustration) {
                authIllustration.src = 'images/library_login.png';
            }
            if (authBreadcrumb) {
                authBreadcrumb.innerText = 'Sign In';
            }
        } else {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            tabLogin.classList.remove('active');
            tabSignup.classList.add('active');
            if (authIllustration) {
                authIllustration.src = 'images/library_register.png';
            }
            if (authBreadcrumb) {
                authBreadcrumb.innerText = 'Register';
            }
        }
    }

    async checkSession() {
        this.app.showPreloader(true);
        const data = await AuthModel.getMe();
        this.app.showPreloader(false);
        if (data.logged_in) {
            this.currentUser = data.user;
            this.app.onLoginSuccess(this.currentUser);
        } else {
            this.currentUser = null;
            this.app.onLogoutSuccess();
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        if (!username || !password) {
            this.app.showNotification("Please enter both username and password.", "warning");
            return;
        }

        this.app.showPreloader(true);
        const result = await AuthModel.login(username, password);
        this.app.showPreloader(false);

        if (result.success) {
            this.currentUser = result.user;
            usernameInput.value = "";
            passwordInput.value = "";
            this.app.showNotification(result.message, "success");
            this.app.onLoginSuccess(this.currentUser);
        } else {
            this.app.showNotification(result.message || "Invalid credentials.", "error");
        }
    }

    async handleSignup(event) {
        event.preventDefault();
        const usernameInput = document.getElementById('signup-username');
        const emailInput = document.getElementById('signup-email');
        const passwordInput = document.getElementById('signup-password');
        const avatarInput = document.getElementById('signup-avatar');

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const avatar = avatarInput ? avatarInput.value : '📚';

        if (!username || !email || !password) {
            this.app.showNotification("All signup fields are required.", "warning");
            return;
        }
        if (password.length < 8) {
            this.app.showNotification("Password must be at least 8 characters long.", "warning");
            return;
        }

        this.app.showPreloader(true);
        const result = await AuthModel.signup(username, password, email);
        this.app.showPreloader(false);

        if (result.success) {
            // Save selected avatar preference locally for this username
            localStorage.setItem('avatar_' + username, avatar);
            
            this.app.showNotification(`${result.message} Avatar ${avatar} linked!`, "success");
            usernameInput.value = "";
            emailInput.value = "";
            passwordInput.value = "";
            this.switchTab('login');
        } else {
            this.app.showNotification(result.message || "Registration failed.", "error");
        }
    }

    selectAvatar(element, emoji) {
        // Clear active class from siblings
        const options = document.querySelectorAll('.avatar-option');
        options.forEach(opt => opt.classList.remove('active'));
        
        // Mark current as active
        element.classList.add('active');
        
        // Update hidden field value
        const avatarInput = document.getElementById('signup-avatar');
        if (avatarInput) {
            avatarInput.value = emoji;
        }
    }

    async handleLogout() {
        this.app.showPreloader(true);
        const result = await AuthModel.logout();
        this.app.showPreloader(false);

        if (result.success) {
            this.currentUser = null;
            this.app.showNotification(result.message, "success");
            this.app.onLogoutSuccess();
        } else {
            this.app.showNotification("Failed to logout.", "error");
        }
    }
}
