import { apiService } from '../../services/api.service.js';
import { authService } from '../../services/auth.service.js';
import { formatCurrency, formatDate, capitalize } from '../../utils/formatters.js';
import { showToast } from '../../components/toast.js';
import { Modal } from '../../components/modal.js';

export default async function rentPayments(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Rent Payments</h3>
                <button class="btn btn-primary" id="record-payment-btn"><i class="fas fa-plus"></i> Record Payment</button>
            </div>
            <div class="filter-bar">
                <div class="form-group"><select class="form-select" id="filter-apartment"><option value="">All Apartments</option></select></div>
                <div class="form-group"><input type="date" class="form-input" id="filter-start"></div>
                <div class="form-group"><input type="date" class="form-input" id="filter-end"></div>
            </div>
            <div id="payments-table" class="table-container"><div class="page-loader"><div class="spinner"></div></div></div>
        </div>`;

    // Load apartments for filter
    const aptResponse = await apiService.get('/apartments');
    const apartments = aptResponse.success ? aptResponse.data : [];
    const aptSelect = document.getElementById('filter-apartment');
    apartments.forEach(a => aptSelect.innerHTML += `<option value="${a.id}">${a.name}</option>`);

    document.getElementById('filter-apartment').addEventListener('change', loadPayments);
    document.getElementById('filter-start').addEventListener('change', loadPayments);
    document.getElementById('filter-end').addEventListener('change', loadPayments);
    document.getElementById('record-payment-btn').addEventListener('click', openRecordModal);

    await loadPayments();
}

async function loadPayments() {
    const apartmentId = document.getElementById('filter-apartment').value;
    const start = document.getElementById('filter-start').value;
    const end = document.getElementById('filter-end').value;
    let query = '';
    if (apartmentId) query += `apartmentId=${apartmentId}&`;
    if (start) query += `start_date=${start}&`;
    if (end) query += `end_date=${end}&`;

    try {
        const response = await apiService.get(`/rent/apartment/${apartmentId || 'all'}?${query}`);
        const payments = response.success ? response.data : [];
        const table = document.getElementById('payments-table');
        if (payments.length === 0) {
            table.innerHTML = `<div class="empty-state"><i class="fas fa-money-bill-wave"></i><h3>No Payments</h3></div>`;
            return;
        }
        table.innerHTML = `
            <table class="table">
                <thead><tr><th>Date</th><th>Tenant</th><th>Unit</th><th>Amount</th><th>Period</th><th>Method</th></tr></thead>
                <tbody>${payments.map(p => `
                    <tr>
                        <td>${formatDate(p.payment_date)}</td>
                        <td>${p.tenants?.full_name || 'N/A'}</td>
                        <td>${p.units?.unit_number || 'N/A'}</td>
                        <td>${formatCurrency(p.amount_paid)}</td>
                        <td>${formatDate(p.period_start)} - ${formatDate(p.period_end)}</td>
                        <td>${capitalize(p.payment_method)}</td>
                    </tr>`).join('')}</tbody>
            </table>`;
    } catch (error) {
        document.getElementById('payments-table').innerHTML = `<div class="error-state"><p>${error.message}</p></div>`;
    }
}

async function openRecordModal() {
    const { showFormModal } = await import('../../components/modal.js');
    // Fetch tenants and units for select
    const tenantsRes = await apiService.get('/tenants?status=active');
    const tenants = tenantsRes.success ? tenantsRes.data : [];
    const formHtml = `
        <div class="form-group"><label class="form-label">Tenant</label><select class="form-select" id="pay-tenant">
            <option value="">Select</option>${tenants.map(t => `<option value="${t.id}" data-unit="${t.unit_id}" data-apt="${t.units?.apartment_id}">${t.full_name} - ${t.units?.unit_number}</option>`).join('')}
        </select></div>
        <div class="form-group"><label class="form-label">Amount</label><input type="number" class="form-input" id="pay-amount" min="1"></div>
        <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="pay-date" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label class="form-label">Period Start</label><input type="date" class="form-input" id="pay-start"></div>
        <div class="form-group"><label class="form-label">Period End</label><input type="date" class="form-input" id="pay-end"></div>
        <div class="form-group"><label class="form-label">Method</label><select class="form-select" id="pay-method">
            <option>cash</option><option>mpesa</option><option>bank_transfer</option><option>other</option></select></div>
        <div class="form-group"><label class="form-label">Reference</label><input type="text" class="form-input" id="pay-ref"></div>`;
    showFormModal('Record Payment', formHtml, async (overlay) => {
        const tenantSelect = overlay.querySelector('#pay-tenant');
        const selectedOption = tenantSelect.options[tenantSelect.selectedIndex];
        const data = {
            tenant_id: tenantSelect.value,
            unit_id: selectedOption.dataset.unit,
            apartment_id: selectedOption.dataset.apt,
            amount_paid: parseFloat(overlay.querySelector('#pay-amount').value),
            payment_date: overlay.querySelector('#pay-date').value,
            period_start: overlay.querySelector('#pay-start').value,
            period_end: overlay.querySelector('#pay-end').value,
            payment_method: overlay.querySelector('#pay-method').value,
            reference_number: overlay.querySelector('#pay-ref').value
        };
        if (!data.tenant_id || !data.amount_paid) {
            showToast('Tenant and amount required', 'error');
            return false;
        }
        try {
            await apiService.post('/rent', data);
            showToast('Payment recorded', 'success');
            loadPayments();
        } catch (e) {
            showToast(e.message, 'error');
            return false;
        }
    });
}
