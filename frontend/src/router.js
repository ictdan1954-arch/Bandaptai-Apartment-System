import { authService } from './services/auth.service.js';

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.pageContent = document.getElementById('page-content');
        this.pageTitle = document.getElementById('page-title');

        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('load', () => this.handleRoute());
    }

    // Add a route configuration
    addRoute(path, config) {
        this.routes[path] = config;
    }

    // =============================================
    // SET BODY CLASS BASED ON CURRENT ROUTE
    // =============================================
    setBodyClass(path) {
        document.body.classList.remove('login-page', 'dashboard-page');
        if (path === '/login') {
            document.body.classList.add('login-page');
        } else {
            document.body.classList.add('dashboard-page');
        }
    }

    // =============================================
    // NAVIGATE TO THE CORRECT DASHBOARD BASED ON ROLE
    // =============================================
    navigateByRole() {
        const role = authService.getRole();
        const staffRole = (authService.getStaffRole() || '').toLowerCase();

        // Staff sub‑role mapping (add more as needed)
        if (role === 'staff' && staffRole) {
            const subRoleMap = {
                cleaner: '/cleaning/dashboard',
                electrician: '/electrician/dashboard',
                plumber: '/plumber/dashboard',
                gardener: '/gardener/dashboard',
                // fallback for unknown sub‑roles
            };
            const target = subRoleMap[staffRole] || '/dashboard';
            this.navigate(target);
            return;
        }

        // Main role mapping
        const roleRoutes = {
            landlord: '/dashboard',
            caretaker: '/dashboard',
            tenant: '/dashboard',
            staff: '/dashboard',   // generic staff (no sub‑role)
        };

        const route = roleRoutes[role] || '/dashboard';
        this.navigate(route);
    }

    // =============================================
    // MAIN ROUTE HANDLER
    // =============================================
    async handleRoute() {
        const hash = window.location.hash.slice(1) || '/login';
        const [path, queryString] = hash.split('?');

        // Parse query parameters
        const params = {};
        if (queryString) {
            queryString.split('&').forEach(pair => {
                const [key, value] = pair.split('=');
                params[key] = decodeURIComponent(value);
            });
        }

        // Find route definition (supports parameterized routes)
        let route = this.routes[path];
        if (!route) {
            for (const [routePath, routeConfig] of Object.entries(this.routes)) {
                const pattern = routePath.replace(/:\w+/g, '([^/]+)');
                const regex = new RegExp(`^${pattern}$`);
                const match = path.match(regex);
                if (match) {
                    route = routeConfig;
                    const paramNames = (routePath.match(/:\w+/g) || []).map(p => p.slice(1));
                    paramNames.forEach((name, index) => {
                        params[name] = match[index + 1];
                    });
                    break;
                }
            }
        }

        // No route found – redirect to login
        if (!route) {
            this.navigate('/login');
            return;
        }

        // Authentication check
        if (route.auth && !authService.isAuthenticated()) {
            this.navigate('/login');
            return;
        }

        // Role authorization (checks both main role and staff_role)
        if (route.role) {
            const userRole = authService.getRole();
            const userStaffRole = (authService.getStaffRole() || '').toLowerCase();

            const hasRole = route.role.includes(userRole) ||
                           (userStaffRole && route.role.includes(userStaffRole));

            if (!hasRole) {
                this.navigate('/login');
                return;
            }
        }

        // Update body class
        this.setBodyClass(path);

        this.currentRoute = { path, params };

        // Page title
        if (route.title) {
            this.pageTitle.textContent = route.title;
            document.title = `${route.title} - Rikim Apartments`;
        }

        // Loading indicator
        this.pageContent.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

        try {
            const module = await route.component();
            if (module.default) {
                await module.default(this.pageContent, params);
            }
        } catch (error) {
            console.error('Route error:', error);
            this.pageContent.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h2>Page Load Error</h2>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Retry</button>
                </div>
            `;
        }
    }

    // =============================================
    // NAVIGATE TO A PATH
    // =============================================
    navigate(path) {
        window.location.hash = path;
    }
}

export const router = new Router();
