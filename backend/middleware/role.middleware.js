const ApiResponse = require('../utils/response');

/**
 * Role-based authorization middleware.
 * Supports both main user roles (landlord, caretaker, tenant, staff) 
 * and staff sub‑roles (cleaner, electrician, gardener, plumber, etc.).
 *
 * Usage:
 *   authorize('landlord')                → only landlord
 *   authorize('caretaker', 'staff')      → caretaker or staff
 *   authorize('cleaner')                 → staff with staff_role = 'cleaner'
 */
const authorize = (...roles) => {
    return async (req, res, next) => {
        // 1. Check authentication
        if (!req.user) {
            return ApiResponse.unauthorized(res, 'Not authenticated');
        }

        // 2. If the user's main role matches, allow immediately
        if (roles.includes(req.user.role)) {
            return next();
        }

        // 3. For staff members, check their staff_role (if available)
        //    This allows granular permissions like 'cleaner', 'electrician', etc.
        if (req.user.staff_role && roles.includes(req.user.staff_role)) {
            return next();
        }

        // 4. If the user is staff and we need to check specific staff_role,
        //    we can also fetch it from the database if not attached.
        //    (Optimization: attach staff_role during login)
        if (req.user.role === 'staff' && !req.user.staff_role) {
            // Optionally, you could query the staff_members table here
            // to get the staff_role, but it's better to attach it during auth.
            // For now, we'll just deny if not present.
        }

        // 5. No match → forbidden
        return ApiResponse.forbidden(res, 'You do not have permission to perform this action');
    };
};

module.exports = authorize;
