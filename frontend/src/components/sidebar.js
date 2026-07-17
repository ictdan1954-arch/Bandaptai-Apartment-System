import { authService } from '../services/auth.service.js';
import { router } from '../router.js';

export function setupSidebar() {
    const nav = document.getElementById('sidebar-nav');
    const role = authService.getRole();

    const menuItems = getMenuItems(role);
    renderNav(nav, menuItems);

    // Highlight active link
    updateActiveLink();
    window.addEventListener('hashchange', updateActiveLink);
}

function getMenuItems(role) {
    const landlordMenu = [
        { section: 'MAIN', items: [
            { icon: 'fa-th-large', text: 'Dashboard', href: '/dashboard' },
        ]},
        { section: 'PROPERTIES', items: [
            { icon: 'fa-building', text: 'Apartments', href: '/apartments' },
            { icon: 'fa-door-open', text: 'Units', href: '/units/all' },
        ]},
        { section: 'PEOPLE', items: [
            { icon: 'fa-users', text: 'Tenants', href: '/tenants' },
            { icon: 'fa-user-tie', text: 'Staff Roles', href: '/staff/roles' },
            { icon: 'fa-user-friends', text: 'Staff Members', href: '/staff/members' },
        ]},
        { section: 'FINANCES', items: [
            { icon: 'fa-money-bill-wave', text: 'Rent Payments', href: '/payments/rent' },
            { icon: 'fa-hand-holding-usd', text: 'Staff Salaries', href: '/payments/salaries' },
            { icon: 'fa-receipt', text: 'Expenses', href: '/expenses' },
        ]},
        { section: 'MANAGEMENT', items: [
            { icon: 'fa-tools', text: 'Maintenance', href: '/maintenance' },
        ]},
    ];

    const caretakerMenu = [
        { section: 'MAIN', items: [
            { icon: 'fa-th-large', text: 'Dashboard', href: '/dashboard' },
        ]},
        { section: 'PROPERTIES', items: [
            { icon: 'fa-building', text: 'My Apartments', href: '/apartments' },
            { icon: 'fa-door-open', text: 'Units', href: '/units/all' },
        ]},
        { section: 'PEOPLE', items: [
            { icon: 'fa-users', text: 'Tenants', href: '/tenants' },
            { icon: 'fa-user-friends', text: 'Staff Members', href: '/staff/members' },
        ]},
        { section: 'FINANCES', items: [
            { icon: 'fa-money-bill-wave', text: 'Rent Payments', href: '/payments/rent' },
            { icon: 'fa-hand-holding-usd', text: 'Staff Salaries', href: '/payments/salaries' },
            { icon: 'fa-receipt', text: 'Expenses', href: '/expenses' },
        ]},
        { section: 'MANAGEMENT', items: [
            { icon: 'fa-tools', text: 'Maintenance', href: '/maintenance' },
        ]},
    ];

    const tenantMenu = [
        { section: 'MAIN', items: [
            { icon: 'fa-th-large', text: 'Dashboard', href: '/dashboard' },
        ]},
        { section: 'MY STUFF', items: [
            { icon: 'fa-history', text: 'Payment History', href: '/tenants/my' },
            { icon: 'fa-tools', text: 'Maintenance', href: '/maintenance/tenant' },
        ]},
    ];

    if (role === 'landlord') return landlordMenu;
    if (role === 'caretaker') return caretakerMenu;
    if (role === 'tenant') return tenantMenu;
    return [];
}

function renderNav(container, menuItems) {
    let html = '';
    menuItems.forEach(section => {
        html += `<div class="nav-section">
            <div class="nav-section-title">${section.section}</div>`;
        section.items.forEach(item => {
            html += `
                <a class="nav-link" href="#${item.href}" data-href="${item.href}">
                    <i class="fas ${item.icon}"></i>
                    <span class="nav-text">${item.text}</span>
                </a>`;
        });
        html += `</div>`;
    });
    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            // Mobile: close sidebar after click
            document.getElementById('sidebar').classList.remove('open');
        });
    });
}

function updateActiveLink() {
    const currentHash = window.location.hash.slice(1) || '/dashboard';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.dataset.href;
        link.classList.remove('active');
        if (currentHash.startsWith(href) || (href === '/dashboard' && currentHash === '/dashboard')) {
            link.classList.add('active');
        }
    });
}
