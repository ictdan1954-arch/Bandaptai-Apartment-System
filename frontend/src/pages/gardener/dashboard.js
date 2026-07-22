import { apiService } from '../../services/api.service.js';
import { authService } from '../../services/auth.service.js';
import { showToast } from '../../components/toast.js';

export default async function gardenerDashboard() {
    const container = document.getElementById('app');
    container.innerHTML = `
        <div class="page-header">
            <h2>🌿 Gardener Dashboard</h2>
            <p class="text-muted">Welcome, ${authService.user?.full_name}</p>
        </div>

        <div class="dashboard-grid">
            <div class="card">
                <div class="card-header">📋 Today's Tasks</div>
                <div class="card-body" id="tasks-container"><p>Loading tasks...</p></div>
            </div>
            <div class="card">
                <div class="card-header">🛠️ Equipment & Supplies</div>
                <div class="card-body" id="supplies-container"><p>Loading inventory...</p></div>
            </div>
            <div class="card">
                <div class="card-header">👥 Other Gardeners</div>
                <div class="card-body" id="team-container"><p>Loading team...</p></div>
            </div>
            <div class="card">
                <div class="card-header">💰 My Salary</div>
                <div class="card-body" id="salary-container"><p>Loading salary...</p></div>
            </div>
            <div class="card">
                <div class="card-header">💬 Messages</div>
                <div class="card-body" id="messages-container">
                    <button id="open-chat-btn" class="btn btn-primary btn-sm">Chat with Caretaker</button>
                </div>
            </div>
        </div>
    `;

    Promise.all([loadTasks(), loadSupplies(), loadTeam(), loadSalary()])
        .catch(err => console.error(err));

    document.getElementById('open-chat-btn')?.addEventListener('click', async () => {
        const caretakerId = await getCaretakerId();
        if (caretakerId) {
            const { openChatModal } = await import('../../components/chat.js');
            openChatModal(authService.user?.id, caretakerId, 'Caretaker');
        } else {
            showToast('No caretaker assigned', 'warning');
        }
    });
}

async function loadTasks() {
    document.getElementById('tasks-container').innerHTML = `
        <div class="task-item">🌾 Main Garden - Mow lawn <span class="badge warning">In Progress</span></div>
        <div class="task-item">🌿 Entrance - Trim hedges <span class="badge primary">Pending</span></div>
        <div class="task-item">🌻 Pool Area - Water plants <span class="badge primary">Pending</span></div>
        <p class="text-muted mt-2">(Placeholder data – API integration pending)</p>
    `;
}

async function loadSupplies() {
    document.getElementById('supplies-container').innerHTML = `
        <table class="supply-table">
            <tr><td>🚜 Lawnmower</td><td>1</td><td>✅ Good</td></tr>
            <tr><td>✂️ Hedge trimmer</td><td>1</td><td>⚠️ Needs sharpening</td></tr>
            <tr><td>🌱 Fertilizer</td><td>3 bags</td><td>✅ OK</td></tr>
        </table>
        <p class="text-muted mt-2">(Placeholder data – API integration pending)</p>
    `;
}

async function loadTeam() {
    document.getElementById('team-container').innerHTML = `
        <div class="team-member"><i class="fas fa-user-circle"></i> Jane (on duty)</div>
        <div class="team-member"><i class="fas fa-user-circle"></i> Mike (off duty)</div>
        <p class="text-muted mt-2">(Placeholder data – API integration pending)</p>
    `;
}

async function loadSalary() {
    document.getElementById('salary-container').innerHTML = `
        <div class="salary-item">📅 2026-07-15: KES 16,000</div>
        <div class="salary-item">📅 2026-06-15: KES 16,000</div>
        <p class="text-muted mt-2">(Placeholder data – API integration pending)</p>
    `;
}

async function getCaretakerId() {
    try {
        const res = await apiService.get('/apartments/my/caretakers');
        if (res.success && res.data.length) return res.data[0].user_id;
    } catch (e) {}
    return null;
}
