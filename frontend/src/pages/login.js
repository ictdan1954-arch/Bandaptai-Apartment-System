import { authService } from '../services/auth.service.js';
import { router } from '../router.js';
import { showToast } from '../components/toast.js';

export default async function loginPage(container) {
    // Ensure container is visible
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.minHeight = '100vh';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.width = '100%';

    container.innerHTML = `
        <div class="auth-container">
            <div class="auth-card">
                <div class="auth-logo">
                    <img src="assets/images/logo.png" alt="Rikim Apartments" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" 
                         style="max-height:120px; margin-bottom:16px;">
                    <div class="logo-icon" style="display:none; width:80px; height:80px;">
                        <i class="fas fa-building"></i>
                    </div>
                    <h1>Rikim Apartments</h1>
                    <p class="tagline">Management System</p>
                </div>
                <form id="login-form" class="auth-form">
                    <div class="form-group">
                        <label class="form-label">Phone, Email or Username</label>
                        <div class="input-icon-wrapper">
                            <i class="fas fa-user input-icon"></i>
                            <input type="text" class="form-input" id="login-identifier" 
                                   placeholder="Enter phone, email or username" required autocomplete="username">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <div class="input-icon-wrapper password-wrapper">
                            <i class="fas fa-lock input-icon"></i>
                            <input type="password" class="form-input" id="login-password" 
                                   placeholder="Enter password" required autocomplete="current-password">
                            <button type="button" class="password-toggle-btn" id="toggle-password">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div id="login-error" class="form-error" style="display:none;"></div>
                    <button type="submit" class="btn btn-primary btn-lg btn-block">
                        <i class="fas fa-sign-in-alt"></i> Sign In
                    </button>
                </form>
                <div class="auth-footer">
                    <p><a href="#" id="forgot-password-link">Forgot Password?</a></p>
                    <p>&copy; ${new Date().getFullYear()} Rikim Apartments</p>
                </div>
            </div>
        </div>
        <style>
            /* Reset container styles */
            #page-content {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                min-height: 100vh !important;
                padding: 0 !important;
                margin: 0 !important;
                background: transparent !important;
                width: 100% !important;
            }

            .auth-container {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 20px;
                position: relative;
                overflow: hidden;
                width: 100%;
                /* 
                    ⭐ USING login-splash01.jpg AS REQUESTED ⭐
                */
                background: linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 58, 95, 0.5) 50%, rgba(37, 99, 235, 0.4) 100%),
                            url('assets/images/login-splash01.jpg');
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                background-color: #1a2a4a;
            }

            .auth-container::after {
                content: '';
                position: absolute;
                width: 200%;
                height: 200%;
                top: -50%;
                left: -50%;
                background: radial-gradient(circle at 30% 70%, rgba(37,99,235,0.08) 0%, transparent 50%),
                            radial-gradient(circle at 70% 30%, rgba(16,185,129,0.04) 0%, transparent 50%);
                animation: rotate 30s linear infinite;
                z-index: 1;
                pointer-events: none;
            }

            @keyframes rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .auth-card {
                background: rgba(255, 255, 255, 0.97);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 24px;
                padding: 40px;
                width: 100%;
                max-width: 440px;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
                position: relative;
                z-index: 2;
                margin: 20px;
            }

            @keyframes slideUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .auth-logo {
                text-align: center;
                margin-bottom: 32px;
            }

            .logo-icon {
                background: linear-gradient(135deg, var(--primary), var(--primary-dark));
                border-radius: 18px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 16px;
                box-shadow: 0 10px 20px rgba(37,99,235,0.3);
            }

            .logo-icon i {
                font-size: 2.5rem;
                color: white;
            }

            .auth-logo h1 {
                font-size: clamp(1.3rem, 5vw, 1.6rem);
                font-weight: 800;
                color: var(--text-primary);
                margin-bottom: 4px;
                letter-spacing: -0.5px;
            }

            .tagline {
                color: var(--text-secondary);
                font-size: clamp(0.8rem, 3vw, 0.9rem);
                font-weight: 500;
            }

            .input-icon-wrapper {
                position: relative;
            }

            .input-icon {
                position: absolute;
                left: 14px;
                top: 50%;
                transform: translateY(-50%);
                color: var(--text-muted);
                font-size: 1rem;
                z-index: 2;
            }

            .input-icon-wrapper .form-input {
                padding-left: 42px;
            }

            .password-wrapper .form-input {
                padding-right: 46px;
            }

            .password-toggle-btn {
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
                padding: 6px 10px;
                border-radius: 6px;
                transition: color 0.2s;
                z-index: 2;
            }

            .password-toggle-btn:hover {
                color: var(--text-primary);
            }

            .btn-block {
                width: 100%;
                padding: 14px;
                font-size: 1rem;
                margin-top: 8px;
                border-radius: 12px;
                font-weight: 600;
            }

            .auth-footer {
                text-align: center;
                margin-top: 24px;
                color: var(--text-muted);
                font-size: 0.8rem;
            }

            .auth-footer a {
                color: var(--primary);
                text-decoration: none;
            }

            .auth-footer a:hover {
                text-decoration: underline;
            }

            .form-error {
                background: var(--danger-bg);
                color: var(--danger);
                padding: 8px 12px;
                border-radius: 8px;
                margin-bottom: 12px;
            }

            @media (max-width: 480px) {
                .auth-card {
                    padding: 24px;
                    margin: 12px;
                }
                .auth-logo h1 {
                    font-size: 1.2rem;
                }
            }
        </style>
    `;

    // Toggle password visibility
    const toggleBtn = document.getElementById('toggle-password');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const pwd = document.getElementById('login-password');
            const icon = this.querySelector('i');
            if (pwd.type === 'password') {
                pwd.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                pwd.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    }

    // Forgot password handler
    const forgotLink = document.getElementById('forgot-password-link');
    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('Please contact your landlord or caretaker to reset your password.', 'info');
        });
    }

    // Form submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = document.getElementById('login-identifier').value.trim();
            const password = document.getElementById('login-password').value;
            const errorEl = document.getElementById('login-error');
            
            if (errorEl) errorEl.style.display = 'none';

            try {
                const btn = e.target.querySelector('button');
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;"></span> Signing in...';

                const response = await authService.login(identifier, password);
                
                if (response.success) {
                    showToast('Welcome back!', 'success');
                    router.navigateByRole();
                } else {
                    throw new Error(response.message || 'Login failed');
                }
            } catch (error) {
                if (errorEl) {
                    errorEl.textContent = error.message;
                    errorEl.style.display = 'block';
                }
                showToast(error.message, 'error');
            } finally {
                const btn = e.target.querySelector('button');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }
        });
    }
}
