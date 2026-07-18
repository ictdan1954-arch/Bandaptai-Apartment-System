import { apiService } from '../../services/api.service.js';
import { authService } from '../../services/auth.service.js';
import { formatCurrency, formatDate, capitalize } from '../../utils/formatters.js';
import { showToast } from '../../components/toast.js';

export default async function rentPayments(container) {
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
                <h3 class="card-title">Rent Payments${defaultAptName ? ` – ${defaultAptName}` : ''}</h3>
                <button class="btn btn-primary" id="record-payment-btn">
                    <i class="fas fa-plus"></i> Record Payment
                </button>
            </div>
            <div class="filter-bar">
                ${role === 'landlord' ? `
                <div class="form-group">
                    <select class="form-select" id="filter-apartment">
                        <option value="">All Apartments</option>
                        ${apartments.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                    </select>
                </div>` : `
                <div class="form-group">
                    <input type="hidden" id="filter-apartment" value="${defaultAptId}">
                    <p class="text-muted" style="margin:0; padding-top:8px;">
                        Showing payments for <strong>${defaultAptName}</strong>
                    </p>
                </div>`}
                <div class="form-group">
                    <input type="date" class="form-input" id="filter-start" placeholder="Start date">
                </div>
                <div class="form-group">
                    <input type="date" class="form-input" id="filter-end" placeholder="End date">
                </div>
            </div>
            <div id="payments-table" class="table-container">
                <div class="page-loader"><div class="spinner"></div></div>
            </div>
        </div>`;

    const aptSelect = container.querySelector('#filter-apartment');
    const startInput = container.querySelector('#filter-start');
    const endInput = container.querySelector('#filter-end');
    const recordBtn = container.querySelector('#record-payment-btn');
    const paymentsTable = container.querySelector('#payments-table');

    if (role === 'landlord') {
        aptSelect.addEventListener('change', loadPayments);
    }
    startInput.addEventListener('change', loadPayments);
    endInput.addEventListener('change', loadPayments);
    recordBtn.addEventListener('click', openRecordModal);

    loadPayments();

    async function loadPayments() {
        const apartmentId = aptSelect.value;
        const start = startInput.value;
        const end = endInput.value;

        let query = '';
        if (apartmentId) query += `apartmentId=${apartmentId}&`;
        if (start) query += `start_date=${start}&`;
        if (end) query += `end_date=${end}&`;

        const fetchId = (role === 'caretaker') ? defaultAptId : (apartmentId || 'all');
        const endpoint = `/rent/apartment/${fetchId}?${query}`;

        try {
            const response = await apiService.get(endpoint);
            const payments = response.success ? response.data : [];

            if (payments.length === 0) {
                paymentsTable.innerHTML = `<div class="empty-state"><i class="fas fa-money-bill-wave"></i><h3>No Payments</h3></div>`;
                return;
            }

            paymentsTable.innerHTML = `
                <table class="table">
                    <thead>
                        <tr><th>Date</th><th>Tenant</th><th>Unit</th><th>Amount</th><th>Period</th><th>Method</th><th>Purpose</th></tr>
                    </thead>
                    <tbody>
                        ${payments.map(p => `
                            <tr>
                                <td>${formatDate(p.payment_date)}</td>
                                <td>${p.tenants?.full_name || 'N/A'}</td>
                                <td>${p.units?.unit_number || 'N/A'}</td>
                                <td>${formatCurrency(p.amount_paid)}</td>
                                <td>${formatDate(p.period_start)} - ${formatDate(p.period_end)}</td>
                                <td>${capitalize(p.payment_method)}</td>
                                <td>${capitalize(p.purpose || 'monthly_rent')}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>`;
        } catch (error) {
            paymentsTable.innerHTML = `<div class="error-state"><p>${error.message}</p></div>`;
        }
    }

    // ============ RECORD PAYMENT MODAL ============
    async function openRecordModal() {
        let tenantsQuery = '?status=active';
        if (role === 'caretaker' && defaultAptId) {
            tenantsQuery += `&apartment_id=${defaultAptId}`;
        }
        const tenantsRes = await apiService.get(`/tenants${tenantsQuery}`);
        const tenants = tenantsRes.success ? tenantsRes.data : [];

        if (tenants.length === 0) {
            showToast('No active tenants available', 'warning');
            return;
        }

        const today = new Date().toISOString().split('T')[0];

        const formHtml = `
            <div class="form-group">
                <label class="form-label">Tenant</label>
                <select class="form-select" id="pay-tenant" onchange="window.refreshRentDetails()">
                    ${tenants.map(t => `
                        <option value="${t.id}" 
                                data-unit="${t.unit_id}" 
                                data-apt="${t.units?.apartment_id}" 
                                data-rent="${t.units?.monthly_rent || 0}" 
                                data-phone="${t.phone || ''}"
                                data-unitnumber="${t.units?.unit_number || ''}">
                            ${t.full_name} - ${t.units?.unit_number || 'No unit'} (${t.phone})
                        </option>
                    `).join('')}
                </select>
                <div id="arrears-info" class="mt-1" style="font-size:0.9rem; color: var(--danger); display:none;"></div>
            </div>

            <div class="form-group">
                <label class="form-label">Amount (KES)</label>
                <div style="display:flex; gap:8px;">
                    <input type="number" class="form-input" id="pay-amount" min="1" step="100" required style="flex:1;">
                    <button type="button" class="btn btn-sm btn-outline" onclick="window.fillRentAmount()" title="Fill monthly rent">Fill Rent</button>
                </div>
                <div id="expected-rent-info" class="mt-1" style="font-size:0.85rem; color: var(--text-secondary); display:none;"></div>
            </div>

            <div class="form-group">
                <label class="form-label">Payment Date</label>
                <input type="date" class="form-input" id="pay-date" value="${today}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Period Start</label>
                <input type="date" class="form-input" id="pay-start" value="${today}" required onchange="window.refreshRentDetails()">
            </div>
            <div class="form-group">
                <label class="form-label">Period End</label>
                <input type="date" class="form-input" id="pay-end" required onchange="window.refreshRentDetails()">
            </div>
            <div class="form-group">
                <label class="form-label">Purpose</label>
                <select class="form-select" id="pay-purpose">
                    <option value="monthly_rent">Monthly Rent</option>
                    <option value="arrears_clearance">Arrears Clearance</option>
                    <option value="deposit_topup">Deposit Top‑up</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Method</label>
                <select class="form-select" id="pay-method">
                    <option value="cash">Cash</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Reference</label>
                <input type="text" class="form-input" id="pay-ref">
            </div>

            <!-- Last 3 Payments -->
            <div class="mt-3" id="last-payments-section" style="display:none;">
                <h4 style="font-size:0.9rem; margin-bottom:8px;">Last 3 Payments</h4>
                <div class="table-container" style="max-height:150px; overflow-y:auto;">
                    <table class="table" style="font-size:0.85rem;">
                        <thead><tr><th>Date</th><th>Amount</th><th>Period</th><th>Purpose</th></tr></thead>
                        <tbody id="last-payments-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;

        const { showFormModal } = await import('../../components/modal.js');

        // Global helpers used by inline handlers
        window.refreshRentDetails = async function () {
            const tenantSelect = document.querySelector('#pay-tenant');
            const arrearsDiv = document.querySelector('#arrears-info');
            const expectedDiv = document.querySelector('#expected-rent-info');
            const lastPaymentsSection = document.querySelector('#last-payments-section');
            const lastPaymentsTbody = document.querySelector('#last-payments-tbody');
            const startInput = document.querySelector('#pay-start');
            const endInput = document.querySelector('#pay-end');

            if (!tenantSelect) return;

            const selectedOption = tenantSelect.options[tenantSelect.selectedIndex];
            const tenantId = selectedOption?.value;
            const rent = parseFloat(selectedOption?.dataset.rent) || 0;

            // Arrears
            arrearsDiv.style.display = 'none';
            if (tenantId) {
                try {
                    const res = await apiService.get(`/rent/arrears/${tenantId}`);
                    if (res.success) {
                        const arrears = res.data.arrears;
                        if (arrears > 0) {
                            arrearsDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Arrears: <strong>${formatCurrency(arrears)}</strong>`;
                            arrearsDiv.style.color = 'var(--danger)';
                        } else {
                            arrearsDiv.innerHTML = `<i class="fas fa-check-circle"></i> No arrears`;
                            arrearsDiv.style.color = 'var(--secondary)';
                        }
                        arrearsDiv.style.display = 'block';
                    }
                } catch (e) {}

                // Last 3 Payments
                try {
                    const payRes = await apiService.get(`/tenants/${tenantId}/payments`);
                    if (payRes.success && payRes.data.length > 0) {
                        const lastThree = payRes.data.slice(0, 3);
                        lastPaymentsTbody.innerHTML = lastThree.map(p => `
                            <tr>
                                <td>${formatDate(p.payment_date)}</td>
                                <td>${formatCurrency(p.amount_paid)}</td>
                                <td>${formatDate(p.period_start)} - ${formatDate(p.period_end)}</td>
                                <td>${capitalize(p.purpose || 'monthly_rent')}</td>
                            </tr>
                        `).join('');
                        lastPaymentsSection.style.display = 'block';
                    } else {
                        lastPaymentsSection.style.display = 'none';
                    }
                } catch (e) { lastPaymentsSection.style.display = 'none'; }
            }

            // Expected rent for period
            expectedDiv.style.display = 'none';
            if (rent > 0 && startInput.value && endInput.value) {
                const start = new Date(startInput.value);
                const end = new Date(endInput.value);
                const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
                const expectedTotal = monthsDiff * rent;
                expectedDiv.innerHTML = `Expected rent for ${monthsDiff} month${monthsDiff>1?'s':''}: <strong>${formatCurrency(expectedTotal)}</strong>`;
                expectedDiv.style.display = 'block';
            } else if (rent > 0) {
                expectedDiv.innerHTML = `Monthly rent: <strong>${formatCurrency(rent)}</strong>`;
                expectedDiv.style.display = 'block';
            }
        };

        window.fillRentAmount = function () {
            const tenantSelect = document.querySelector('#pay-tenant');
            const amountInput = document.querySelector('#pay-amount');
            if (!tenantSelect || !amountInput) return;
            const selectedOption = tenantSelect.options[tenantSelect.selectedIndex];
            const rent = parseFloat(selectedOption?.dataset.rent) || 0;
            if (rent > 0) amountInput.value = rent;
        };

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
                reference_number: overlay.querySelector('#pay-ref').value,
                purpose: overlay.querySelector('#pay-purpose').value
            };

            if (!data.tenant_id || !data.amount_paid || !data.payment_date || !data.period_start || !data.period_end) {
                showToast('Please fill all required fields', 'error');
                return false;
            }

            try {
                await apiService.post('/rent', data);
                showToast('Payment recorded', 'success');
                loadPayments();

                // Clean up global helpers
                delete window.refreshRentDetails;
                delete window.fillRentAmount;
            } catch (e) {
                showToast(e.message, 'error');
                return false;
            }
        });

        // Trigger initial data load after modal renders
        setTimeout(() => {
            if (window.refreshRentDetails) window.refreshRentDetails();
        }, 100);
    }
}
