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

    addRoute(path, config) {
        this.routes[path] = config;
    }

    // =============================================
    // SET BODY CLASS BASED ON CURRENT ROUTE
    // =============================================
    setBodyClass(path) {
        // Remove both classes first
        document.body.classList.remove('login-page', 'dashboard-page');
        
        // Add the appropriate class
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
        const user = authService.user;

        // Check if user is a cleaner (staff_role = 'cleaner')
        if (user?.staff_role === 'cleaner' || role === 'cleaner') {
            this.navigate('/cleaning/dashboard');
            return;
        }

        // Map roles to their dashboard routes
        const roleRoutes = {
            'landlord': '/dashboard',
            'caretaker': '/dashboard',
            'tenant': '/dashboard',
            'staff': '/dashboard'
        };

        const route = roleRoutes[role] || '/dashboard';
        this.navigate(route);
    }

    async handleRoute() {
        const hash = window.location.hash.slice(1) || '/login';
        const [path, queryString] = hash.split('?');
        
        // Parse query params
        const params = {};
        if (queryString) {
            queryString.split('&').forEach(pair => {
                const [key, value] = pair.split('=');
                params[key] = decodeURIComponent(value);
            });
        }

        // Find matching route
        let route = this.routes[path];
        if (!route) {
            // Check for parameterized routes
            for (const [routePath, routeConfig] of Object.entries(this.routes)) {
                const pattern = routePath.replace(/:\w+/g, '([^/]+)');
                const regex = new RegExp(`^${pattern}$`);
                const match = path.match(regex);
                if (match) {
                    route = routeConfig;
                    // Extract params from URL
                    const paramNames = (routePath.match(/:\w+/g) || []).map(p => p.slice(1));
                    paramNames.forEach((name, index) => {
                        params[name] = match[index + 1];
                    });
                    break;
                }
            }
        }

        if (!route) {
            this.navigate('/login');
            return;
        }

        // Check authentication
        if (route.auth && !authService.isAuthenticated()) {
            this.navigate('/login');
            return;
        }

        // Check role (support both main role and staff_role)
        if (route.role) {
            const userRole = authService.getRole();
            const userStaffRole = authService.user?.staff_role;
            
            // Allow if main role matches OR staff_role matches
            const hasRole = route.role.includes(userRole) || 
                           (userStaffRole && route.role.includes(userStaffRole));
            
            if (!hasRole) {
                this.navigate('/login');
                return;
            }
        }

        // =============================================
        // SET BODY CLASS BASED ON ROUTE
        // =============================================
        this.setBodyClass(path);

        this.currentRoute = { path, params };
        
        // Update page title
        if (route.title) {
            this.pageTitle.textContent = route.title;
            document.title = `${route.title} - Rikim Apartments`;
        }

        // Show loading
        this.pageContent.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

        try {
            // Load page
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

    navigate(path) {
        window.location.hash = path;
    }
}

export const router = new Router();
