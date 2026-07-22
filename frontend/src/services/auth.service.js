import { apiService } from './api.service.js';
import { CONFIG } from '../config/constants.js';

class AuthService {
    constructor() {
        this.user = null;
        this.token = localStorage.getItem('rikim_token');
        this.loadUser();
    }

    // Restore user from localStorage
    loadUser() {
        const userStr = localStorage.getItem('rikim_user');
        if (userStr) {
            try {
                this.user = JSON.parse(userStr);
            } catch (e) {
                this.user = null;
            }
        }
        // Always ensure staff_role is up‑to‑date from the token (if any)
        this._mergeStaffRoleFromToken();
    }

    saveUser(user) {
        this.user = user;
        localStorage.setItem('rikim_user', JSON.stringify(user));
    }

    saveToken(token) {
        this.token = token;
        localStorage.setItem('rikim_token', token);
        // After saving a new token, immediately pull staff_role from it
        this._mergeStaffRoleFromToken();
    }

    // ---------- TOKEN DECODING ----------
    _decodeTokenPayload() {
        if (!this.token) return null;
        try {
            // JWT structure: header.payload.signature
            const payloadBase64 = this.token.split('.')[1];
            const payloadJson = atob(payloadBase64);
            return JSON.parse(payloadJson);
        } catch (e) {
            return null;
        }
    }

    _mergeStaffRoleFromToken() {
        const payload = this._decodeTokenPayload();
        if (payload && payload.staff_role) {
            if (!this.user) {
                this.user = {};
            }
            this.user.staff_role = payload.staff_role;
            // Persist the updated user object so the next page load has it
            localStorage.setItem('rikim_user', JSON.stringify(this.user));
        }
    }

    // ---------- ROLE HELPERS ----------
    getRole() {
        return this.user?.role || null;
    }

    getStaffRole() {
        return this.user?.staff_role || null;
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    // ---------- AUTH ACTIONS ----------
    async login(phone, password) {
        const response = await apiService.post(CONFIG.ENDPOINTS.AUTH.LOGIN, { phone, password });
        if (response.success) {
            this.saveToken(response.data.token);
            this.saveUser(response.data.user);
            // saveToken already calls _mergeStaffRoleFromToken, so staff_role is now set
        }
        return response;
    }

    async setup(full_name, phone, password) {
        const response = await apiService.post(CONFIG.ENDPOINTS.AUTH.SETUP, {
            full_name,
            phone,
            password,
            role: 'landlord'
        });
        if (response.success) {
            this.saveToken(response.data.token);
            this.saveUser(response.data.user);
        }
        return response;
    }

    async register(userData) {
        const response = await apiService.post(CONFIG.ENDPOINTS.AUTH.REGISTER, userData);
        return response;
    }

    async getProfile() {
        return apiService.get(CONFIG.ENDPOINTS.AUTH.PROFILE);
    }

    async getUsers() {
        return apiService.get(CONFIG.ENDPOINTS.AUTH.USERS);
    }

    logout() {
        this.user = null;
        this.token = null;
        localStorage.removeItem('rikim_token');
        localStorage.removeItem('rikim_user');
        window.location.hash = '#/login';
        window.location.reload();
    }
}

export const authService = new AuthService();
