import { apiService } from '../../services/api.service.js';
import { authService } from '../../services/auth.service.js';
import { formatCurrency, formatDate, capitalize } from '../../utils/formatters.js';
import { showToast } from '../../components/toast.js';

export default async function staffSalaries(container) {
    const role = authService.getRole();
    let apartments = [];
    let defaultAptId = null;
    let defaultAptName = '';

    // Caretaker: fetch assigned apartment(s)
    if (role === 'caretaker') {
        const aptRes = await apiService.get('/apartments');
        if (aptRes.success && aptRes.data.length > 0) {
            apartments = aptRes.data;
            defaultAptId = apartments[0].id;
            defaultAptName = apartments[0].name;
        }
    } else {
        const aptRes = await apiService.get('/apartments');
        apartments = aptRes.success ? aptRes.data : [];
    }

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Staff Salary Payments${defaultAptName ? ` – ${defaultAptName}` : ''}</h3>
                <button class="btn btn-primary" id="record-salary-btn">
                    <i class="fas fa-plus"></i> Record Salary Payment
                </button>
            </div>
            <div class="filter-bar">
                ${role === 'landlord' ? `
                <div class="form-group">
                    <select class="form-select" id="filter-apartment">
                        <option value="">Select Apartment</option>
                        ${apartments.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                    </select>
                </div>` : `
                <div class="form-group">
                    <input type="hidden" id="filter-apartment" value="${defaultAptId}">
                    <p class="text-muted" style="margin:0; padding-top:8px;">
                        Showing salaries for <strong>${defaultAptName}</strong>
                    </p>
                </div>`}
                <div class="form-group">
                    <select class="form-select" id="filter-staff">
                        <option value="">All Staff</option>
                    </select>
                </div>
                <div class="form-group">
                    <input type="date" class="form-input" id="filter-start" placeholder="Start date">
                </div>
                <div class="form-group">
                    <input type="date" class="form-input" id="filter-end" placeholder="End date">
                </div>
                <div class="form-group">
                    <button class="btn btn-sm btn-outline" id="btn-this-month">This Month</button>
                    <button class="btn btn-sm btn-outline" id="btn-last-month">Last Month</button>
                </div>
                <div class="search-bar" style="flex:1;">
                    <i class="fas fa-search"></i>
                    <input type="text" class="form-input" id="salary-search" placeholder="Search staff name...">
                </div>
            </div>
            <div id="salaries-summary" class="mt-2" style="display:none;"></div>
            <div id="salaries-table" class="table-container">
                <div class="page-loader"><div class="spinner"></div></div>
            </div>
        </div>`;

    const aptSelect = container.querySelector('#filter-apartment');
    const staffSelect = container.querySelector('#filter-staff');
    const startInput = container.querySelector('#filter-start');
    const endInput = container.querySelector('#filter-end');
    const searchInput = container.querySelector('#salary-search');
    const btnThisMonth = container.querySelector('#btn-this-month');
    const btnLastMonth = container.querySelector('#btn-last-month');
    const recordBtn = container.querySelector('#record-salary-btn');
    const salariesTable = container.querySelector('#salaries-table');
    const summaryDiv = container.querySelector('#salaries-summary');

    // Load staff options when apartment changes
    async function loadStaffOptions(apartmentId) {
        staffSelect.innerHTML = '<option value="">All Staff</option>';
        if (!apartmentId) return;
        try {
            const res = await apiService.get(`/staff/members/apartment/${apartmentId}`);
            if (res.success && res.data.length > 0) {
                res.data.forEach(member => {
                    staffSelect.innerHTML += `<option value="${member.id}">${member.full_name} (${member.staff_roles?.role_name || 'N/A'})</option>`;
                });
            }
        } catch (e) {}
    }

    if (role === 'landlord') {
        aptSelect.addEventListener('change', () => {
            const aptId = aptSelect.value;
            if (aptId) loadStaffOptions(aptId);
            else staffSelect.innerHTML = '<option value="">All Staff</option>';
            loadSalaries();
        });
    } else {
        if (defaultAptId) loadStaffOptions(defaultAptId);
    }

    staffSelect.addEventListener('change', loadSalaries);
    startInput.addEventListener('change', loadSalaries);
    endInput.addEventListener('change', loadSalaries);

    // Quick date buttons
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    btnThisMonth.addEventListener('click', () => {
        startInput.value = firstDayThisMonth;
        endInput.value = lastDayThisMonth;
        loadSalaries();
    });
    btnLastMonth.addEventListener('click', () => {
        startInput.value = firstDayLastMonth;
        endInput.value = lastDayLastMonth;
        loadSalaries();
    });

    recordBtn.addEventListener('click', openRecordModal);

    // Debounced search
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadSalaries, 300);
    });

    loadSalaries();

    async function loadSalaries() {
        const apartmentId = aptSelect.value || defaultAptId;
        if (!apartmentId) {
            salariesTable.innerHTML = `<p class="text-center p-3">${role === 'caretaker' ? 'No apartment assigned.' : 'Select an apartment to view salaries.'}</p>`;
            summaryDiv.style.display = 'none';
            return;
        }

        const staffId = staffSelect.value;
        const start = startInput.value;
        const end = endInput.value;
        const search = searchInput.value.trim().toLowerCase();

        let query = '';
        if (staffId) query += `staff_id=${staffId}&`;
        if (start) query += `start_date=${start}&`;
        if (end) query += `end_date=${end}&`;

        const endpoint = `/staff/salaries/apartment/${apartmentId}?${query}`;

        try {
            const response = await apiService.get(endpoint);
            let salaries = response.success ? response.data : [];

            // Client‑side search filter by staff name
            if (search) {
                salaries = salaries.filter(s =>
                    (s.staff_members?.full_name || '').toLowerCase().includes(search)
                );
            }

            // Summary calculations
            const totalPaid = salaries.reduce((sum, s) => sum + parseFloat(s.amount_paid), 0);
            const count = salaries.length;
            const average = count ? Math.round(totalPaid / count) : 0;

            summaryDiv.innerHTML = `
                <div style="display:flex; gap:12px; flex-wrap:wrap;">
                    <div class="stat-card">
                        <div class="stat-icon success"><i class="fas fa-calendar-check"></i></div>
                        <div class="stat-info">
                            <div class="stat-label">Total Paid (Period)</div>
                            <div class="stat-value">${formatCurrency(totalPaid)}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon info"><i class="fas fa-list-ul"></i></div>
                        <div class="stat-info">
                            <div class="stat-label">Payments</div>
                            <div class="stat-value">${count}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon primary"><i class="fas fa-calculator"></i></div>
                        <div class="stat-info">
                            <div class="stat-label">Average</div>
                            <div class="stat-value">${formatCurrency(average)}</div>
                        </div>
                    </div>
                </div>
            `;
            summaryDiv.style.display = 'block';

            if (salaries.length === 0) {
                salariesTable.innerHTML = `<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><h3>No salary payments found</h3></div>`;
                return;
            }

            salariesTable.innerHTML = `
                <table class="table">
                    <thead>
                        <tr><th>Date</th><th>Staff</th><th>Role</th><th>Amount</th><th>Period</th><th>Method</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${salaries.map(s => {
                            const staff = s.staff_members || {};
                            const roleName = staff.staff_roles?.role_name || 'N/A';
                            return `
                            <tr>
                                <td>${formatDate(s.payment_date)}</td>
                                <td>${staff.full_name || 'N/A'}</td>
                                <td>${roleName}</td>
                                <td>${formatCurrency(s.amount_paid)}</td>
                                <td>${formatDate(s.period_start)} - ${formatDate(s.period_end)}</td>
                                <td>${capitalize(s.payment_method)}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="edit-salary-btn" data-id="${s.id}" data-amount="${s.amount_paid}" data-date="${s.payment_date}" data-start="${s.period_start}" data-end="${s.period_end}" data-method="${s.payment_method}" data-notes="${s.notes || ''}" title="Edit"><i class="fas fa-edit"></i></button>
                                        <button class="danger delete-salary-btn" data-id="${s.id}" title="Delete"><i class="fas fa-trash"></i></button>
                                    </div>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>`;

            // Event delegation
            salariesTable.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-salary-btn');
                if (editBtn) {
                    openEditModal(editBtn.dataset);
                    return;
                }
                const deleteBtn = e.target.closest('.delete-salary-btn');
                if (deleteBtn) {
                    deleteSalary(deleteBtn.dataset.id);
                    return;
                }
            });

        } catch (error) {
            salariesTable.innerHTML = `<div class="error-state"><p>${error.message}</p></div>`;
            summaryDiv.style.display = 'none';
        }
    }

    // ---------- EDIT SALARY MODAL ----------
    async function openEditModal(data) {
        const { showFormModal } = await import('../../components/modal.js');
        const formHtml = `
            <div class="form-group">
                <label class="form-label">Amount (KES)</label>
                <input type="number" class="form-input" id="edit-amount" value="${data.amount}" step="100" min="1" required>
            </div>
            <div class="form-group">
                <label class="form-label">Payment Date</label>
                <input type="date" class="form-input" id="edit-date" value="${data.date}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Period Start</label>
                <input type="date" class="form-input" id="edit-start" value="${data.start}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Period End</label>
                <input type="date" class="form-input" id="edit-end" value="${data.end}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Method</label>
                <select class="form-select" id="edit-method">
                    ${['cash', 'mpesa', 'bank_transfer', 'other'].map(m => `<option value="${m}" ${m === data.method ? 'selected' : ''}>${capitalize(m)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Notes</label>
                <input type="text" class="form-input" id="edit-notes" value="${data.notes}">
            </div>`;

        showFormModal('Edit Salary Payment', formHtml, async (overlay) => {
            const updates = {
                amount_paid: parseFloat(overlay.querySelector('#edit-amount').value),
                payment_date: overlay.querySelector('#edit-date').value,
                period_start: overlay.querySelector('#edit-start').value,
                period_end: overlay.querySelector('#edit-end').value,
                payment_method: overlay.querySelector('#edit-method').value,
                notes: overlay.querySelector('#edit-notes').value
            };
            if (!updates.amount_paid || !updates.payment_date || !updates.period_start || !updates.period_end) {
                showToast('All fields required', 'error');
                return false;
            }
            try {
                await apiService.put(`/staff/salaries/${data.id}`, updates);
                showToast('Salary updated', 'success');
                loadSalaries();
            } catch (e) {
                showToast(e.message, 'error');
                return false;
            }
        });
    }

    // ---------- DELETE SALARY ----------
    async function deleteSalary(id) {
        const { showConfirm } = await import('../../components/modal.js');
        showConfirm('Delete Salary', 'Are you sure you want to delete this salary payment?', async () => {
            try {
                await apiService.delete(`/staff/salaries/${id}`);
                showToast('Salary deleted', 'success');
                loadSalaries();
            } catch (e) {
                showToast(e.message, 'error');
            }
        });
    }

    // ---------- RECORD SALARY MODAL (unchanged) ----------
    async function openRecordModal() {
        const apartmentId = aptSelect.value || defaultAptId;
        if (!apartmentId) { showToast('No apartment selected', 'warning'); return; }

        const staffRes = await apiService.get(`/staff/members/apartment/${apartmentId}`);
        const staffList = staffRes.success ? staffRes.data : [];
        if (staffList.length === 0) { showToast('No staff members in this apartment', 'warning'); return; }

        const today = new Date().toISOString().split('T')[0];
        const { showFormModal } = await import('../../components/modal.js');
        const formHtml = `
            <div class="form-group"><label class="form-label">Staff Member</label><select class="form-select" id="sal-staff">${staffList.map(m => `<option value="${m.id}">${m.full_name} (${m.staff_roles?.role_name || 'N/A'})</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">Amount (KES) <span class="required">*</span></label><input type="number" class="form-input" id="sal-amount" min="1" step="100" required></div>
            <div class="form-group"><label class="form-label">Payment Date</label><input type="date" class="form-input" id="sal-date" value="${today}" required></div>
            <div class="form-group"><label class="form-label">Period Start</label><input type="date" class="form-input" id="sal-start" required></div>
            <div class="form-group"><label class="form-label">Period End</label><input type="date" class="form-input" id="sal-end" required></div>
            <div class="form-group"><label class="form-label">Payment Method</label><select class="form-select" id="sal-method"><option>cash</option><option>mpesa</option><option>bank_transfer</option><option>other</option></select></div>
            <div class="form-group"><label class="form-label">Notes</label><input type="text" class="form-input" id="sal-notes" placeholder="Optional"></div>`;

        showFormModal('Record Salary Payment', formHtml, async (overlay) => {
            const data = {
                staff_id: overlay.querySelector('#sal-staff').value,
                apartment_id: apartmentId,
                amount_paid: parseFloat(overlay.querySelector('#sal-amount').value),
                payment_date: overlay.querySelector('#sal-date').value,
                period_start: overlay.querySelector('#sal-start').value,
                period_end: overlay.querySelector('#sal-end').value,
                payment_method: overlay.querySelector('#sal-method').value,
                notes: overlay.querySelector('#sal-notes').value
            };
            if (!data.amount_paid || !data.payment_date || !data.period_start || !data.period_end) {
                showToast('Please fill all required fields', 'error');
                return false;
            }
            try {
                await apiService.post('/staff/salaries', data);
                showToast('Salary recorded', 'success');
                loadSalaries();
            } catch (e) { showToast(e.message, 'error'); return false; }
        });
    }
}
