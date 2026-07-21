import { apiService } from '../../services/api.service.js';
import { authService } from '../../services/auth.service.js';
import { formatCurrency, formatDate, capitalize } from '../../utils/formatters.js';
import { router } from '../../router.js';
import { showToast } from '../../components/toast.js';
import { openChatModal } from '../../components/chat.js';

export default async function tenantsList(container) {
    const role = authService.getRole();

    let apartments = [];
    if (role === 'landlord') {
        const aptRes = await apiService.get('/apartments');
        if (aptRes.success) apartments = aptRes.data;
    } else {
        const aptRes = await apiService.get('/apartments');
        if (aptRes.success) apartments = aptRes.data;
    }

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Tenants</h3>
                <div style="display:flex; gap:12px;">
                    <button class="btn btn-primary" onclick="window.router.navigate('/tenants/register')">
                        <i class="fas fa-plus"></i> Register Tenant
                    </button>
                </div>
            </div>
            <div class="filter-bar">
                <div class="search-bar" style="flex:1;">
                    <i class="fas fa-search"></i>
                    <input type="text" class="form-input" id="tenant-search" placeholder="Search by name or phone...">
                </div>
                ${role === 'landlord' ? `
                <div class="form-group" style="min-width:150px;">
                    <select class="form-select" id="apartment-filter">
                        <option value="">All Apartments</option>
                        ${apartments.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                    </select>
                </div>` : ''}
                <div class="form-group" style="min-width:150px;">
                    <select class="form-select" id="status-filter">
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="moved_out">Moved Out</option>
                        <option value="blacklisted">Blacklisted</option>
                    </select>
                </div>
            </div>
            <div id="tenants-summary" class="mt-2" style="display:none;"></div>
            <div id="tenants-table" class="table-container">
                <div class="page-loader"><div class="spinner"></div></div>
            </div>
        </div>`;

    const searchInput = container.querySelector('#tenant-search');
    const apartmentFilter = role === 'landlord' ? container.querySelector('#apartment-filter') : null;
    const statusFilter = container.querySelector('#status-filter');

    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadTenants, 400);
    });
    if (apartmentFilter) apartmentFilter.addEventListener('change', loadTenants);
    statusFilter.addEventListener('change', loadTenants);

    await loadTenants();

    async function loadTenants() {
        const search = searchInput.value.trim();
        const status = statusFilter.value;
        const apartmentId = apartmentFilter?.value || '';

        let query = '';
        if (status) query += `status=${status}&`;
        if (search) query += `search=${encodeURIComponent(search)}&`;
        if (apartmentId && role === 'landlord') query += `apartment_id=${apartmentId}&`;

        try {
            const response = await apiService.get(`/tenants?${query}`);
            if (!response.success) throw new Error(response.message);
            const tenants = response.data;
            const table = document.getElementById('tenants-table');
            const summaryDiv = document.getElementById('tenants-summary');

            const activeCount = tenants.filter(t => t.status === 'active').length;
            const movedOutCount = tenants.filter(t => t.status === 'moved_out').length;
            const blacklistedCount = tenants.filter(t => t.status === 'blacklisted').length;

            summaryDiv.innerHTML = `
                <div style="display:flex; gap:12px; flex-wrap:wrap;">
                    <div class="stat-card">
                        <div class="stat-icon success"><i class="fas fa-users"></i></div>
                        <div class="stat-info">
                            <div class="stat-label">Active</div>
                            <div class="stat-value">${activeCount}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon warning"><i class="fas fa-sign-out-alt"></i></div>
                        <div class="stat-info">
                            <div class="stat-label">Moved Out</div>
                            <div class="stat-value">${movedOutCount}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon danger"><i class="fas fa-ban"></i></div>
                        <div class="stat-info">
                            <div class="stat-label">Blacklisted</div>
                            <div class="stat-value">${blacklistedCount}</div>
                        </div>
                    </div>
                </div>
            `;
            summaryDiv.style.display = 'block';

            if (tenants.length === 0) {
                table.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><h3>No Tenants Found</h3></div>`;
                return;
            }

            table.innerHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Name</th><th>Phone</th><th>Unit</th><th>Rent</th>
                            <th>Deposits</th>
                            <th>Move Out</th>
                            <th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tenants.map(t => {
                            const totalDeposits = parseFloat(t.deposit_paid || 0) + parseFloat(t.water_deposit || 0) + parseFloat(t.electricity_deposit || 0);
                            const moveOutDate = t.move_out_date ? formatDate(t.move_out_date) : (t.status === 'moved_out' ? 'N/A' : '–');
                            return `
                            <tr>
                                <td><strong>${t.full_name}</strong></td>
                                <td>${t.phone}</td>
                                <td>${t.units ? `${t.units.unit_number} - ${t.units.apartments?.name || ''}` : '-'}</td>
                                <td>${formatCurrency(t.units?.monthly_rent || 0)}</td>
                                <td>${totalDeposits > 0 ? formatCurrency(totalDeposits) : '–'}</td>
                                <td>${moveOutDate}</td>
                                <td><span class="badge badge-${t.status === 'active' ? 'success' : t.status === 'moved_out' ? 'warning' : 'danger'}">${t.status}</span></td>
                                <td>
                                    <div class="table-actions">
                                        <button onclick="window.router.navigate('/tenants/${t.id}')"><i class="fas fa-eye"></i></button>
                                        <button onclick="window.editTenant('${t.id}')"><i class="fas fa-edit"></i></button>
                                        <button class="msg-tenant-btn" data-user-id="${t.user_id}" data-name="${t.full_name}" title="Message"><i class="fas fa-envelope"></i></button>
                                    </div>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>`;

            // Attach message button listeners
            document.querySelectorAll('.msg-tenant-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const userId = btn.dataset.userId;
                    const name = btn.dataset.name;
                    openChatModal(authService.user?.id, userId, name);
                });
            });

            window.editTenant = editTenant;
        } catch (error) {
            document.getElementById('tenants-table').innerHTML = `<div class="error-state"><p>${error.message}</p></div>`;
        }
    }
}

async function editTenant(id) {
    const response = await apiService.get(`/tenants/${id}`);
    if (!response.success) return;
    const t = response.data;
    const { showFormModal } = await import('../../components/modal.js');

    const showMoveOutFields = t.status === 'moved_out' || t.move_out_date;

    const formHtml = `
        <div class="form-group"><label class="form-label">Name</label><input type="text" class="form-input" id="edit-t-name" value="${t.full_name}"></div>
        <div class="form-group"><label class="form-label">Phone</label><input type="text" class="form-input" id="edit-t-phone" value="${t.phone}"></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="edit-t-status">
            <option value="active" ${t.status==='active'?'selected':''}>Active</option>
            <option value="moved_out" ${t.status==='moved_out'?'selected':''}>Moved Out</option>
            <option value="blacklisted" ${t.status==='blacklisted'?'selected':''}>Blacklisted</option>
        </select></div>
        <div class="form-group"><label class="form-label">General Deposit (KES)</label><input type="number" class="form-input" id="edit-deposit" value="${t.deposit_paid || 0}" step="100" min="0"></div>
        <div class="form-group"><label class="form-label">Water Deposit (KES)</label><input type="number" class="form-input" id="edit-water-deposit" value="${t.water_deposit || 0}" step="100" min="0"></div>
        <div class="form-group"><label class="form-label">Electricity Deposit (KES)</label><input type="number" class="form-input" id="edit-electricity-deposit" value="${t.electricity_deposit || 0}" step="100" min="0"></div>
        ${showMoveOutFields ? `
        <div class="form-group"><label class="form-label">Move Out Date</label><input type="date" class="form-input" id="edit-move-out-date" value="${t.move_out_date || ''}"></div>
        <div class="form-group"><label class="form-label">Move Out Reason</label><input type="text" class="form-input" id="edit-move-out-reason" value="${t.move_out_reason || ''}"></div>` : ''}
    `;

    showFormModal('Edit Tenant', formHtml, async (overlay) => {
        const updates = {
            full_name: overlay.querySelector('#edit-t-name').value.trim(),
            phone: overlay.querySelector('#edit-t-phone').value.trim(),
            status: overlay.querySelector('#edit-t-status').value,
            deposit_paid: parseFloat(overlay.querySelector('#edit-deposit').value) || 0,
            water_deposit: parseFloat(overlay.querySelector('#edit-water-deposit').value) || 0,
            electricity_deposit: parseFloat(overlay.querySelector('#edit-electricity-deposit').value) || 0,
        };

        if (showMoveOutFields) {
            updates.move_out_date = overlay.querySelector('#edit-move-out-date').value;
            updates.move_out_reason = overlay.querySelector('#edit-move-out-reason').value.trim();
        }

        try {
            await apiService.put(`/tenants/${id}`, updates);
            showToast('Tenant updated', 'success');
            location.reload();
        } catch (e) {
            showToast(e.message, 'error');
        }
    });
}
