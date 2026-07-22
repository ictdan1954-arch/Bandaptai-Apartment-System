import { apiService } from '../../services/api.service.js';
import { authService } from '../../services/auth.service.js';
import { formatDate, formatCurrency } from '../../utils/formatters.js';
import { showToast } from '../../components/toast.js';
import { router } from '../../router.js';

export default async function cleanerDashboard(container) {
    const user = authService.user;
    const cleanerId = user.staff_id;

    container.innerHTML = `<div class="page-loader"><div class="spinner"></div></div>`;

    try {
        // Fetch all data in parallel
        const [tasksRes, teamRes, suppliesRes, salaryRes, notificationsRes] = await Promise.all([
            apiService.get('/cleaning/tasks/today'),
            apiService.get('/cleaning/team'),
            apiService.get('/cleaning/supplies'),
            apiService.get('/cleaning/salaries'),
            apiService.get('/cleaning/notifications?unread_only=true')
        ]);

        const tasksData = tasksRes.success ? tasksRes.data : { tasks: [], completed: 0, total: 0 };
        const team = teamRes.success ? teamRes.data : [];
        const supplies = suppliesRes.success ? suppliesRes.data : [];
        const salaryData = salaryRes.success ? salaryRes.data : { salaries: [], total_paid: 0 };
        const unreadNotifications = notificationsRes.success ? notificationsRes.data : [];

        // Filter tasks by status
        const pendingTasks = tasksData.tasks?.filter(t => t.status === 'pending') || [];
        const inProgressTasks = tasksData.tasks?.filter(t => t.status === 'in_progress') || [];
        const completedCount = tasksData.completed || 0;

        // Find low supplies
        const lowSupplies = supplies.filter(s => s.is_low);

        // Get latest salary
        const latestSalary = salaryData.salaries?.[0] || null;

        // Render Dashboard
        container.innerHTML = `
            <div class="cleaner-dashboard">
                <!-- Welcome Section -->
                <div class="tenant-info-card" style="background: linear-gradient(145deg, #5E7A8E 0%, #A84A3A 100%);">
                    <div class="tenant-name">🧹 Good Morning, ${user.full_name}</div>
                    <div class="tenant-details">
                        <span class="unit-badge">Apartment: ${user.apartment_name || 'N/A'}</span>
                    </div>
                    <div class="mt-2" style="display:flex; gap:20px; flex-wrap:wrap; color: rgba(255,255,255,0.85);">
                        <div><i class="fas fa-tasks"></i> Today's Tasks: <strong>${tasksData.total || 0}</strong></div>
                        <div><i class="fas fa-check-circle"></i> Completed: <strong>${completedCount}</strong></div>
                        ${unreadNotifications.length > 0 ? `
                            <div><i class="fas fa-bell"></i> Notifications: <strong style="color:#FFD700;">${unreadNotifications.length}</strong></div>
                        ` : ''}
                    </div>
                </div>

                <!-- Today's Tasks -->
                <div class="card mb-2">
                    <div class="card-header">
                        <h3 class="card-title">📋 Today's Tasks</h3>
                        <span class="badge badge-primary">${tasksData.total || 0} total</span>
                    </div>
                    ${pendingTasks.length === 0 && inProgressTasks.length === 0 ? `
                        <p class="text-muted p-2">No tasks assigned for today. Great job! 🎉</p>
                    ` : `
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            ${inProgressTasks.map(task => `
                                <div class="info-card" style="border-left: 3px solid var(--warning);">
                                    <div class="info-card-icon"><i class="fas fa-spinner fa-pulse"></i></div>
                                    <div class="info-card-content">
                                        <h4>${task.area_type} - ${task.unit_id ? `Unit ${task.unit_id}` : 'Common Area'}</h4>
                                        <p>${task.notes || 'No notes'}</p>
                                        <small class="text-muted">Assigned by: ${task.assigned_by_user?.full_name || 'N/A'}</small>
                                    </div>
                                    <button class="btn btn-success btn-sm" onclick="window.completeTask('${task.id}')">
                                        Complete
                                    </button>
                                </div>
                            `).join('')}
                            ${pendingTasks.map(task => `
                                <div class="info-card" style="border-left: 3px solid var(--primary);">
                                    <div class="info-card-icon"><i class="fas fa-clock"></i></div>
                                    <div class="info-card-content">
                                        <h4>${task.area_type} - ${task.unit_id ? `Unit ${task.unit_id}` : 'Common Area'}</h4>
                                        <p>${task.notes || 'No notes'}</p>
                                        <small class="text-muted">Assigned by: ${task.assigned_by_user?.full_name || 'N/A'}</small>
                                    </div>
                                    <button class="btn btn-primary btn-sm" onclick="window.startTask('${task.id}')">
                                        Start
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <!-- Team View -->
                <div class="card mb-2">
                    <div class="card-header">
                        <h3 class="card-title">👥 Team - Other Cleaners</h3>
                        <span class="badge badge-info">${team.length} cleaners</span>
                    </div>
                    ${team.length === 0 ? `
                        <p class="text-muted p-2">No other cleaners in your apartment.</p>
                    ` : `
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
                            ${team.map(member => `
                                <div class="stat-card" style="flex-direction:column; align-items:flex-start; gap:8px;">
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <div style="width:40px; height:40px; border-radius:50%; background:var(--primary-bg); display:flex; align-items:center; justify-content:center; color:var(--primary);">
                                            <i class="fas fa-user"></i>
                                        </div>
                                        <div>
                                            <strong>${member.full_name}</strong>
                                            <div class="text-muted" style="font-size:0.8rem;">
                                                ${member.tasks_today?.inProgress > 0 ? '🔄 In progress' : 
                                                  member.tasks_today?.completed === member.tasks_today?.total && member.tasks_today?.total > 0 ? '✅ Done' : 
                                                  '⏳ Pending'}
                                            </div>
                                        </div>
                                    </div>
                                    <div style="width:100%; display:flex; justify-content:space-between; font-size:0.8rem;">
                                        <span>Today: ${member.tasks_today?.completed || 0}/${member.tasks_today?.total || 0}</span>
                                        <span class="text-muted">${member.status}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <!-- Supplies & Actions -->
                <div class="dashboard-grid">
                    <!-- Supplies -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">🧴 Cleaning Supplies</h3>
                            <button class="btn btn-primary btn-sm" onclick="window.openSupplyRequest()">
                                <i class="fas fa-plus"></i> Request
                            </button>
                        </div>
                        ${supplies.length === 0 ? `
                            <p class="text-muted p-2">No supplies recorded.</p>
                        ` : `
                            <div style="display:flex; flex-direction:column; gap:8px;">
                                ${supplies.map(item => `
                                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-light);">
                                        <span>${item.item_name}</span>
                                        <span style="color: ${item.is_low ? 'var(--danger)' : 'var(--secondary)'};">
                                            ${item.quantity} ${item.is_low ? '⚠️' : '✅'}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                        ${lowSupplies.length > 0 ? `
                            <div class="arrears-alert" style="margin-top:12px; padding:12px;">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span style="font-size:0.85rem;">
                                    <strong>Low supplies:</strong> ${lowSupplies.map(s => s.item_name).join(', ')}
                                </span>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Salary -->
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">💰 My Salary</h3>
                        </div>
                        ${latestSalary ? `
                            <div style="display:flex; flex-direction:column; gap:8px;">
                                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-light);">
                                    <span>This Month</span>
                                    <strong>${formatCurrency(latestSalary.amount_paid)}</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border-light);">
                                    <span>Total Received</span>
                                    <strong>${formatCurrency(salaryData.total_paid)}</strong>
                                </div>
                                <div style="display:flex; justify-content:space-between; padding:8px 0;">
                                    <span>Last Payment</span>
                                    <span class="text-muted">${formatDate(latestSalary.payment_date)}</span>
                                </div>
                            </div>
                        ` : `
                            <p class="text-muted p-2">No salary records found.</p>
                        `}
                        <button class="btn btn-secondary btn-sm mt-2" onclick="window.router.navigate('/cleaning/salary')">
                            View Full History
                        </button>
                    </div>
                </div>

                <!-- Messages with Caretaker -->
                <div class="card mt-2">
                    <div class="card-header">
                        <h3 class="card-title">💬 Messages</h3>
                        <button class="btn btn-primary btn-sm" onclick="window.openMessageModal()">
                            <i class="fas fa-pen"></i> New Message
                        </button>
                    </div>
                    <div id="message-list">
                        <p class="text-muted p-2">Loading messages...</p>
                    </div>
                </div>
            </div>
        `;

        // Load messages
        loadMessages();

        // Make functions globally accessible
        window.completeTask = async (taskId) => completeTask(taskId);
        window.startTask = async (taskId) => startTask(taskId);
        window.openSupplyRequest = () => openSupplyRequest(container);
        window.openMessageModal = () => openMessageModal(container);
        window.router = router;

    } catch (error) {
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <h2>Failed to load dashboard</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary">Retry</button>
            </div>`;
    }

    // =============================================
    // LOAD MESSAGES
    // =============================================
    async function loadMessages() {
        try {
            const res = await apiService.get('/cleaning/messages');
            const messageList = document.getElementById('message-list');

            if (!res.success || !res.data || res.data.length === 0) {
                messageList.innerHTML = `<p class="text-muted p-2">No messages yet.</p>`;
                return;
            }

            const messages = res.data.slice(0, 5);
            messageList.innerHTML = messages.map(msg => `
                <div class="info-card mb-1" style="${!msg.is_read && msg.receiver_id === authService.user?.id ? 'border-left: 3px solid var(--primary);' : ''}">
                    <div class="info-card-icon"><i class="fas fa-envelope"></i></div>
                    <div class="info-card-content">
                        <h4>${msg.sender?.full_name || 'Unknown'} → ${msg.receiver?.full_name || 'Unknown'}</h4>
                        <p>${msg.message}</p>
                        <small class="text-muted">${formatDate(msg.created_at)}</small>
                    </div>
                </div>
            `).join('');

            if (res.data.length > 5) {
                messageList.innerHTML += `
                    <div class="text-center mt-1">
                        <button class="btn btn-secondary btn-sm" onclick="window.router.navigate('/cleaning/messages')">
                            View All (${res.data.length})
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            document.getElementById('message-list').innerHTML = `
                <p class="text-muted p-2">Could not load messages.</p>
            `;
        }
    }

    // =============================================
    // START TASK
    // =============================================
    async function startTask(taskId) {
        try {
            const res = await apiService.put(`/cleaning/tasks/${taskId}/status`, { status: 'in_progress' });
            if (res.success) {
                showToast('Task started!', 'info');
                router.navigate('/cleaning/dashboard');
                setTimeout(() => router.navigate('/cleaning/dashboard'), 500);
            }
        } catch (error) {
            showToast('Failed to start task', 'error');
        }
    }

    // =============================================
    // COMPLETE TASK
    // =============================================
    async function completeTask(taskId) {
        if (!confirm('Mark this task as completed?')) return;
        try {
            const res = await apiService.put(`/cleaning/tasks/${taskId}/status`, { status: 'completed' });
            if (res.success) {
                showToast('Task completed! 🎉', 'success');
                router.navigate('/cleaning/dashboard');
                setTimeout(() => router.navigate('/cleaning/dashboard'), 500);
            }
        } catch (error) {
            showToast('Failed to complete task', 'error');
        }
    }

    // =============================================
    // OPEN SUPPLY REQUEST MODAL
    // =============================================
    async function openSupplyRequest(container) {
        const { showFormModal } = await import('../../components/modal.js');

        const supplies = await apiService.get('/cleaning/supplies');
        const supplyItems = supplies.success ? supplies.data : [];

        const formHtml = `
            <div class="form-group">
                <label class="form-label">Supply Item</label>
                <input type="text" id="item-name" class="form-input" placeholder="e.g., Floor cleaner" list="supply-list" required>
                <datalist id="supply-list">
                    ${supplyItems.map(s => `<option value="${s.item_name}">`).join('')}
                </datalist>
            </div>
            <div class="form-group">
                <label class="form-label">Quantity</label>
                <input type="number" id="request-qty" class="form-input" min="1" value="5" required>
            </div>
            <div class="form-group">
                <label class="form-label">Notes</label>
                <textarea id="request-notes" class="form-textarea" placeholder="Reason for request..."></textarea>
            </div>
        `;

        showFormModal('Request Cleaning Supplies', formHtml, async (overlay) => {
            const itemName = overlay.querySelector('#item-name').value;
            const quantity = overlay.querySelector('#request-qty').value;
            const notes = overlay.querySelector('#request-notes').value;

            if (!itemName || !quantity) {
                showToast('Please fill in all required fields', 'warning');
                return false;
            }

            try {
                const res = await apiService.post('/cleaning/supplies/request', {
                    item_name: itemName,
                    requested_quantity: parseInt(quantity),
                    notes: notes || null
                });

                if (res.success) {
                    showToast('Supply request submitted!', 'success');
                    router.navigate('/cleaning/dashboard');
                    setTimeout(() => router.navigate('/cleaning/dashboard'), 500);
                    return true;
                }
            } catch (error) {
                showToast('Failed to submit request', 'error');
                return false;
            }
        });
    }

    // =============================================
    // OPEN MESSAGE MODAL
    // =============================================
    async function openMessageModal(container) {
        const { showFormModal } = await import('../../components/modal.js');

        // Get caretakers for this apartment
        const aptId = authService.user?.apartment_id;
        const caretakersRes = await apiService.get(`/staff/members/apartment/${aptId}`);
        const caretakers = caretakersRes.success ? caretakersRes.data?.filter(m => m.staff_roles?.role_name === 'caretaker') : [];

        let caretakerOptions = '';
        if (caretakers && caretakers.length > 0) {
            caretakerOptions = caretakers.map(c => `
                <option value="${c.user_id || c.id}">${c.full_name}</option>
            `).join('');
        }

        const formHtml = `
            <div class="form-group">
                <label class="form-label">To</label>
                ${caretakerOptions ? `
                    <select class="form-select" id="msg-receiver">
                        ${caretakerOptions}
                    </select>
                ` : `
                    <input type="text" class="form-input" id="msg-receiver-name" placeholder="Enter caretaker name" required>
                    <input type="hidden" id="msg-receiver-id">
                `}
            </div>
            <div class="form-group">
                <label class="form-label">Message</label>
                <textarea id="msg-content" class="form-textarea" placeholder="Type your message..." required></textarea>
            </div>
        `;

        showFormModal('Send Message to Caretaker', formHtml, async (overlay) => {
            const receiverId = overlay.querySelector('#msg-receiver')?.value || 
                              overlay.querySelector('#msg-receiver-id')?.value;
            const message = overlay.querySelector('#msg-content').value;

            if (!receiverId || !message) {
                showToast('Please fill in all fields', 'warning');
                return false;
            }

            try {
                const res = await apiService.post('/cleaning/messages', {
                    receiver_id: receiverId,
                    message: message
                });

                if (res.success) {
                    showToast('Message sent!', 'success');
                    router.navigate('/cleaning/dashboard');
                    setTimeout(() => router.navigate('/cleaning/dashboard'), 500);
                    return true;
                }
            } catch (error) {
                showToast('Failed to send message', 'error');
                return false;
            }
        });
    }
}
