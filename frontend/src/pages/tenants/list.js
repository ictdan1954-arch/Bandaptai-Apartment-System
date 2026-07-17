import { apiService } from '../../services/api.service.js';
import { authService } from '../../services/auth.service.js';
import { formatCurrency, formatDate, capitalize } from '../../utils/formatters.js';
import { router } from '../../router.js';
import { showToast } from '../../components/toast.js';

export default async function tenantsList(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Tenants</h3>
                <div style="display:flex; gap:12px;">
                    <div class="search-bar">
                        <i class="fas fa-search"></i>
                        <input type="text" class="form-input" id="tenant-search" placeholder="Search...">
                    </div>
                    <button class="btn btn-primary" onclick="window.router.navigate('/tenants/register')">
                        <i class="fas fa-plus"></i> Register Tenant
                    </button>
                </div>
            </div>
            <div id="tenants-table" class="table-container">
                <div class="page-loader"><div class="spinner"></div></div>
            </div>
        </div>`;

    await loadTenants();
    document.getElementById('tenant-search').addEventListener('input', debounce(loadTenants, 400));
}

async function loadTenants(search = '') {
    try {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const response = await apiService.get(`/tenants${query}`);
        if (!response.success) throw new Error(response.message);
        const tenants = response.data;
        const table = document.getElementById('tenants-table');

        if (tenants.length === 0) {
            table.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><h3>No Tenants</h3></div>`;
            return;
        }

        table.innerHTML = `
            <table class="table">
                <thead>
                    <tr><th>Name</th><th>Phone</th><th>Unit</th><th>Rent</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                    ${tenants.map(t => `
                        <tr>
                            <td><strong>${t.full_name}</strong></td>
                            <td>${t.phone}</td>
                            <td>${t.units ? `${t.units.unit_number} - ${t.units.apartments?.name || ''}` : '-'}</td>
                            <td>${formatCurrency(t.units?.monthly_rent || 0)}</td>
                            <td><span class="badge badge-${t.status === 'active' ? 'success' : t.status === 'moved_out' ? 'secondary' : 'danger'}">${t.status}</span></td>
                            <td>
                                <div class="table-actions">
                                    <button onclick="window.router.navigate('/tenants/${t.id}')"><i class="fas fa-eye"></i></button>
                                    <button onclick="editTenant('${t.id}')"><i class="fas fa-edit"></i></button>
                                </div>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
        window.editTenant = editTenant;
    } catch (error) {
        document.getElementById('tenants-table').innerHTML = `<div class="error-state"><p>${error.message}</p></div>`;
    }
}

async function editTenant(id) {
    const response = await apiService.get(`/tenants/${id}`);
    if (!response.success) return;
    const t = response.data;
    const { showFormModal } = await import('../../components/modal.js');
    const formHtml = `
        <div class="form-group"><label class="form-label">Name</label><input type="text" class="form-input" id="edit-t-name" value="${t.full_name}"></div>
        <div class="form-group"><label class="form-label">Phone</label><input type="text" class="form-input" id="edit-t-phone" value="${t.phone}"></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="edit-t-status">
            <option value="active" ${t.status==='active'?'selected':''}>Active</option>
            <option value="moved_out" ${t.status==='moved_out'?'selected':''}>Moved Out</option>
            <option value="blacklisted" ${t.status==='blacklisted'?'selected':''}>Blacklisted</option>
        </select></div>`;
    showFormModal('Edit Tenant', formHtml, async (overlay) => {
        const updates = {
            full_name: overlay.querySelector('#edit-t-name').value,
            phone: overlay.querySelector('#edit-t-phone').value,
            status: overlay.querySelector('#edit-t-status').value
        };
        await apiService.put(`/tenants/${id}`, updates);
        showToast('Tenant updated', 'success');
        loadTenants();
    });
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
