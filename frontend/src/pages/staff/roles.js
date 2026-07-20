import { apiService } from '../../services/api.service.js';
import { showToast } from '../../components/toast.js';
import { authService } from '../../services/auth.service.js';

const COMMON_ROLES = [
    'Caretaker',
    'Cleaner',
    'Security Guard',
    'Plumber',
    'Electrician',
    'Gardener',
    'Maintenance Technician',
    'Other'
];

export default async function staffRoles(container) {
    if (authService.getRole() !== 'landlord') {
        container.innerHTML = `<div class="error-state"><h2>Access Denied</h2><p>Only landlord can manage staff roles.</p></div>`;
        return;
    }

    // Fetch all staff members to count per role
    let staffMembers = [];
    try {
        const aptRes = await apiService.get('/apartments');
        if (aptRes.success && aptRes.data.length > 0) {
            const apartmentIds = aptRes.data.map(a => a.id);
            const memberPromises = apartmentIds.map(id => apiService.get(`/staff/members/apartment/${id}`));
            const results = await Promise.all(memberPromises);
            results.forEach(res => {
                if (res.success && res.data) {
                    staffMembers = staffMembers.concat(res.data);
                }
            });
        }
    } catch (e) { /* ignore */ }

    // Count members per role
    const roleCounts = {};
    staffMembers.forEach(m => {
        const roleId = m.staff_role_id;
        roleCounts[roleId] = (roleCounts[roleId] || 0) + 1;
    });

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Staff Roles</h3>
                <button class="btn btn-primary" id="add-role-btn">
                    <i class="fas fa-plus"></i> Add Role
                </button>
            </div>
            <div class="filter-bar">
                <div class="search-bar" style="flex:1;">
                    <i class="fas fa-search"></i>
                    <input type="text" class="form-input" id="role-search" placeholder="Search roles...">
                </div>
            </div>
            <div id="roles-table" class="table-container">
                <div class="page-loader"><div class="spinner"></div></div>
            </div>
        </div>`;

    document.getElementById('add-role-btn').addEventListener('click', openAddRole);

    const searchInput = container.querySelector('#role-search');
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadRoles, 300);
    });

    await loadRoles();

    async function loadRoles() {
        try {
            const response = await apiService.get('/staff/roles');
            let roles = response.success ? response.data : [];
            const searchTerm = searchInput.value.trim().toLowerCase();

            if (searchTerm) {
                roles = roles.filter(r => r.role_name.toLowerCase().includes(searchTerm));
            }

            const table = document.getElementById('roles-table');

            if (roles.length === 0) {
                table.innerHTML = `<div class="empty-state"><h3>No roles found</h3></div>`;
                return;
            }

            table.innerHTML = `
                <table class="table">
                    <thead>
                        <tr><th>Role Name</th><th>Description</th><th>Staff Count</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${roles.map(r => {
                            const count = roleCounts[r.id] || 0;
                            return `
                            <tr>
                                <td>${r.role_name}</td>
                                <td>${r.description || '-'}</td>
                                <td>
                                    <span class="badge badge-info" style="cursor:pointer;" 
                                          onclick="window.router.navigate('/staff/members?role=${r.id}')">
                                        ${count} staff
                                    </span>
                                </td>
                                <td>
                                    <div class="table-actions">
                                        <button class="edit-role-btn" data-id="${r.id}" data-name="${r.role_name.replace(/'/g, "&#39;")}" data-desc="${(r.description || '').replace(/'/g, "&#39;")}">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="delete-role-btn" data-id="${r.id}">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>`;

            // Event delegation
            table.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-role-btn');
                if (editBtn) {
                    const id = editBtn.dataset.id;
                    const name = editBtn.dataset.name.replace(/&#39;/g, "'");
                    const desc = editBtn.dataset.desc.replace(/&#39;/g, "'");
                    editRole(id, name, desc);
                    return;
                }
                const deleteBtn = e.target.closest('.delete-role-btn');
                if (deleteBtn) {
                    deleteRole(deleteBtn.dataset.id);
                    return;
                }
            });

        } catch (e) {
            document.getElementById('roles-table').innerHTML = `<div class="error-state"><p>${e.message}</p></div>`;
        }
    }

    // --- Add / Edit / Delete functions (unchanged except for minor improvements) ---
    function openAddRole() {
        import('../../components/modal.js').then(({ showFormModal }) => {
            const formHtml = `
                <div class="form-group">
                    <label class="form-label">Role Name</label>
                    <select class="form-select" id="role-select">
                        ${COMMON_ROLES.map(r => `<option value="${r}">${r}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" id="custom-role-group" style="display:none;">
                    <label class="form-label">Custom Role Name</label>
                    <input class="form-input" id="custom-role-name" placeholder="Enter custom role">
                </div>
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <input class="form-input" id="role-desc" placeholder="Optional">
                </div>`;

            showFormModal('Add Role', formHtml, async (overlay) => {
                const select = overlay.querySelector('#role-select');
                const customGroup = overlay.querySelector('#custom-role-group');
                const customInput = overlay.querySelector('#custom-role-name');

                select.addEventListener('change', () => {
                    customGroup.style.display = select.value === 'Other' ? 'block' : 'none';
                });

                const roleName = select.value === 'Other' ? customInput.value.trim() : select.value;
                const description = overlay.querySelector('#role-desc').value.trim();

                if (!roleName) {
                    showToast('Role name is required', 'error');
                    return false;
                }

                try {
                    await apiService.post('/staff/roles', { role_name: roleName, description });
                    showToast('Role added', 'success');
                    loadRoles();
                } catch (e) {
                    showToast(e.message, 'error');
                    return false;
                }
            });
        });
    }

    async function editRole(id, currentName, currentDesc) {
        const { showFormModal } = await import('../../components/modal.js');
        const isCommon = COMMON_ROLES.includes(currentName);

        const formHtml = `
            <div class="form-group">
                <label class="form-label">Role Name</label>
                <select class="form-select" id="edit-role-select">
                    ${COMMON_ROLES.map(r => `<option value="${r}" ${r === currentName || (r === 'Other' && !isCommon) ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
            </div>
            <div class="form-group" id="edit-custom-role-group" style="display:${isCommon ? 'none' : 'block'};">
                <label class="form-label">Custom Role Name</label>
                <input class="form-input" id="edit-custom-role-name" value="${isCommon ? '' : currentName}">
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <input class="form-input" id="edit-role-desc" value="${currentDesc}">
            </div>`;

        showFormModal('Edit Role', formHtml, async (overlay) => {
            const select = overlay.querySelector('#edit-role-select');
            const customGroup = overlay.querySelector('#edit-custom-role-group');
            const customInput = overlay.querySelector('#edit-custom-role-name');

            select.addEventListener('change', () => {
                customGroup.style.display = select.value === 'Other' ? 'block' : 'none';
            });

            const roleName = select.value === 'Other' ? customInput.value.trim() : select.value;
            const description = overlay.querySelector('#edit-role-desc').value.trim();

            if (!roleName) {
                showToast('Role name is required', 'error');
                return false;
            }

            try {
                await apiService.put(`/staff/roles/${id}`, { role_name: roleName, description });
                showToast('Role updated', 'success');
                loadRoles();
            } catch (e) {
                showToast(e.message, 'error');
                return false;
            }
        });
    }

    async function deleteRole(id) {
        const { showConfirm } = await import('../../components/modal.js');
        showConfirm('Delete Role', 'Are you sure? This will deactivate the role.', async () => {
            try {
                await apiService.delete(`/staff/roles/${id}`);
                showToast('Role deactivated', 'success');
                loadRoles();
            } catch (e) {
                showToast(e.message, 'error');
            }
        });
    }
}
