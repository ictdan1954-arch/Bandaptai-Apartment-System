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
            </div>
            <div id="salaries-table" class="table-container">
                <div class="page-loader"><div class="spinner"></div></div>
            </div>
            <div id="summary-card" class="mt-2" style="display:none;"></div>
        </div>`;

    const aptSelect = container.querySelector('#filter-apartment');
    const staffSelect = container.querySelector('#filter-staff');
    const startInput = container.querySelector('#filter-start');
    const endInput = container.querySelector('#filter-end');
    const recordBtn = container.querySelector('#record-salary-btn');
    const salariesTable = container.querySelector('#salaries-table');
    const summaryCard = container.querySelector('#summary-card');

    // Load staff list for the selected apartment (or caretaker's default)
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
        // Caretaker: load staff options immediately for their assigned apartment
        if (defaultAptId) loadStaffOptions(defaultAptId);
    }

    staffSelect.addEventListener('change', loadSalaries);
    startInput.addEventListener('change', loadSalaries);
    endInput.addEventListener('change', loadSalaries);
    recordBtn.addEventListener('click', openRecordModal);

    // Initial load
    loadSalaries();

    async function loadSalaries() {
        const apartmentId = aptSelect.value || defaultAptId;
        if (!apartmentId) {
            salariesTable.innerHTML = `<p class="text-center p-3">${role === 'caretaker' ? 'No apartment assigned.' : 'Select an apartment to view salaries.'}</p>`;
            summaryCard.style.display = 'none';
            return;
        }

        const staffId = staffSelect.value;
        const start = startInput.value;
        const end = endInput.value;

        let query = '';
        if (staffId) query += `staff_id=${staffId}&`;
        if (start) query += `start_date=${start}&`;
        if (end) query += `end_date=${end}&`;

        const endpoint = `/staff/salaries/apartment/${apartmentId}?${query}`;

        try {
            const response = await apiService.get(endpoint);
            const salaries = response.success ? response.data : [];

            if (salaries.length === 0) {
                salariesTable.innerHTML = `<div class="empty-state"><i class="fas fa-hand-holding-usd"></i><h3>No salary payments</h3></div>`;
                summaryCard.style.display = 'none';
                return;
            }

            // Calculate total for current month
            const now = new Date();
            const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const thisMonthTotal = salaries
                .filter(s => s.payment_date >= firstOfMonth)
                .reduce((sum, s) => sum + parseFloat(s.amount_paid), 0);

            summaryCard.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon success"><i class="fas fa-calendar-check"></i></div>
                    <div class="stat-info">
                        <div class="stat-label">Total Paid This Month</div>
                        <div class="stat-value">${formatCurrency(thisMonthTotal)}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon info"><i class="fas fa-list-ul"></i></div>
                    <div class="stat-info">
                        <div class="stat-label">Total Records</div>
                        <div class="stat-value">${salaries.length}</div>
                    </div>
                </div>
            `;
            summaryCard.style.display = 'flex';
            summaryCard.style.gap = '12px';

            salariesTable.innerHTML = `
                <table class="table">
                    <thead>
                        <tr><th>Date</th><th>Staff</th><th>Role</th><th>Amount</th><th>Period</th><th>Method</th></tr>
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
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>`;
        } catch (error) {
            salariesTable.innerHTML = `<div class="error-state"><p>${error.message}</p></div>`;
            summaryCard.style.display = 'none';
        }
    }

    async function openRecordModal() {
        const apartmentId = aptSelect.value || defaultAptId;
        if (!apartmentId) {
            showToast('No apartment selected', 'warning');
            return;
        }

        // Fetch staff members for this apartment
        const staffRes = await apiService.get(`/staff/members/apartment/${apartmentId}`);
        const staffList = staffRes.success ? staffRes.data : [];

        if (staffList.length === 0) {
            showToast('No staff members in this apartment', 'warning');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const formHtml = `
            <div class="form-group">
                <label class="form-label">Staff Member</label>
                <select class="form-select" id="sal-staff">
                    ${staffList.map(m => `<option value="${m.id}">${m.full_name} (${m.staff_roles?.role_name || 'N/A'})</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Amount (KES) <span class="required">*</span></label>
                <input type="number" class="form-input" id="sal-amount" min="1" step="100" required>
            </div>
            <div class="form-group">
                <label class="form-label">Payment Date</label>
                <input type="date" class="form-input" id="sal-date" value="${today}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Period Start</label>
                <input type="date" class="form-input" id="sal-start" required>
            </div>
            <div class="form-group">
                <label class="form-label">Period End</label>
                <input type="date" class="form-input" id="sal-end" required>
            </div>
            <div class="form-group">
                <label class="form-label">Payment Method</label>
                <select class="form-select" id="sal-method">
                    <option value="cash">Cash</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Notes</label>
                <input type="text" class="form-input" id="sal-notes" placeholder="Optional">
            </div>`;

        const { showFormModal } = await import('../../components/modal.js');
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

            if (!data.staff_id || !data.amount_paid || !data.payment_date || !data.period_start || !data.period_end) {
                showToast('Please fill all required fields', 'error');
                return false;
            }

            try {
                await apiService.post('/staff/salaries', data);
                showToast('Salary recorded', 'success');
                loadSalaries();
            } catch (e) {
                showToast(e.message, 'error');
                return false;
            }
        });
    }
}
