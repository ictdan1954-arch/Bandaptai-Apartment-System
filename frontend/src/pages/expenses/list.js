import { apiService } from '../../services/api.service.js';
import { authService } from '../../services/auth.service.js';
import { formatCurrency, formatDate, capitalize } from '../../utils/formatters.js';
import { showToast } from '../../components/toast.js';
import { CONFIG } from '../../config/constants.js';

export default async function expensesList(container) {
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
                <h3 class="card-title">Expenses${defaultAptName ? ` – ${defaultAptName}` : ''}</h3>
                <button class="btn btn-primary" id="add-expense-btn">
                    <i class="fas fa-plus"></i> Add Expense
                </button>
            </div>
            <div class="filter-bar">
                ${role === 'landlord' ? `
                <div class="form-group">
                    <select class="form-select" id="filter-apt">
                        <option value="">All Apartments</option>
                        ${apartments.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                    </select>
                </div>` : `
                <div class="form-group">
                    <input type="hidden" id="filter-apt" value="${defaultAptId}">
                    <p class="text-muted" style="margin:0; padding-top:8px;">
                        Showing expenses for <strong>${defaultAptName}</strong>
                    </p>
                </div>`}
                <div class="form-group">
                    <select class="form-select" id="filter-cat">
                        <option value="">All Categories</option>
                        ${CONFIG.EXPENSE_CATEGORIES.map(c => `<option value="${c}">${capitalize(c)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <input type="date" class="form-input" id="filter-start" placeholder="Start date">
                </div>
                <div class="form-group">
                    <input type="date" class="form-input" id="filter-end" placeholder="End date">
                </div>
            </div>
            <div id="expenses-table" class="table-container">
                <div class="page-loader"><div class="spinner"></div></div>
            </div>
            <div id="expense-summary" class="mt-2" style="display:none;"></div>
        </div>`;

    const aptSelect = container.querySelector('#filter-apt');
    const catSelect = container.querySelector('#filter-cat');
    const startInput = container.querySelector('#filter-start');
    const endInput = container.querySelector('#filter-end');
    const addBtn = container.querySelector('#add-expense-btn');
    const expensesTable = container.querySelector('#expenses-table');
    const summaryDiv = container.querySelector('#expense-summary');

    if (role === 'landlord') {
        aptSelect.addEventListener('change', loadExpenses);
    }
    catSelect.addEventListener('change', loadExpenses);
    startInput.addEventListener('change', loadExpenses);
    endInput.addEventListener('change', loadExpenses);
    addBtn.addEventListener('click', openAddModal);

    loadExpenses();

    async function loadExpenses() {
        const apartmentId = aptSelect.value;
        const category = catSelect.value;
        const start = startInput.value;
        const end = endInput.value;

        let query = '';
        if (category) query += `category=${category}&`;
        if (start) query += `start_date=${start}&`;
        if (end) query += `end_date=${end}&`;

        // Determine fetch ID
        const fetchId = (role === 'caretaker') ? defaultAptId : (apartmentId || 'all');
        const endpoint = `/expenses/apartment/${fetchId}?${query}`;

        try {
            const response = await apiService.get(endpoint);
            const expenses = response.success ? response.data : [];

            if (expenses.length === 0) {
                expensesTable.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><h3>No Expenses</h3></div>`;
                summaryDiv.style.display = 'none';
                return;
            }

            // Summary calculations
            const now = new Date();
            const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const thisMonthTotal = expenses
                .filter(e => e.expense_date >= firstOfMonth)
                .reduce((sum, e) => sum + parseFloat(e.amount), 0);

            const byCategory = {};
            expenses.forEach(e => {
                const cat = e.category || 'other';
                byCategory[cat] = (byCategory[cat] || 0) + parseFloat(e.amount);
            });

            summaryDiv.innerHTML = `
                <div style="display:flex; gap:12px; flex-wrap:wrap;">
                    <div class="stat-card">
                        <div class="stat-icon danger"><i class="fas fa-calendar-week"></i></div>
                        <div class="stat-info">
                            <div class="stat-label">Total This Month</div>
                            <div class="stat-value">${formatCurrency(thisMonthTotal)}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon info"><i class="fas fa-list-ul"></i></div>
                        <div class="stat-info">
                            <div class="stat-label">Total Records</div>
                            <div class="stat-value">${expenses.length}</div>
                        </div>
                    </div>
                </div>
                <div class="mt-2">
                    <h4 style="font-size:0.9rem; margin-bottom:8px;">By Category</h4>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        ${Object.entries(byCategory).map(([cat, total]) => `
                            <span class="badge badge-info">${capitalize(cat)}: ${formatCurrency(total)}</span>
                        `).join('')}
                    </div>
                </div>
            `;
            summaryDiv.style.display = 'block';

            expensesTable.innerHTML = `
                <table class="table">
                    <thead>
                        <tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Recorded By</th></tr>
                    </thead>
                    <tbody>
                        ${expenses.map(e => `
                            <tr>
                                <td>${formatDate(e.expense_date)}</td>
                                <td>${capitalize(e.category)}</td>
                                <td>${e.description}</td>
                                <td>${formatCurrency(e.amount)}</td>
                                <td>${e.recorded_by_user?.full_name || 'N/A'}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>`;
        } catch (error) {
            expensesTable.innerHTML = `<div class="error-state"><p>${error.message}</p></div>`;
            summaryDiv.style.display = 'none';
        }
    }

    async function openAddModal() {
        const apartmentId = aptSelect.value || defaultAptId;
        if (!apartmentId) {
            showToast('Please select an apartment first', 'warning');
            return;
        }

        const { showFormModal } = await import('../../components/modal.js');
        const formHtml = `
            <div class="form-group">
                <label class="form-label">Apartment</label>
                <input type="text" class="form-input" value="${defaultAptName || (apartments.find(a => a.id === apartmentId)?.name || '')}" disabled>
                <input type="hidden" id="exp-apt" value="${apartmentId}">
            </div>
            <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" id="exp-cat">
                    ${CONFIG.EXPENSE_CATEGORIES.map(c => `<option value="${c}">${capitalize(c)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Description <span class="required">*</span></label>
                <input class="form-input" id="exp-desc" required>
            </div>
            <div class="form-group">
                <label class="form-label">Amount (KES) <span class="required">*</span></label>
                <input type="number" class="form-input" id="exp-amount" min="0" step="100" required>
            </div>
            <div class="form-group">
                <label class="form-label">Date</label>
                <input type="date" class="form-input" id="exp-date" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label class="form-label">Notes</label>
                <textarea class="form-textarea" id="exp-notes" rows="2"></textarea>
            </div>`;

        showFormModal('Add Expense', formHtml, async (overlay) => {
            const data = {
                apartment_id: overlay.querySelector('#exp-apt').value,
                category: overlay.querySelector('#exp-cat').value,
                description: overlay.querySelector('#exp-desc').value.trim(),
                amount: parseFloat(overlay.querySelector('#exp-amount').value),
                expense_date: overlay.querySelector('#exp-date').value,
                notes: overlay.querySelector('#exp-notes').value.trim()
            };

            if (!data.description || !data.amount) {
                showToast('Description and amount are required', 'error');
                return false;
            }

            try {
                await apiService.post('/expenses', data);
                showToast('Expense recorded', 'success');
                loadExpenses();
            } catch (e) {
                showToast(e.message, 'error');
                return false;
            }
        });
    }
}
