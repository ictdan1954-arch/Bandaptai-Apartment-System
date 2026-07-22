const { verifyToken } = require('../config/jwt');
const ApiResponse = require('../utils/response');

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return ApiResponse.unauthorized(res, 'No token provided');
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        // Attach user details from the token to the request
        req.user = {
            id: decoded.id,
            role: decoded.role,
            staff_role: decoded.staff_role || null,   // ✅ sub‑role for staff (cleaner, etc.)
            full_name: decoded.full_name || null,
            phone: decoded.phone || null,
            email: decoded.email || null
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return ApiResponse.unauthorized(res, 'Token expired');
        }
        return ApiResponse.unauthorized(res, 'Invalid token');
    }
};

module.exports = authenticate;
