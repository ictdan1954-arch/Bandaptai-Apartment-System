const supabase = require('../config/supabase');
const ApiResponse = require('../utils/response');
const { validateRequired } = require('../utils/validators');

const unitController = {
    // Create unit
    async create(req, res) {
        try {
            const { apartment_id, unit_number, unit_type, monthly_rent, deposit_amount } = req.body;
            const missing = validateRequired(req.body, ['apartment_id', 'unit_number', 'unit_type', 'monthly_rent']);
            if (missing.length > 0) {
                return ApiResponse.badRequest(res, `Missing fields: ${missing.join(', ')}`);
            }

            // Check if unit number exists in this apartment
            const { data: existing } = await supabase
                .from('units')
                .select('id')
                .eq('apartment_id', apartment_id)
                .eq('unit_number', unit_number)
                .maybeSingle();

            if (existing) {
                return ApiResponse.badRequest(res, 'Unit number already exists in this apartment');
            }

            const { data: unit, error } = await supabase
                .from('units')
                .insert([{
                    apartment_id,
                    unit_number,
                    unit_type,
                    monthly_rent,
                    deposit_amount: deposit_amount || 0
                }])
                .select('*')
                .single();

            if (error) throw error;

            return ApiResponse.created(res, unit, 'Unit created successfully');
        } catch (error) {
            return ApiResponse.error(res, 'Failed to create unit');
        }
    },

    // Get all units for an apartment
    async getByApartment(req, res) {
        try {
            const { apartmentId } = req.params;

            let query = supabase
                .from('units')
                .select(`
                    *,
                    tenants:tenants(id, full_name, phone, status)
                `)
                .eq('apartment_id', apartmentId)
                .order('unit_number');

            // Apply filters
            const { status, type, search } = req.query;
            if (status) query = query.eq('status', status);
            if (type) query = query.eq('unit_type', type);
            if (search) query = query.ilike('unit_number', `%${search}%`);

            const { data: units, error } = await query;

            if (error) throw error;

            // Get active tenant for each unit
            const formattedUnits = units.map(unit => ({
                ...unit,
                current_tenant: unit.tenants?.find(t => t.status === 'active') || null,
                tenants: undefined
            }));

            return ApiResponse.success(res, formattedUnits);
        } catch (error) {
            return ApiResponse.error(res, 'Failed to fetch units');
        }
    },

    // Get single unit
    async getById(req, res) {
        try {
            const { id } = req.params;

            const { data: unit, error } = await supabase
                .from('units')
                .select(`
                    *,
                    apartments:apartment_id(id, name, location),
                    tenants:tenants(*)
                `)
                .eq('id', id)
                .single();

            if (error || !unit) {
                return ApiResponse.notFound(res, 'Unit not found');
            }

            return ApiResponse.success(res, unit);
        } catch (error) {
            return ApiResponse.error(res, 'Failed to fetch unit');
        }
    },

    // Update unit
    async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = {};

            const allowedFields = ['unit_number', 'unit_type', 'monthly_rent', 'deposit_amount', 'status'];
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updateData[field] = req.body[field];
                }
            });

            const { data: unit, error } = await supabase
                .from('units')
                .update(updateData)
                .eq('id', id)
                .select('*')
                .single();

            if (error) throw error;

            return ApiResponse.success(res, unit, 'Unit updated successfully');
        } catch (error) {
            return ApiResponse.error(res, 'Failed to update unit');
        }
    },

    // Delete unit
    async delete(req, res) {
        try {
            const { id } = req.params;

            // Check if unit has active tenants
            const { data: activeTenants } = await supabase
                .from('tenants')
                .select('id')
                .eq('unit_id', id)
                .eq('status', 'active');

            if (activeTenants && activeTenants.length > 0) {
                return ApiResponse.badRequest(res, 'Cannot delete unit with active tenants');
            }

            const { error } = await supabase
                .from('units')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return ApiResponse.success(res, null, 'Unit deleted successfully');
        } catch (error) {
            return ApiResponse.error(res, 'Failed to delete unit');
        }
    }
};

module.exports = unitController;
