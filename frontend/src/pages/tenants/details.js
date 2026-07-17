import { apiService } from '../../services/api.service.js';
import { formatCurrency, formatDate, capitalize } from '../../utils/formatters.js';
import { router } from '../../router.js';
import { showToast } from '../../components/toast.js';

export default async function tenantDetails(container, params) {
    const id = params.id === 'my' ? null : params.id; // 'my' for tenant viewing own profile
    container.innerHTML = `<div class="page-loader"><div class="spinner"></div></div>`;

    try {
        // If tenant viewing their own details, get from dashboard or profile
        let endpoint = id ? `/tenants/${id}` : '/dashboard/tenant';
        const response = id ? await apiService.get(endpoint) : await apiService.get('/dashboard/tenant');
        
        if (!response.success) throw new Error(response.message || 'Not found');
        
        const tenant = id ? response.data : response.data.tenant;
        if (!tenant) {
            container.innerHTML = `<div class="empty-state"><h3>No tenancy found</h3></div>`;
            return;
        }

        const paymentsResponse = id ? await apiService.get(`/tenants/${tenant.id}/payments`) : { data: response.data.payment_summary?.recent_payments || [] };
        const payments = paymentsResponse.data || [];

        container.innerHTML = `
            <div class="mb-2">
                <button class="btn btn-outline btn-sm" onclick="window.router.navigate('/tenants')">
                    <i class="fas fa-arrow-left"></i> Back
                </button>
            </div>
            <div class="card mb-2">
                <div class="card-header">
                    <div>
                        <h2>${tenant.full_name}</h2>
                        <p class="text-muted">${tenant.phone} | ${tenant.email || 'No email'}</p>
                    </div>
                    <span class="badge badge-${tenant.status === 'active' ? 'success' : 'secondary'}">${tenant.status}</span>
                </div>
                <div class="dashboard-stats" style="grid-template-columns: repeat(2,1fr);">
                    <div class="stat-card">
                        <div class="stat-icon primary"><i class="fas fa-door-open"></i></div>
                        <div class="stat-info">
                            <div class="stat-label">Unit</div>
                            <div class="stat-value" style="font-size:1rem;">${tenant.units?.unit_number || 'N/A'}</div>
                            <div class="stat-label">${tenant.units?.apartments?.name || ''}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon success"><i class="fas fa-calendar"></i></div>
                        <div class="stat-info">
                            <div class="stat-label">Lease Period</div>
                            <div class="stat-value" style="font-size:1rem;">${formatDate(tenant.lease_start_date)}</div>
                            <div class="stat-label">to ${tenant.lease_end_date ? formatDate(tenant.lease_end_date) : 'Ongoing'}</div>
                        </div>
                    </div>
                </div>
                <div class="mt-2">
                    <p><strong>Monthly Rent:</strong> ${formatCurrency(tenant.units?.monthly_rent || 0)}</p>
                    <p><strong>Deposit Paid:</strong> ${formatCurrency(tenant.deposit_paid || 0)}</p>
                    ${tenant.id_number ? `<p><strong>ID Number:</strong> ${tenant.id_number}</p>` : ''}
                </div>
            </div>

            <!-- Payments Table -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Payment History</h3>
                    ${id ? `<button class="btn btn-primary btn-sm" onclick="recordPayment('${tenant.id}', '${tenant.unit_id}', '${tenant.units?.apartment_id}')">
                        <i class="fas fa-plus"></i> Record Payment</button>` : ''}
                </div>
                <div class="table-container">
                    ${payments.length > 0 ? `
                    <table class="table">
                        <thead>
                            <tr><th>Date</th><th>Amount</th><th>Period</th><th>Method</th><th>Reference</th></tr>
                        </thead>
                        <tbody>
                            ${payments.map(p => `
                                <tr>
                                    <td>${formatDate(p.payment_date)}</td>
                                    <td>${formatCurrency(p.amount_paid)}</td>
                                    <td>${formatDate(p.period_start)} - ${formatDate(p.period_end)}</td>
                                    <td>${capitalize(p.payment_method)}</td>
                                    <td>${p.reference_number || '-'}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>` : '<p class="text-muted p-2">No payments recorded.</p>'}
                </div>
            </div>`;

        // Make recordPayment available globally
        window.recordPayment = (tenantId, unitId, apartmentId) => {
            import('../../components/modal.js').then(({ showFormModal }) => {
                const today = new Date().toISOString().split('T')[0];
                const formHtml = `
                    <div class="form-group"><label class="form-label">Amount (KES)</label><input type="number" class="form-input" id="pay-amount" min="1" step="100" required></div>
                    <div class="form-group"><label class="form-label">Payment Date</label><input type="date" class="form-input" id="pay-date" value="${today}" required></div>
                    <div class="form-group"><label class="form-label">Period Start</label><input type="date" class="form-input" id="pay-start" value="${today}" required></div>
                    <div class="form-group"><label class="form-label">Period End</label><input type="date" class="form-input" id="pay-end" required></div>
                    <div class="form-group"><label class="form-label">Method</label><select class="form-select" id="pay-method">
                        <option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option></select></div>
                    <div class="form-group"><label class="form-label">Reference</label><input type="text" class="form-input" id="pay-ref"></div>
                `;
                showFormModal('Record Rent Payment', formHtml, async (overlay) => {
                    const data = {
                        tenant_id: tenantId,
                        unit_id: unitId,
                        apartment_id: apartmentId,
                        amount_paid: parseFloat(overlay.querySelector('#pay-amount').value),
                        payment_date: overlay.querySelector('#pay-date').value,
                        period_start: overlay.querySelector('#pay-start').value,
                        period_end: overlay.querySelector('#pay-end').value,
                        payment_method: overlay.querySelector('#pay-method').value,
                        reference_number: overlay.querySelector('#pay-ref').value
                    };
                    if (!data.amount_paid || !data.payment_date || !data.period_start || !data.period_end) {
                        showToast('All fields required', 'error');
                        return false;
                    }
                    try {
                        await apiService.post('/rent', data);
                        showToast('Payment recorded', 'success');
                        location.reload();
                    } catch (e) {
                        showToast(e.message, 'error');
                        return false;
                    }
                });
            });
        };
    } catch (error) {
        container.innerHTML = `<div class="error-state"><h2>Error</h2><p>${error.message}</p></div>`;
    }
}
