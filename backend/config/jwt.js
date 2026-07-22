const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (payload) => {
    return jwt.sign(
        {
            id: payload.id,
            email: payload.email || null,
            phone: payload.phone || null,
            role: payload.role,
            full_name: payload.full_name || null,
            staff_role: payload.staff_role || null   // <-- NEW: sub‑role for staff
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
};

const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

module.exports = { generateToken, verifyToken, JWT_SECRET };
