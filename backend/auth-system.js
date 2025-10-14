// 🔐 AUTHENTICATION SYSTEM FOR ZYLORB
class AuthSystem {
    constructor() {
        this.token = localStorage.getItem('zylorb_token');
        this.user = JSON.parse(localStorage.getItem('zylorb_user') || 'null');
        this.apiBase = 'https://zylorb-backend.onrender.com/api';
        this.init();
    }

    init() {
        this.updateUI();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
            if (btn.textContent.includes('Sign In') || btn.textContent.includes('Join Now')) {
                btn.addEventListener('click', () => this.showAuthModal());
            }
        });
    }

    async register(userData) {
        try {
            const response = await fetch(this.apiBase + '/register', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message);
            }
            
            this.handleAuthSuccess(data);
            return data;
            
        } catch (error) {
            throw error;
        }
    }

    async login(credentials) {
        try {
            const response = await fetch(this.apiBase + '/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message);
            }
            
            this.handleAuthSuccess(data);
            return data;
            
        } catch (error) {
            throw error;
        }
    }

    handleAuthSuccess(data) {
        this.token = data.token;
        this.user = data.user;
        
        localStorage.setItem('zylorb_token', this.token);
        localStorage.setItem('zylorb_user', JSON.stringify(this.user));
        
        this.updateUI();
        
        if (window.versionManager) {
            window.versionManager.showToast('Welcome ' + this.user.username + '! 🎉', 'success');
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        
        localStorage.removeItem('zylorb_token');
        localStorage.removeItem('zylorb_user');
        
        this.updateUI();
        
        if (window.versionManager) {
            window.versionManager.showToast('Logged out successfully', 'info');
        }
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + this.token
        };
    }

    isAuthenticated() {
        return this.token !== null && this.user !== null;
    }

    updateUI() {
        const authButtons = document.querySelector('.hidden.md\\:flex.items-center.space-x-4');
        
        if (this.user && authButtons) {
            authButtons.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span class="text-sm">${this.user.avatar}</span>
                    </div>
                    <span class="text-white">${this.user.username}</span>
                    <button onclick="window.authSystem.logout()" class="btn-secondary text-sm">Logout</button>
                </div>
            `;
        }
    }

    showAuthModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 w-full max-w-md p-6">
                <h3 class="text-2xl font-bold text-white mb-6">Join ZYLORB</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-white font-semibold mb-2">Username</label>
                        <input type="text" id="auth-username" class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" placeholder="Enter username">
                    </div>
                    <div>
                        <label class="block text-white font-semibold mb-2">Email</label>
                        <input type="email" id="auth-email" class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" placeholder="Enter email">
                    </div>
                    <div>
                        <label class="block text-white font-semibold mb-2">Password</label>
                        <input type="password" id="auth-password" class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" placeholder="Enter password (min 6 characters)">
                    </div>
                    <div class="flex space-x-3">
                        <button id="auth-login-btn" class="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-semibold transition-colors">Login</button>
                        <button id="auth-register-btn" class="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-lg font-semibold transition-all">Register</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('#auth-register-btn').addEventListener('click', () => this.handleRegister(modal));
        modal.querySelector('#auth-login-btn').addEventListener('click', () => this.handleLogin(modal));
        
        modal.addEventListener('click', (e) => { 
            if (e.target === modal) modal.remove(); 
        });
    }

    async handleRegister(modal) {
        const username = modal.querySelector('#auth-username').value;
        const email = modal.querySelector('#auth-email').value;
        const password = modal.querySelector('#auth-password').value;
        
        if (!username || !email || !password) {
            if (window.versionManager) window.versionManager.showToast('Please fill all fields', 'error');
            return;
        }
        
        try {
            await this.register({ username, email, password });
            modal.remove();
        } catch (error) {
            if (window.versionManager) window.versionManager.showToast(error.message, 'error');
        }
    }

    async handleLogin(modal) {
        const email = modal.querySelector('#auth-email').value;
        const password = modal.querySelector('#auth-password').value;
        
        if (!email || !password) {
            if (window.versionManager) window.versionManager.showToast('Please fill all fields', 'error');
            return;
        }
        
        try {
            await this.login({ email, password });
            modal.remove();
        } catch (error) {
            if (window.versionManager) window.versionManager.showToast(error.message, 'error');
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});
