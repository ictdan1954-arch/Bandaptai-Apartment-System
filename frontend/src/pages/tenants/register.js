import { apiService } from '../../services/api.service.js';
import { showToast } from '../../components/toast.js';
import { router } from '../../router.js';
import { CONFIG } from '../../config/constants.js';
import { capitalize } from '../../utils/formatters.js';

export default async function registerTenant(container) {
    // Fetch apartments and their units for dropdowns
    const aptResponse = await apiService.get('/apartments');
    const apartments = aptResponse.success ? aptResponse.data : [];

    container.innerHTML = `
        <div class="card" style="max-width: 700px; margin: 0 auto;">
            <div class="card-header">
                <h3 class="card-title">Register New Tenant</h3>
            </div>
            <form id="tenant-form">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div class="form-group">
                        <label class="form-label">Full Name <span class="required">*</span></label>
                        <input type="text" class="form-input" id="t-name" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Phone Number <span class="required">*</span></label>
                        <input type="text" class="form-input" id="t-phone" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" id="t-email">
                    </div>
                    <div class="form-group">
                        <label class="form-label">ID Number</label>
                        <input type="text" class="form-input" id="t-idnumber">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Apartment <span class="required">*</span></label>
                        <select class="form-select" id="t-apartment" required>
                            <option value="">Select apartment</option>
                            ${apartments.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Unit <span class="required">*</span></label>
                        <select class="form-select" id="t-unit" required disabled>
                            <option value="">Select apartment first</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Lease Start Date</label>
                        <input type="date" class="form-input" id="t-start" value="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Deposit Paid (KES)</label>
                        <input type="number" class="form-input" id="t-deposit" value="0" min="0">
                    </div>
                </div>
                <div class="mt-2" style="display:flex; gap:12px; justify-content:flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="window.router.navigate('/tenants')">Cancel</button>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Register Tenant</button>
                </div>
            </form>
        </div>`;

    // Load units when apartment changes
    document.getElementById('t-apartment').addEventListener('change', async (e) => {
        const aptId = e.target.value;
        const unitSelect = document.getElementById('t-unit');
        unitSelect.disabled = true;
        unitSelect.innerHTML = '<option>Loading...</option>';
        
        const response = await apiService.get(`/units/apartment/${aptId}`);
        if (response.success) {
            const vacantUnits = response.data.filter(u => u.status === 'vacant');
            unitSelect.innerHTML = '<option value="">Select unit</option>' + 
                vacantUnits.map(u => `<option value="${u.id}">${u.unit_number} - ${capitalize(u.unit_type)} (${u.monthly_rent}/=)</option>`).join('');
            unitSelect.disabled = false;
        }
    });

    document.getElementById('tenant-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            full_name: document.getElementById('t-name').value,
            phone: document.getElementById('t-phone').value,
            email: document.getElementById('t-email').value,
            id_number: document.getElementById('t-idnumber').value,
            unit_id: document.getElementById('t-unit').value,
            lease_start_date: document.getElementById('t-start').value,
            deposit_paid: parseFloat(document.getElementById('t-deposit').value)
        };
        if (!data.full_name || !data.phone || !data.unit_id) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        try {
            const response = await apiService.post('/tenants', data);
            showToast(`Tenant registered! Default password: ${response.data.default_password}`, 'success');
            router.navigate('/tenants');
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}
