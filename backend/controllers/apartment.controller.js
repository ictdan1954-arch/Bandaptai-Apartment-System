const supabase = require('../config/supabase');
const ApiResponse = require('../utils/response');
const { validateRequired } = require('../utils/validators');

const apartmentController = {
    // Create apartment (Landlord only)
    async create(req, res) {
        try {
            const { name, location, description } = req.body;
            const missing = validateRequired(req.body, ['name', 'location']);
            if (missing.length > 0) {
                return ApiResponse.badRequest(res, `Missing fields: ${missing.join(', ')}`);
            }

            const { data: apartment, error } = await supabase
                .from('apartments')
                .insert([{
                    name,
                    location,
                    description: description || null,
                    created_by: req.user.id
                }])
                .select('*')
                .single();

            if (error) {
                console.error('Create apartment error:', error);
                return ApiResponse.error(res, 'Failed to create apartment');
            }

            return ApiResponse.created(res, apartment, 'Apartment created successfully');
        } catch (error) {
            return ApiResponse.error(res, 'Failed to create apartment');
        }
    },

    // Get all apartments
    async getAll(req, res) {
        try {
            let query = supabase.from('apartments').select('*');

            // Caretaker sees only assigned apartments
            if (req.user.role === 'caretaker') {
                const { data: assignments } = await supabase
                    .from('caretaker_assignments')
                    .select('apartment_id')
                    .eq('user_id', req.user.id)
                    .eq('is_active', true);

                const apartmentIds = assignments?.map(a => a.apartment_id) || [];
                if (apartmentIds.length === 0) {
                    return ApiResponse.success(res, []);
                }
                query = query.in('id', apartmentIds);
            }

            const { data: apartments, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            return ApiResponse.success(res, apartments);
        } catch (error) {
            return ApiResponse.error(res, 'Failed to fetch apartments');
        }
    },

    // Get single apartment
    async getById(req, res) {
        try {
            const { id } = req.params;

            const { data: apartment, error } = await supabase
                .from('apartments')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !apartment) {
                return ApiResponse.notFound(res, 'Apartment not found');
            }

            // Get unit count
            const { count: unitCount } = await supabase
                .from('units')
                .select('*', { count: 'exact', head: true })
                .eq('apartment_id', id);

            // Get tenant count
            const { count: tenantCount } = await supabase
                .from('tenants')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active')
                .in('unit_id', (await supabase.from('units').select('id').eq('apartment_id', id)).data?.map(u => u.id) || []);

            return ApiResponse.success(res, {
                ...apartment,
                unit_count: unitCount || 0,
                tenant_count: tenantCount || 0
            });
        } catch (error) {
            return ApiResponse.error(res, 'Failed to fetch apartment');
        }
    },

    // Update apartment
    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, location, description, status } = req.body;

            const { data: apartment, error } = await supabase
                .from('apartments')
                .update({
                    name: name || undefined,
                    location: location || undefined,
                    description: description !== undefined ? description : undefined,
                    status: status || undefined
                })
                .eq('id', id)
                .select('*')
                .single();

            if (error) {
                return ApiResponse.error(res, 'Failed to update apartment');
            }

            return ApiResponse.success(res, apartment, 'Apartment updated successfully');
        } catch (error) {
            return ApiResponse.error(res, 'Failed to update apartment');
        }
    },

    // Delete apartment
    async delete(req, res) {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('apartments')
                .delete()
                .eq('id', id);

            if (error) {
                return ApiResponse.error(res, 'Failed to delete apartment');
            }

            return ApiResponse.success(res, null, 'Apartment deleted successfully');
        } catch (error) {
            return ApiResponse.error(res, 'Failed to delete apartment');
        }
    },

    // Assign caretaker to apartment
    async assignCaretaker(req, res) {
        try {
            const { apartmentId } = req.params;
            const { user_id } = req.body;

            const missing = validateRequired(req.body, ['user_id']);
            if (missing.length > 0) {
                return ApiResponse.badRequest(res, 'Missing user_id');
            }

            // Verify caretaker exists
            const { data: caretaker } = await supabase
                .from('users')
                .select('id, role')
                .eq('id', user_id)
                .eq('role', 'caretaker')
                .single();

            if (!caretaker) {
                return ApiResponse.badRequest(res, 'Invalid caretaker');
            }

            // Check if already assigned
            const { data: existing } = await supabase
                .from('caretaker_assignments')
                .select('id')
                .eq('user_id', user_id)
                .eq('apartment_id', apartmentId)
                .maybeSingle();

            if (existing) {
                return ApiResponse.badRequest(res, 'Caretaker already assigned to this apartment');
            }

            const { data: assignment, error } = await supabase
                .from('caretaker_assignments')
                .insert([{
                    user_id,
                    apartment_id: apartmentId
                }])
                .select('*')
                .single();

            if (error) throw error;

            return ApiResponse.created(res, assignment, 'Caretaker assigned successfully');
        } catch (error) {
            return ApiResponse.error(res, 'Failed to assign caretaker');
        }
    },

    // Get apartment caretakers – now includes username
    async getCaretakers(req, res) {
        try {
            const { apartmentId } = req.params;

            const { data, error } = await supabase
                .from('caretaker_assignments')
                .select('*, users(id, full_name, phone, email, username)')
                .eq('apartment_id', apartmentId)
                .eq('is_active', true);

            if (error) throw error;

            return ApiResponse.success(res, data);
        } catch (error) {
            return ApiResponse.error(res, 'Failed to fetch caretakers');
        }
    },

    // Remove caretaker assignment
    async removeCaretaker(req, res) {
        try {
            const { assignmentId } = req.params;

            const { error } = await supabase
                .from('caretaker_assignments')
                .update({ is_active: false })
                .eq('id', assignmentId);

            if (error) throw error;

            return ApiResponse.success(res, null, 'Caretaker removed successfully');
        } catch (error) {
            return ApiResponse.error(res, 'Failed to remove caretaker');
        }
    }
};

module.exports = apartmentController;
