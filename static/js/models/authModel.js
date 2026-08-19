class AuthModel {
    static async login(username, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            return await response.json();
        } catch (error) {
            console.error("AuthModel.login Error:", error);
            return { success: false, message: "Network error occurred." };
        }
    }

    static async signup(username, password, email) {
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, email })
            });
            return await response.json();
        } catch (error) {
            console.error("AuthModel.signup Error:", error);
            return { success: false, message: "Network error occurred." };
        }
    }

    static async logout() {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error("AuthModel.logout Error:", error);
            return { success: false, message: "Network error occurred." };
        }
    }

    static async getMe() {
        try {
            const response = await fetch('/api/auth/me');
            return await response.json();
        } catch (error) {
            console.error("AuthModel.getMe Error:", error);
            return { logged_in: false };
        }
    }
}
