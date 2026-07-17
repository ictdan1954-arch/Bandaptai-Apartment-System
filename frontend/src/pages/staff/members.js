import { apiService } from '../../services/api.service.js';
import { formatCurrency, formatDate, capitalize } from '../../utils/formatters.js';
import { showToast } from '../../components/toast.js';

export default async function staffMembers(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3 class="card-title">Staff Members</h3><button class="btn btn-primary" id="add-member-btn"><i class="fas fa-plus"></i> Add Member</button></div>
            <div class="filter-bar">
                <select class="form-select" id="filter-apt"><option value="">All Apartments</option></select>
                <select class="form-select" id="filter-role"><option value="">All Roles</option></select>
            </div>
            <div id="members-table" class="table-container"><div class="page-loader"><div class="spinner"></div></div></div>
        </div>`;

    const [aptRes, rolesRes] = await Promise.all([apiService.get('/apartments'), apiService.get('/staff/roles')]);
    if (aptRes.success) aptRes.data.forEach(a => document.getElementById('filter-apt').innerHTML += `<option value="${a.id}">${a.name}</option>`);
    if (rolesRes.success) rolesRes.data.forEach(r => document.getElementById('filter-role').innerHTML += `<option value="${r.id}">${r.role_name}</option>`);
    document.getElementById('filter-apt').addEventListener('change', loadMembers);
    document.getElementById('filter-role').addEventListener('change', loadMembers);
    document.getElementById('add-member-btn').addEventListener('click', openAddModal);
    await loadMembers();
}

async function loadMembers() {
    const aptId = document.getElementById('filter-apt').value;
    const roleId = document.getElementById('filter-role').value;
    // Simplified: load all apartments? We'll need to iterate apartments if no filter. But for now, require apartment selection
    if (!aptId) {
        document.getElementById('members-table').innerHTML = `<p class="text-center p-3">Select an apartment to view staff.</p>`;
        return;
    }
    let query = `apartment/${aptId}`;
    if (roleId) query += `?role_id=${roleId}`;
    try {
        const response = await apiService.get(`/staff/members/${query}`);
        const members = response.success ? response.data : [];
        const table = document.getElementById('members-table');
        if (members.length === 0) {
            table.innerHTML = `<div class="empty-state"><h3>No staff members</h3></div>`;
            return;
        }
        table.innerHTML = `<table class="table"><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Salary</th><th>Status</th><th>Actions</th></tr></thead><tbody>${members.map(m => `
            <tr><td>${m.full_name}</td><td>${m.staff_roles?.role_name || 'N/A'}</td><td>${m.phone}</td><td>${formatCurrency(m.monthly_salary)}</td><td><span class="badge badge-${m.status==='active'?'success':'danger'}">${m.status}</span></td>
            <td><button class="btn btn-sm btn-outline" onclick="paySalary('${m.id}','${m.full_name}','${aptId}')"><i class="fas fa-money-bill"></i></button></td></tr>`).join('')}</tbody></table>`;
        window.paySalary = paySalary;
    } catch (e) {
        document.getElementById('members-table').innerHTML = `<div class="error-state"><p>${e.message}</p></div>`;
    }
}

async function openAddModal() {
    const { showFormModal } = await import('../../components/modal.js');
    const [aptRes, rolesRes] = await Promise.all([apiService.get('/apartments'), apiService.get('/staff/roles')]);
    const formHtml = `
        <div class="form-group"><label class="form-label">Apartment</label><select class="form-select" id="mem-apt">${aptRes.data?.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Role</label><select class="form-select" id="mem-role">${rolesRes.data?.map(r => `<option value="${r.id}">${r.role_name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="mem-name"></div>
        <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="mem-phone"></div>
        <div class="form-group"><label class="form-label">Monthly Salary</label><input type="number" class="form-input" id="mem-salary" min="0"></div>
        <div class="form-group"><label class="form-label">Date Hired</label><input type="date" class="form-input" id="mem-date" value="${new Date().toISOString().split('T')[0]}"></div>`;
    showFormModal('Add Staff Member', formHtml, async (overlay) => {
        const data = {
            apartment_id: overlay.querySelector('#mem-apt').value,
            staff_role_id: overlay.querySelector('#mem-role').value,
            full_name: overlay.querySelector('#mem-name').value,
            phone: overlay.querySelector('#mem-phone').value,
            monthly_salary: parseFloat(overlay.querySelector('#mem-salary').value),
            date_hired: overlay.querySelector('#mem-date').value
        };
        if (!data.full_name || !data.phone || !data.monthly_salary) {
            showToast('Fill required fields', 'error');
            return false;
        }
        try {
            await apiService.post('/staff/members', data);
            showToast('Member added', 'success');
            loadMembers();
        } catch (e) { showToast(e.message, 'error'); return false; }
    });
}

function paySalary(staffId, name, aptId) {
    import('../../components/modal.js').then(({ showFormModal }) => {
        const form = `<p>Record salary for <strong>${name}</strong></p>
            <div class="form-group"><label class="form-label">Amount</label><input type="number" class="form-input" id="sal-amount" min="1"></div>
            <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="sal-date" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group"><label class="form-label">Period Start</label><input type="date" class="form-input" id="sal-start"></div>
            <div class="form-group"><label class="form-label">Period End</label><input type="date" class="form-input" id="sal-end"></div>
            <div class="form-group"><label class="form-label">Method</label><select class="form-select" id="sal-method"><option>cash</option><option>mpesa</option><option>bank</option></select></div>`;
        showFormModal('Pay Salary', form, async (overlay) => {
            const data = {
                staff_id: staffId,
                apartment_id: aptId,
                amount_paid: parseFloat(overlay.querySelector('#sal-amount').value),
                payment_date: overlay.querySelector('#sal-date').value,
                period_start: overlay.querySelector('#sal-start').value,
                period_end: overlay.querySelector('#sal-end').value,
                payment_method: overlay.querySelector('#sal-method').value
            };
            if (!data.amount_paid) { showToast('Amount required', 'error'); return false; }
            try {
                await apiService.post('/staff/salaries', data);
                showToast('Salary recorded', 'success');
            } catch (e) { showToast(e.message, 'error'); return false; }
        });
    });
}
