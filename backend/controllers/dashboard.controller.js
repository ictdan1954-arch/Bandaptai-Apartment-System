const supabase = require('../config/supabase');
const ApiResponse = require('../utils/response');

const dashboardController = {
    // Landlord dashboard
    async landlordDashboard(req, res) {
        try {
            const { data: apartments } = await supabase
                .from('apartments')
                .select('id, name, status');

            const apartmentIds = apartments?.map(a => a.id) || [];

            const { count: totalUnits } = await supabase
                .from('units')
                .select('*', { count: 'exact', head: true })
                .in('apartment_id', apartmentIds);

            const { count: occupiedUnits } = await supabase
                .from('units')
                .select('*', { count: 'exact', head: true })
                .in('apartment_id', apartmentIds)
                .eq('status', 'occupied');

            const { count: vacantUnits } = await supabase
                .from('units')
                .select('*', { count: 'exact', head: true })
                .in('apartment_id', apartmentIds)
                .eq('status', 'vacant');

            const { count: activeTenants } = await supabase
                .from('tenants')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');

            const { data: allUnits } = await supabase
                .from('units')
                .select('monthly_rent')
                .in('apartment_id', apartmentIds)
                .eq('status', 'occupied');

            const expectedMonthlyRent = allUnits?.reduce((sum, u) => sum + parseFloat(u.monthly_rent), 0) || 0;

            const now = new Date();
            const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

            const { data: thisMonthPayments } = await supabase
                .from('rent_payments')
                .select('amount_paid')
                .in('apartment_id', apartmentIds)
                .gte('payment_date', firstOfMonth);

            const rentCollectedThisMonth = thisMonthPayments?.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0) || 0;

            const { data: thisMonthExpenses } = await supabase
                .from('expenses')
                .select('amount')
                .in('apartment_id', apartmentIds)
                .gte('expense_date', firstOfMonth);

            const expensesThisMonth = thisMonthExpenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

            const { count: pendingMaintenance } = await supabase
                .from('maintenance_requests')
                .select('*', { count: 'exact', head: true })
                .in('apartment_id', apartmentIds)
                .in('status', ['reported', 'in_progress']);

            return ApiResponse.success(res, {
                total_apartments: apartments?.length || 0,
                total_units: totalUnits || 0,
                occupied_units: occupiedUnits || 0,
                vacant_units: vacantUnits || 0,
                active_tenants: activeTenants || 0,
                expected_monthly_rent: expectedMonthlyRent,
                rent_collected_this_month: rentCollectedThisMonth,
                expenses_this_month: expensesThisMonth,
                pending_maintenance: pendingMaintenance || 0,
                net_income_this_month: rentCollectedThisMonth - expensesThisMonth
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            return ApiResponse.error(res, 'Failed to load dashboard');
        }
    },

    // Caretaker dashboard
    async caretakerDashboard(req, res) {
        try {
            const { data: assignments } = await supabase
                .from('caretaker_assignments')
                .select('apartment_id')
                .eq('user_id', req.user.id)
                .eq('is_active', true);

            const apartmentIds = assignments?.map(a => a.apartment_id) || [];

            if (apartmentIds.length === 0) {
                return ApiResponse.success(res, {
                    total_apartments: 0,
                    total_units: 0,
                    occupied_units: 0,
                    vacant_units: 0,
                    active_tenants: 0,
                    expected_monthly_rent: 0,
                    rent_collected_this_month: 0,
                    expenses_this_month: 0,
                    pending_maintenance: 0
                });
            }

            const { count: totalUnits } = await supabase
                .from('units')
                .select('*', { count: 'exact', head: true })
                .in('apartment_id', apartmentIds);

            const { count: occupiedUnits } = await supabase
                .from('units')
                .select('*', { count: 'exact', head: true })
                .in('apartment_id', apartmentIds)
                .eq('status', 'occupied');

            const { count: vacantUnits } = await supabase
                .from('units')
                .select('*', { count: 'exact', head: true })
                .in('apartment_id', apartmentIds)
                .eq('status', 'vacant');

            const { data: unitIds } = await supabase
                .from('units')
                .select('id')
                .in('apartment_id', apartmentIds);

            const ids = unitIds?.map(u => u.id) || [];

            const { count: activeTenants } = await supabase
                .from('tenants')
                .select('*', { count: 'exact', head: true })
                .in('unit_id', ids)
                .eq('status', 'active');

            const { data: occupiedUnitsData } = await supabase
                .from('units')
                .select('monthly_rent')
                .in('apartment_id', apartmentIds)
                .eq('status', 'occupied');

            const expectedMonthlyRent = occupiedUnitsData?.reduce((sum, u) => sum + parseFloat(u.monthly_rent), 0) || 0;

            const now = new Date();
            const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

            const { data: thisMonthPayments } = await supabase
                .from('rent_payments')
                .select('amount_paid')
                .in('apartment_id', apartmentIds)
                .gte('payment_date', firstOfMonth);

            const rentCollectedThisMonth = thisMonthPayments?.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0) || 0;

            const { data: thisMonthExpenses } = await supabase
                .from('expenses')
                .select('amount')
                .in('apartment_id', apartmentIds)
                .gte('expense_date', firstOfMonth);

            const expensesThisMonth = thisMonthExpenses?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

            const { count: pendingMaintenance } = await supabase
                .from('maintenance_requests')
                .select('*', { count: 'exact', head: true })
                .in('apartment_id', apartmentIds)
                .in('status', ['reported', 'in_progress']);

            return ApiResponse.success(res, {
                total_apartments: apartmentIds.length,
                total_units: totalUnits || 0,
                occupied_units: occupiedUnits || 0,
                vacant_units: vacantUnits || 0,
                active_tenants: activeTenants || 0,
                expected_monthly_rent: expectedMonthlyRent,
                rent_collected_this_month: rentCollectedThisMonth,
                expenses_this_month: expensesThisMonth,
                pending_maintenance: pendingMaintenance || 0,
                net_income_this_month: rentCollectedThisMonth - expensesThisMonth
            });
        } catch (error) {
            return ApiResponse.error(res, 'Failed to load dashboard');
        }
    },

    // Tenant dashboard (now includes unit_id and apartment_id)
    async tenantDashboard(req, res) {
        try {
            const { data: tenant } = await supabase
                .from('tenants')
                .select('*, units:unit_id(id, unit_number, monthly_rent, apartment_id)')
                .eq('user_id', req.user.id)
                .eq('status', 'active')
                .single();

            if (!tenant) {
                return ApiResponse.success(res, { message: 'No active tenancy found' });
            }

            const { data: payments } = await supabase
                .from('rent_payments')
                .select('*')
                .eq('tenant_id', tenant.id)
                .order('payment_date', { ascending: false });

            const totalPaid = payments?.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0) || 0;

            const leaseStart = new Date(tenant.lease_start_date);
            const now = new Date();
            const monthsDiff = (now.getFullYear() - leaseStart.getFullYear()) * 12 +
                (now.getMonth() - leaseStart.getMonth()) + 1;
            const expectedRent = monthsDiff * parseFloat(tenant.units?.monthly_rent || 0);
            const arrears = Math.max(0, expectedRent - totalPaid);

            const { data: maintenanceRequests } = await supabase
                .from('maintenance_requests')
                .select('*')
                .eq('reported_by', req.user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            return ApiResponse.success(res, {
                tenant: {
                    id: tenant.id,
                    full_name: tenant.full_name,
                    unit_number: tenant.units?.unit_number,
                    monthly_rent: tenant.units?.monthly_rent,
                    unit_id: tenant.unit_id,                    // ← now included
                    apartment_id: tenant.units?.apartment_id,   // ← now included
                    lease_start_date: tenant.lease_start_date,
                    lease_end_date: tenant.lease_end_date
                },
                payment_summary: {
                    total_paid: totalPaid,
                    expected_rent: expectedRent,
                    arrears: arrears,
                    recent_payments: payments?.slice(0, 5) || []
                },
                maintenance_requests: maintenanceRequests || []
            });
        } catch (error) {
            return ApiResponse.error(res, 'Failed to load dashboard');
        }
    }
};

module.exports = dashboardController;
