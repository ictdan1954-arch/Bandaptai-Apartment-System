import { apiService } from '../../services/api.service.js';
import { formatDate, capitalize } from '../../utils/formatters.js';
import { showToast } from '../../components/toast.js';
import { CONFIG } from '../../config/constants.js';

export default async function maintenanceList(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3 class="card-title">Maintenance Requests</h3></div>
            <div class="filter-bar">
                <select class="form-select" id="m-apt"><option value="">Select Apartment</option></select>
                <select class="form-select" id="m-status"><option value="">All Status</option>${CONFIG.MAINTENANCE_STATUSES.map(s => `<option value="${s}">${capitalize(s)}</option>`).join('')}</select>
            </div>
            <div id="maintenance-table" class="table-container"><p class="text-center p-3">Select an apartment.</p></div>
        </div>`;
    const aptRes = await apiService.get('/apartments');
    if (aptRes.success) aptRes.data.forEach(a => document.getElementById('m-apt').innerHTML += `<option value="${a.id}">${a.name}</option>`);
    document.getElementById('m-apt').addEventListener('change', loadRequests);
    document.getElementById('m-status').addEventListener('change', loadRequests);
}

async function loadRequests() {
    const aptId = document.getElementById('m-apt').value;
    const status = document.getElementById('m-status').value;
    if (!aptId) return;
    try {
        const query = status ? `?status=${status}` : '';
        const response = await apiService.get(`/maintenance/apartment/${aptId}${query}`);
        const requests = response.success ? response.data : [];
        const table = document.getElementById('maintenance-table');
        if (requests.length === 0) {
            table.innerHTML = `<div class="empty-state"><h3>No requests</h3></div>`;
            return;
        }
        table.innerHTML = `<table class="table"><thead><tr><th>Title</th><th>Unit</th><th>Priority</th><th>Status</th><th>Reported</th><th>Actions</th></tr></thead><tbody>${requests.map(r => `
            <tr>
                <td>${r.title}</td><td>${r.units?.unit_number || 'N/A'}</td>
                <td><span class="badge badge-${r.priority==='high'||r.priority==='urgent'?'danger':'warning'}">${r.priority}</span></td>
                <td><span class="badge badge-${r.status==='resolved'?'success':r.status==='in_progress'?'info':'warning'}">${r.status}</span></td>
                <td>${formatDate(r.date_reported)}</td>
                <td><button class="btn btn-sm btn-outline" onclick="updateMaintenance('${r.id}','${r.status}')"><i class="fas fa-edit"></i></button></td>
            </tr>`).join('')}</tbody></table>`;
        window.updateMaintenance = updateRequest;
    } catch (e) {
        document.getElementById('maintenance-table').innerHTML = `<div class="error-state"><p>${e.message}</p></div>`;
    }
}

function updateRequest(id, currentStatus) {
    import('../../components/modal.js').then(({ showFormModal }) => {
        const form = `
            <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="m-status-update">${CONFIG.MAINTENANCE_STATUSES.map(s => `<option value="${s}" ${s===currentStatus?'selected':''}>${capitalize(s)}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Assigned To</label><input class="form-input" id="m-assign"></div>
            <div class="form-group"><label class="form-label">Cost Incurred</label><input type="number" class="form-input" id="m-cost" min="0"></div>`;
        showFormModal('Update Request', form, async (overlay) => {
            const data = {
                status: overlay.querySelector('#m-status-update').value,
                assigned_to: overlay.querySelector('#m-assign').value,
                cost_incurred: parseFloat(overlay.querySelector('#m-cost').value) || 0
            };
            try {
                await apiService.put(`/maintenance/${id}`, data);
                showToast('Updated', 'success');
                loadRequests();
            } catch (e) { showToast(e.message, 'error'); return false; }
        });
    });
}
