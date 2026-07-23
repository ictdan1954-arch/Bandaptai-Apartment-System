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

    setBodyClass(path) {
        document.body.classList.remove('login-page', 'dashboard-page');
        if (path === '/login') {
            document.body.classList.add('login-page');
        } else {
            document.body.classList.add('dashboard-page');
        }
    }

    navigateByRole() {
        const role = authService.getRole();
        const staffRole = (authService.getStaffRole() || '').toLowerCase();

        if (role === 'staff' && staffRole) {
            const subRoleMap = {
                cleaner: '/cleaning/dashboard',
                electrician: '/electrician/dashboard',
                plumber: '/plumber/dashboard',
                gardener: '/gardener/dashboard',
            };
            const target = subRoleMap[staffRole] || '/dashboard';
            this.navigate(target);
            return;
        }

        const roleRoutes = {
            landlord: '/dashboard',
            caretaker: '/dashboard',
            tenant: '/dashboard',
            staff: '/dashboard',
        };

        const route = roleRoutes[role] || '/dashboard';
        this.navigate(route);
    }

    async handleRoute() {
        // Get the full hash (e.g., "/cleaning/dashboard#tasks")
        const rawHash = window.location.hash.slice(1) || '/login';

        // Split off query string and internal fragment
        const [pathWithFragment, queryString] = rawHash.split('?');
        const [path, fragment] = pathWithFragment.split('#');   // path = "/cleaning/dashboard", fragment = "tasks"

        // Use `path` for route matching, `fragment` is ignored by the router (but available to the component)
        const hash = path;   // keep variable name consistent with the rest of the function

        // Guard: if already logged in, never show /login
        if (hash === '/login' && authService.isAuthenticated()) {
            this.navigateByRole();
            return;
        }

        // Parse query parameters
        const params = {};
        if (queryString) {
            queryString.split('&').forEach(pair => {
                const [key, value] = pair.split('=');
                params[key] = decodeURIComponent(value);
            });
        }

        // Find route definition (supports parameterized routes)
        let route = this.routes[hash];
        if (!route) {
            for (const [routePath, routeConfig] of Object.entries(this.routes)) {
                const pattern = routePath.replace(/:\w+/g, '([^/]+)');
                const regex = new RegExp(`^${pattern}$`);
                const match = hash.match(regex);
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

        if (!route) {
            this.navigate('/login');
            return;
        }

        if (route.auth && !authService.isAuthenticated()) {
            this.navigate('/login');
            return;
        }

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

        this.setBodyClass(hash);

        this.currentRoute = { path: hash, params };

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

    navigate(path) {
        window.location.hash = path;
    }
}

export const router = new Router();
