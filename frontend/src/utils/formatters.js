export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

export function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

export function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function capitalize(str) {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function statusClass(status) {
    const map = {
        active: 'success',
        occupied: 'success',
        vacant: 'info',
        under_maintenance: 'warning',
        moved_out: 'secondary',
        blacklisted: 'danger',
        reported: 'warning',
        in_progress: 'info',
        resolved: 'success',
        cancelled: 'secondary',
        suspended: 'warning',
        terminated: 'danger'
    };
    return map[status] || 'primary';
}
