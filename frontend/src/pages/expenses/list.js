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

    // Caretaker: auto‑lock apartment
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
                <div class="form-group">
                    <button class="btn btn-sm btn-outline" id="btn-this-month">This Month</button>
                    <button class="btn btn-sm btn-outline" id="btn-last-month">Last Month</button>
                </div>
                <div class="search-bar" style="flex:1;">
                    <i class="fas fa-search"></i>
                    <input type="text" class="form-input" id="expense-search" placeholder="Search description...">
                </div>
            </div>
            <div id="expense-summary" class="mt-2" style="display:none;"></div>
            <div id="expenses-table" class="table-container">
                <div class="page-loader"><div class="spinner"></div></div>
            </div>
        </div>`;

    const aptSelect = container.querySelector('#filter-apt');
    const catSelect = container.querySelector('#filter-cat');
    const startInput = container.querySelector('#filter-start');
    const endInput = container.querySelector('#filter-end');
    const searchInput = container.querySelector('#expense-search');
    const btnThisMonth = container.querySelector('#btn-this-month');
    const btnLastMonth = container.querySelector('#btn-last-month');
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

    // Quick date buttons
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    btnThisMonth.addEventListener('click', () => {
        startInput.value = firstDayThisMonth;
        endInput.value = lastDayThisMonth;
        loadExpenses();
    });
    btnLastMonth.addEventListener('click', () => {
        startInput.value = firstDayLastMonth;
        endInput.value = lastDayLastMonth;
        loadExpenses();
    });

    // Debounced search
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadExpenses, 300);
    });

    loadExpenses();

    async function loadExpenses() {
        const apartmentId = aptSelect.value;
        const category = catSelect.value;
        const start = startInput.value;
        const end = endInput.value;
        const search = searchInput.value.trim().toLowerCase();

        let query = '';
        if (category) query += `category=${category}&`;
        if (start) query += `start_date=${start}&`;
        if (end) query += `end_date=${end}&`;

        const fetchId = (role === 'caretaker') ? defaultAptId : (apartmentId || 'all');
        const endpoint = `/expenses/apartment/${fetchId}?${query}`;

        try {
            const response = await apiService.get(endpoint);
            let expenses = response.success ? response.data : [];

            // Client‑side search filter (description)
            if (search) {
                expenses = expenses.filter(e =>
                    (e.description || '').toLowerCase().includes(search)
                );
            }

            // Summary calculations
            const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
            const count = expenses.length;
            const average = count ? Math.round(totalAmount / count) : 0;

            // By category
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
                            <div class="stat-label">Total (Period)</div>
                            <div class="stat-value">${formatCurrency(totalAmount)}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon info"><i class="fas fa-list-ul"></i></div>
                        <div class="stat-info">
                            <div class="stat-label">Expenses</div>
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

            if (expenses.length === 0) {
                expensesTable.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><h3>No Expenses Found</h3></div>`;
                return;
            }

            expensesTable.innerHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Recorded By</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${expenses.map(e => `
                            <tr>
                                <td>${formatDate(e.expense_date)}</td>
                                <td>${capitalize(e.category)}</td>
                                <td>${e.description}</td>
                                <td>${formatCurrency(e.amount)}</td>
                                <td>${e.recorded_by_user?.full_name || 'N/A'}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="edit-expense-btn" data-id="${e.id}" data-category="${e.category}" data-description="${e.description.replace(/'/g, "&#39;")}" data-amount="${e.amount}" data-date="${e.expense_date}" data-notes="${(e.notes || '').replace(/'/g, "&#39;")}" title="Edit"><i class="fas fa-edit"></i></button>
                                        <button class="danger delete-expense-btn" data-id="${e.id}" title="Delete"><i class="fas fa-trash"></i></button>
                                    </div>
                                </td>
                            </tr>`).join('')}
                    </tbody>
                </table>`;

            // Event delegation
            expensesTable.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-expense-btn');
                if (editBtn) {
                    openEditModal(editBtn.dataset);
                    return;
                }
                const deleteBtn = e.target.closest('.delete-expense-btn');
                if (deleteBtn) {
                    deleteExpense(deleteBtn.dataset.id);
                    return;
                }
            });

        } catch (error) {
            expensesTable.innerHTML = `<div class="error-state"><p>${error.message}</p></div>`;
            summaryDiv.style.display = 'none';
        }
    }

    // ---------- EDIT EXPENSE MODAL ----------
    async function openEditModal(data) {
        const { showFormModal } = await import('../../components/modal.js');
        const formHtml = `
            <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" id="edit-cat">
                    ${CONFIG.EXPENSE_CATEGORIES.map(c => `<option value="${c}" ${c === data.category ? 'selected' : ''}>${capitalize(c)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <input type="text" class="form-input" id="edit-desc" value="${data.description.replace(/&#39;/g, "'")}">
            </div>
            <div class="form-group">
                <label class="form-label">Amount (KES)</label>
                <input type="number" class="form-input" id="edit-amount" value="${data.amount}" step="100" min="1">
            </div>
            <div class="form-group">
                <label class="form-label">Date</label>
                <input type="date" class="form-input" id="edit-date" value="${data.date}">
            </div>
            <div class="form-group">
                <label class="form-label">Notes</label>
                <input type="text" class="form-input" id="edit-notes" value="${data.notes.replace(/&#39;/g, "'")}">
            </div>`;

        showFormModal('Edit Expense', formHtml, async (overlay) => {
            const updates = {
                category: overlay.querySelector('#edit-cat').value,
                description: overlay.querySelector('#edit-desc').value.trim(),
                amount: parseFloat(overlay.querySelector('#edit-amount').value),
                expense_date: overlay.querySelector('#edit-date').value,
                notes: overlay.querySelector('#edit-notes').value.trim()
            };
            if (!updates.description || !updates.amount) {
                showToast('Description and amount are required', 'error');
                return false;
            }
            try {
                await apiService.put(`/expenses/${data.id}`, updates);
                showToast('Expense updated', 'success');
                loadExpenses();
            } catch (e) {
                showToast(e.message, 'error');
                return false;
            }
        });
    }

    // ---------- DELETE EXPENSE ----------
    async function deleteExpense(id) {
        const { showConfirm } = await import('../../components/modal.js');
        showConfirm('Delete Expense', 'Are you sure you want to delete this expense?', async () => {
            try {
                await apiService.delete(`/expenses/${id}`);
                showToast('Expense deleted', 'success');
                loadExpenses();
            } catch (e) {
                showToast(e.message, 'error');
            }
        });
    }

    // ---------- ADD EXPENSE MODAL ----------
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
