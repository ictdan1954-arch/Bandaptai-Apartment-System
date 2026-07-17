const supabase = require('../config/supabase');
const ApiResponse = require('../utils/response');
const { validateRequired } = require('../utils/validators');

const maintenanceController = {
    // Create maintenance request
    async create(req, res) {
        try {
            const { unit_id, apartment_id, title, description, priority } = req.body;
            const missing = validateRequired(req.body, ['unit_id', 'apartment_id', 'title']);
            if (missing.length > 0) {
                return ApiResponse.badRequest(res, `Missing fields: ${missing.join(', ')}`);
            }

            const { data: request, error } = await supabase
                .from('maintenance_requests')
                .insert([{
                    unit_id,
                    apartment_id,
                    reported_by: req.user.id,
                    title,
                    description: description || null,
                    priority: priority || 'medium'
                }])
                .select('*')
                .single();

            if (error) throw error;

            // Notify caretakers
            const { data: caretakers } = await supabase
                .from('caretaker_assignments')
                .select('user_id')
                .eq('apartment_id', apartment_id)
                .eq('is_active', true);

            if (caretakers) {
                const notifications = caretakers.map(c => ({
                    user_id: c.user_id,
                    title: 'New Maintenance Request',
                    message: `${title} - reported for unit ${unit_id}`,
                    type: 'maintenance_update',
                    link: `/maintenance/${request.id}`
                }));
                await supabase.from('notifications').insert(notifications);
            }

            return ApiResponse.created(res, request, 'Maintenance request submitted successfully');
        } catch (error) {
            return ApiResponse.error(res, 'Failed to submit maintenance request');
        }
    },

    // Get maintenance requests for an apartment
    async getByApartment(req, res) {
        try {
            const { apartmentId } = req.params;
            const { status, priority } = req.query;

            let query = supabase
                .from('maintenance_requests')
                .select(`
                    *,
                    units:unit_id(id, unit_number),
                    reported_by_user:reported_by(id, full_name)
                `)
                .eq('apartment_id', apartmentId);

            if (status) query = query.eq('status', status);
            if (priority) query = query.eq('priority', priority);

            const { data: requests, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            return ApiResponse.success(res, requests);
        } catch (error) {
            return ApiResponse.error(res, 'Failed to fetch maintenance requests');
        }
    },

    // Get single maintenance request
    async getById(req, res) {
        try {
            const { id } = req.params;

            const { data: request, error } = await supabase
                .from('maintenance_requests')
                .select(`
                    *,
                    units:unit_id(*),
                    reported_by_user:reported_by(id, full_name, phone)
                `)
                .eq('id', id)
                .single();

            if (error || !request) {
                return ApiResponse.notFound(res, 'Maintenance request not found');
            }

            return ApiResponse.success(res, request);
        } catch (error) {
            return ApiResponse.error(res, 'Failed to fetch maintenance request');
        }
    },

    // Get tenant's own requests
    async getMyRequests(req, res) {
        try {
            const { data: requests, error } = await supabase
                .from('maintenance_requests')
                .select('*, units:unit_id(id, unit_number)')
                .eq('reported_by', req.user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return ApiResponse.success(res, requests);
        } catch (error) {
            return ApiResponse.error(res, 'Failed to fetch your requests');
        }
    },

    // Update maintenance request
    async update(req, res) {
        try {
            const { id } = req.params;
            const updateData = {};

            const allowedFields = ['title', 'description', 'priority', 'status', 'assigned_to', 'cost_incurred', 'date_resolved'];
            allowedFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    updateData[field] = req.body[field];
                }
            });

            // Auto-set date_resolved when status changes to resolved
            if (req.body.status === 'resolved') {
                updateData.date_resolved = new Date().toISOString().split('T')[0];
            }

            const { data: request, error } = await supabase
                .from('maintenance_requests')
                .update(updateData)
                .eq('id', id)
                .select('*')
                .single();

            if (error) throw error;

            // Notify tenant of status change
            if (req.body.status && request) {
                await supabase.from('notifications').insert([{
                    user_id: request.reported_by,
                    title: 'Maintenance Update',
                    message: `Your request "${request.title}" is now ${req.body.status}`,
                    type: 'maintenance_update',
                    link: `/maintenance/${id}`
                }]);
            }

            return ApiResponse.success(res, request, 'Maintenance request updated successfully');
        } catch (error) {
            return ApiResponse.error(res, 'Failed to update maintenance request');
        }
    },

    // Delete maintenance request
    async delete(req, res) {
        try {
            const { id } = req.params;

            const { error } = await supabase
                .from('maintenance_requests')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return ApiResponse.success(res, null, 'Maintenance request deleted');
        } catch (error) {
            return ApiResponse.error(res, 'Failed to delete maintenance request');
        }
    }
};

module.exports = maintenanceController;
