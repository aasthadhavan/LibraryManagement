class App {
    constructor() {
        // Initialize ViewModels and pass reference to this Orchestrator
        this.authVM = new AuthViewModel(this);
        this.dashboardVM = new DashboardViewModel(this);
        this.booksVM = new BooksViewModel(this);
        this.membersVM = new MembersViewModel(this);
        this.borrowVM = new BorrowViewModel(this);
        
        this.init();
    }

    async init() {
        // Setup clock
        this.startLiveClock();
        
        // Setup Theme settings
        this.initTheme();

        // Register Hash routing listener
        window.addEventListener('hashchange', () => this.handleRouting());

        // Check if admin session is already active
        await this.authVM.checkSession();
    }

    /* Notification Management (Toasts) */
    showNotification(message, type = "info") {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconClass = "fa-circle-info";
        if (type === "success") iconClass = "fa-circle-check";
        if (type === "error") iconClass = "fa-triangle-exclamation";
        if (type === "warning") iconClass = "fa-circle-exclamation";

        toast.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${this.escapeHtml(message)}</span>
        `;
        
        container.appendChild(toast);

        // Slide out and remove toast after 4 seconds
        setTimeout(() => {
            toast.style.animation = "slideIn 0.3s ease reverse forwards";
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }

    /* Toggle Global Preloader */
    showPreloader(show) {
        const preloader = document.getElementById('preloader');
        if (!preloader) return;
        if (show) {
            preloader.classList.remove('hidden');
        } else {
            preloader.classList.add('hidden');
        }
    }

    /* Escape HTML elements for secure insertion */
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /* Theme Management */
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            this.updateThemeUI('light');
        } else {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            this.updateThemeUI('dark');
        }
    }

    toggleTheme() {
        if (document.body.classList.contains('dark-theme')) {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
            this.updateThemeUI('light');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
            this.updateThemeUI('dark');
        }
    }

    updateThemeUI(theme) {
        const icon = document.getElementById('theme-icon');
        const text = document.getElementById('theme-text');
        const navBtn = document.getElementById('nav-theme-btn');

        if (navBtn) {
            navBtn.innerHTML = theme === 'light' ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
        }

        if (!icon || !text) return;

        if (theme === 'light') {
            icon.innerHTML = '<i class="fa-solid fa-moon"></i>';
            text.innerText = 'Dark Mode';
        } else {
            icon.innerHTML = '<i class="fa-solid fa-sun"></i>';
            text.innerText = 'Light Mode';
        }
    }

    /* live clock */
    startLiveClock() {
        const clockEl = document.getElementById('live-clock');
        const updateClock = () => {
            const now = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            const dateStr = now.toLocaleDateString(undefined, options);
            const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            if (clockEl) {
                clockEl.innerHTML = `<i class="fa-solid fa-calendar-days"></i> ${dateStr} &nbsp;&bull;&nbsp; <i class="fa-solid fa-clock"></i> ${timeStr}`;
            }
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    /* Auth Session Routing hooks */
    onLoginSuccess(user) {
        if (document.getElementById('landing-container')) {
            document.getElementById('landing-container').classList.add('hidden');
        }
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('main-container').classList.remove('hidden');
        
        // Retrieve and bind librarian avatar
        const avatarName = localStorage.getItem('avatar_' + user.username) || 'Director';
        document.getElementById('admin-display-name').innerText = `${user.username} (${avatarName})`;
        
        // Redirect to dashboard if on route root or login view
        if (!window.location.hash || window.location.hash === "#login" || window.location.hash === "#home") {
            window.location.hash = "#dashboard";
        } else {
            this.handleRouting();
        }
    }

    showLoginModal() {
        window.location.hash = "#login";
    }

    showCategoryInfo(categoryName) {
        this.showNotification(`Filtering catalog for "${categoryName}"... Sign in to explore available volumes.`, "info");
        this.showLoginModal();
    }

    onLogoutSuccess() {
        document.getElementById('main-container').classList.add('hidden');
        if (document.getElementById('landing-container')) {
            document.getElementById('landing-container').classList.remove('hidden');
        }
        document.getElementById('auth-container').classList.add('hidden');
        window.location.hash = "#home";
    }

    /* Routing Management */
    async handleRouting() {
        const hash = window.location.hash || '#home';
        
        // Block pages if user is not authenticated
        if (hash !== '#home' && hash !== '#login' && !this.authVM.currentUser) {
            window.location.hash = '#home';
            return;
        }

        if ((hash === '#home' || hash === '#login') && this.authVM.currentUser) {
            window.location.hash = '#dashboard';
            return;
        }

        if (hash === '#home') {
            if (document.getElementById('landing-container')) {
                document.getElementById('landing-container').classList.remove('hidden');
            }
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('main-container').classList.add('hidden');
            return;
        }

        if (hash === '#login') {
            document.getElementById('auth-container').classList.remove('hidden');
            if (document.getElementById('landing-container')) {
                document.getElementById('landing-container').classList.add('hidden');
            }
            document.getElementById('main-container').classList.add('hidden');
            return;
        }

        // Hide landing and login page when dashboard is active
        if (document.getElementById('landing-container')) {
            document.getElementById('landing-container').classList.add('hidden');
        }
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('main-container').classList.remove('hidden');

        // Deactivate all navigation links and hide views
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));

        const views = document.querySelectorAll('.app-view');
        views.forEach(view => view.classList.add('hidden'));

        const viewTitle = document.getElementById('current-view-title');

        switch (hash) {
            case '#dashboard':
                document.getElementById('nav-dashboard').classList.add('active');
                document.getElementById('view-dashboard').classList.remove('hidden');
                viewTitle.innerHTML = '<i class="fa-solid fa-chart-line"></i> Dashboard Insights';
                this.updateBreadcrumb('Dashboard');
                await this.dashboardVM.refreshStats();
                break;
                
            case '#books':
                document.getElementById('nav-books').classList.add('active');
                document.getElementById('view-books').classList.remove('hidden');
                viewTitle.innerHTML = '<i class="fa-solid fa-book"></i> Book Catalog Inventory';
                this.updateBreadcrumb('Book Catalog');
                await this.booksVM.loadBooks();
                break;
                
            case '#members':
                document.getElementById('nav-members').classList.add('active');
                document.getElementById('view-members').classList.remove('hidden');
                viewTitle.innerHTML = '<i class="fa-solid fa-users"></i> Member Directory';
                this.updateBreadcrumb('Member Directory');
                await this.membersVM.loadMembers();
                break;
                
            case '#borrow':
                document.getElementById('nav-borrow').classList.add('active');
                document.getElementById('view-borrow').classList.remove('hidden');
                viewTitle.innerHTML = '<i class="fa-solid fa-hand-holding-hand"></i> Circulation Desk';
                this.updateBreadcrumb('Circulation Desk');
                await this.borrowVM.loadBorrowData();
                break;
                
            default:
                // Fallback to dashboard
                window.location.hash = '#dashboard';
        }
    }

    updateBreadcrumb(viewName) {
        const breadcrumbEl = document.getElementById('breadcrumb-nav');
        if (!breadcrumbEl) return;
        if (viewName === 'Dashboard') {
            breadcrumbEl.innerHTML = `<span>Portal</span> &nbsp;&gt;&nbsp; <strong>Dashboard</strong>`;
        } else {
            breadcrumbEl.innerHTML = `<a href="#dashboard">Portal</a> &nbsp;&gt;&nbsp; <strong>${viewName}</strong>`;
        }
    }
}

// Instantiate global app orchestrator
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});
