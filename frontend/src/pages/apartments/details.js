import { apiService } from '../../services/api.service.js';
import { authService } from '../../services/auth.service.js';
import { formatDate, formatCurrency } from '../../utils/formatters.js';
import { router } from '../../router.js';

export default async function apartmentDetails(container, params) {
    const id = params.id;
    container.innerHTML = `<div class="page-loader"><div class="spinner"></div></div>`;

    try {
        const response = await apiService.get(`/apartments/${id}`);
        if (!response.success) throw new Error('Apartment not found');
        const a = response.data;

        container.innerHTML = `
            <div class="mb-2">
                <button class="btn btn-outline btn-sm" onclick="window.router.navigate('/apartments')">
                    <i class="fas fa-arrow-left"></i> Back to Apartments
                </button>
            </div>
            <div class="card mb-2">
                <div class="card-header">
                    <div>
                        <h2 style="font-size:1.5rem;">${a.name}</h2>
                        <p class="text-muted">${a.location}</p>
                    </div>
                    <span class="badge badge-${a.status === 'active' ? 'success' : 'secondary'}">${a.status}</span>
                </div>
                <p>${a.description || 'No description'}</p>
                <div class="dashboard-stats mt-2" style="grid-template-columns: repeat(3,1fr);">
                    <div class="stat-card">
                        <div class="stat-icon primary"><i class="fas fa-door-open"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${a.unit_count}</div>
                            <div class="stat-label">Total Units</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon success"><i class="fas fa-users"></i></div>
                        <div class="stat-info">
                            <div class="stat-value">${a.tenant_count}</div>
                            <div class="stat-label">Active Tenants</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon info"><i class="fas fa-calendar"></i></div>
                        <div class="stat-info">
                            <div class="stat-value" style="font-size:1rem;">${formatDate(a.created_at)}</div>
                            <div class="stat-label">Date Created</div>
                        </div>
                    </div>
                </div>
            </div>
            <div style="display:flex; gap:12px;">
                <button class="btn btn-primary" onclick="window.router.navigate('/units/${a.id}')">
                    <i class="fas fa-door-open"></i> View Units
                </button>
                <button class="btn btn-outline" onclick="window.router.navigate('/payments/rent?apartment=${a.id}')">
                    <i class="fas fa-money-bill-wave"></i> Rent Payments
                </button>
            </div>`;
    } catch (error) {
        container.innerHTML = `<div class="error-state"><h2>Error</h2><p>${error.message}</p></div>`;
    }
}
