import { apiService } from '../../services/api.service.js';
import { formatCurrency, formatDate, capitalize } from '../../utils/formatters.js';
import { showToast } from '../../components/toast.js';
import { CONFIG } from '../../config/constants.js';

export default async function expensesList(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3 class="card-title">Expenses</h3><button class="btn btn-primary" id="add-expense-btn"><i class="fas fa-plus"></i> Add Expense</button></div>
            <div class="filter-bar">
                <select class="form-select" id="filter-apt"><option value="">All Apartments</option></select>
                <select class="form-select" id="filter-cat"><option value="">All Categories</option>${CONFIG.EXPENSE_CATEGORIES.map(c => `<option value="${c}">${capitalize(c)}</option>`).join('')}</select>
            </div>
            <div id="expenses-table" class="table-container"><div class="page-loader"><div class="spinner"></div></div></div>
        </div>`;

    const aptResponse = await apiService.get('/apartments');
    if (aptResponse.success) aptResponse.data.forEach(a => document.getElementById('filter-apt').innerHTML += `<option value="${a.id}">${a.name}</option>`);
    document.getElementById('filter-apt').addEventListener('change', loadExpenses);
    document.getElementById('filter-cat').addEventListener('change', loadExpenses);
    document.getElementById('add-expense-btn').addEventListener('click', openAddModal);
    await loadExpenses();
}

async function loadExpenses() {
    const aptId = document.getElementById('filter-apt').value;
    const cat = document.getElementById('filter-cat').value;
    let query = '';
    if (aptId) query += `apartmentId=${aptId}&`;
    if (cat) query += `category=${cat}&`;
    try {
        const response = await apiService.get(`/expenses/apartment/${aptId || 'all'}?${query}`);
        const expenses = response.success ? response.data : [];
        const table = document.getElementById('expenses-table');
        if (expenses.length === 0) {
            table.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><h3>No Expenses</h3></div>`;
            return;
        }
        table.innerHTML = `<table class="table"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Recorded By</th></tr></thead><tbody>${expenses.map(e => `
            <tr><td>${formatDate(e.expense_date)}</td><td>${capitalize(e.category)}</td><td>${e.description}</td><td>${formatCurrency(e.amount)}</td><td>${e.recorded_by_user?.full_name || 'N/A'}</td></tr>`).join('')}</tbody></table>`;
    } catch (e) {
        document.getElementById('expenses-table').innerHTML = `<div class="error-state"><p>${e.message}</p></div>`;
    }
}

async function openAddModal() {
    const { showFormModal } = await import('../../components/modal.js');
    const aptResponse = await apiService.get('/apartments');
    const apartments = aptResponse.success ? aptResponse.data : [];
    const formHtml = `
        <div class="form-group"><label class="form-label">Apartment</label><select class="form-select" id="exp-apt">${apartments.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Category</label><select class="form-select" id="exp-cat">${CONFIG.EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="exp-desc"></div>
        <div class="form-group"><label class="form-label">Amount</label><input type="number" class="form-input" id="exp-amount" min="0"></div>
        <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="exp-date" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="exp-notes"></textarea></div>`;
    showFormModal('Add Expense', formHtml, async (overlay) => {
        const data = {
            apartment_id: overlay.querySelector('#exp-apt').value,
            category: overlay.querySelector('#exp-cat').value,
            description: overlay.querySelector('#exp-desc').value,
            amount: parseFloat(overlay.querySelector('#exp-amount').value),
            expense_date: overlay.querySelector('#exp-date').value,
            notes: overlay.querySelector('#exp-notes').value
        };
        if (!data.apartment_id || !data.description || !data.amount) {
            showToast('Fill all required fields', 'error');
            return false;
        }
        try {
            await apiService.post('/expenses', data);
            showToast('Expense recorded', 'success');
            loadExpenses();
        } catch (e) { showToast(e.message, 'error'); return false; }
    });
}
