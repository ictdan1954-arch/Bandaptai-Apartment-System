import { apiService } from '../../services/api.service.js';
import { formatCurrency, formatDate, capitalize } from '../../utils/formatters.js';

export default async function staffSalaries(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header"><h3 class="card-title">Staff Salary Payments</h3></div>
            <div class="filter-bar">
                <select class="form-select" id="sal-apt"><option value="">Select Apartment</option></select>
            </div>
            <div id="salaries-table" class="table-container"><p class="text-center p-3">Select an apartment.</p></div>
        </div>`;
    const aptRes = await apiService.get('/apartments');
    if (aptRes.success) aptRes.data.forEach(a => document.getElementById('sal-apt').innerHTML += `<option value="${a.id}">${a.name}</option>`);
    document.getElementById('sal-apt').addEventListener('change', loadSalaries);
}

async function loadSalaries() {
    const aptId = document.getElementById('sal-apt').value;
    if (!aptId) return;
    try {
        const response = await apiService.get(`/staff/salaries/apartment/${aptId}`);
        const salaries = response.success ? response.data : [];
        const table = document.getElementById('salaries-table');
        if (salaries.length === 0) {
            table.innerHTML = `<div class="empty-state"><h3>No salary records</h3></div>`;
            return;
        }
        table.innerHTML = `<table class="table"><thead><tr><th>Date</th><th>Staff</th><th>Amount</th><th>Period</th><th>Method</th></tr></thead><tbody>${salaries.map(s => `
            <tr><td>${formatDate(s.payment_date)}</td><td>${s.staff_members?.full_name || 'N/A'}</td><td>${formatCurrency(s.amount_paid)}</td><td>${formatDate(s.period_start)} - ${formatDate(s.period_end)}</td><td>${capitalize(s.payment_method)}</td></tr>`).join('')}</tbody></table>`;
    } catch (e) {
        document.getElementById('salaries-table').innerHTML = `<div class="error-state"><p>${e.message}</p></div>`;
    }
}
