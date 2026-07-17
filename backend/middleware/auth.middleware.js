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

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return ApiResponse.unauthorized(res, 'Token expired');
        }
        return ApiResponse.unauthorized(res, 'Invalid token');
    }
};

module.exports = authenticate;
