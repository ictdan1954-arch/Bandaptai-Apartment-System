export function validateRequired(values, fields) {
    const errors = {};
    fields.forEach(field => {
        if (!values[field] || (typeof values[field] === 'string' && values[field].trim() === '')) {
            errors[field] = 'This field is required';
        }
    });
    return errors;
}

export function validatePhone(phone) {
    const re = /^\+?[\d\s-]{10,15}$/;
    return re.test(phone);
}

export function validateEmail(email) {
    if (!email) return true; // Optional
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}
