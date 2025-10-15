// 🔐 COMPLETE AUTHENTICATION SYSTEM
class AuthSystem {
    constructor() {
        this.token = localStorage.getItem('zylorb_token');
        this.user = JSON.parse(localStorage.getItem('zylorb_user') || 'null');
        this.apiBase = window.location.origin + '/api'; // Auto-detect API base
        this.init();
    }

    init() {
        this.updateUI();
        this.setupEventListeners();
        console.log('✅ AuthSystem initialized');
    }

    setupEventListeners() {
        // Direct click handlers for auth buttons
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // Join Now / Create Account buttons
            if (target.classList.contains('btn-primary') && 
                (target.textContent.includes('Join Now') || target.textContent.includes('Create Account'))) {
                e.preventDefault();
                e.stopPropagation();
                this.showAuthModal('register');
            }
            
            // Sign In buttons
            if (target.classList.contains('btn-secondary') && target.textContent.includes('Sign In')) {
                e.preventDefault();
                e.stopPropagation();
                this.showAuthModal('login');
            }

            // Logout
            if (target.textContent.includes('Logout')) {
                e.preventDefault();
                this.logout();
            }
        });
    }

    async register(userData) {
        try {
            console.log('📤 Registering user:', userData);
            
            const response = await fetch(this.apiBase + '/register', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }
            
            console.log('✅ Registration successful:', data);
            this.handleAuthSuccess(data);
            return data;
            
        } catch (error) {
            console.error('❌ Registration error:', error);
            throw error;
        }
    }

    async login(credentials) {
        try {
            console.log('📤 Logging in user:', credentials);
            
            const response = await fetch(this.apiBase + '/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }
            
            console.log('✅ Login successful:', data);
            this.handleAuthSuccess(data);
            return data;
            
        } catch (error) {
            console.error('❌ Login error:', error);
            throw error;
        }
    }

    handleAuthSuccess(data) {
        this.token = data.token;
        this.user = data.user;
        
        localStorage.setItem('zylorb_token', this.token);
        localStorage.setItem('zylorb_user', JSON.stringify(this.user));
        
        this.updateUI();
        this.showToast(`Welcome ${this.user.username}! 🎉`, 'success');
        
        // Close any open auth modals
        document.querySelectorAll('.auth-modal').forEach(modal => modal.remove());
    }

    logout() {
        this.token = null;
        this.user = null;
        
        localStorage.removeItem('zylorb_token');
        localStorage.removeItem('zylorb_user');
        
        this.updateUI();
        this.showToast('Logged out successfully', 'info');
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
                    <button class="btn-secondary text-sm logout-btn">Logout</button>
                </div>
            `;
        } else if (authButtons) {
            authButtons.innerHTML = `
                <button class="btn-secondary">Sign In</button>
                <button class="btn-primary">Join Now</button>
            `;
        }
    }

    showAuthModal(mode = 'register') {
        // Remove any existing modals
        document.querySelectorAll('.auth-modal').forEach(modal => modal.remove());
        
        const modal = document.createElement('div');
        modal.className = 'auth-modal fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 w-full max-w-md p-6">
                <h3 class="text-2xl font-bold text-white mb-6">
                    ${mode === 'register' ? 'Join ZYLORB' : 'Sign In to ZYLORB'}
                </h3>
                
                <div class="space-y-4">
                    ${mode === 'register' ? `
                    <div>
                        <label class="block text-white font-semibold mb-2">Username</label>
                        <input type="text" id="auth-username" class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" placeholder="Enter username" required>
                    </div>
                    ` : ''}
                    
                    <div>
                        <label class="block text-white font-semibold mb-2">Email</label>
                        <input type="email" id="auth-email" class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" placeholder="Enter email" required>
                    </div>
                    
                    <div>
                        <label class="block text-white font-semibold mb-2">Password</label>
                        <input type="password" id="auth-password" class="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white placeholder-white/60 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" placeholder="Enter password (min 6 characters)" required>
                    </div>
                    
                    <div class="flex space-x-3">
                        <button class="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-semibold transition-colors close-auth-modal">
                            Cancel
                        </button>
                        
                        ${mode === 'register' ? `
                        <button class="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-lg font-semibold transition-all register-btn">
                            Create Account
                        </button>
                        ` : `
                        <button class="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-lg font-semibold transition-all login-btn">
                            Sign In
                        </button>
                        `}
                    </div>
                    
                    <div class="text-center">
                        <button class="text-purple-300 hover:text-purple-200 text-sm switch-auth-mode" data-mode="${mode === 'register' ? 'login' : 'register'}">
                            ${mode === 'register' ? 'Already have an account? Sign In' : 'Need an account? Create One'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        if (mode === 'register') {
            modal.querySelector('.register-btn').addEventListener('click', () => this.handleRegister(modal));
        } else {
            modal.querySelector('.login-btn').addEventListener('click', () => this.handleLogin(modal));
        }
        
        modal.querySelector('.close-auth-modal').addEventListener('click', () => modal.remove());
        modal.querySelector('.switch-auth-mode').addEventListener('click', (e) => {
            const newMode = e.target.dataset.mode;
            modal.remove();
            this.showAuthModal(newMode);
        });
        
        modal.addEventListener('click', (e) => { 
            if (e.target === modal) modal.remove(); 
        });
    }

    async handleRegister(modal) {
        const username = modal.querySelector('#auth-username').value.trim();
        const email = modal.querySelector('#auth-email').value.trim();
        const password = modal.querySelector('#auth-password').value;
        
        if (!username || !email || !password) {
            this.showToast('Please fill all fields', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            await this.register({ username, email, password });
            modal.remove();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async handleLogin(modal) {
        const email = modal.querySelector('#auth-email').value.trim();
        const password = modal.querySelector('#auth-password').value;
        
        if (!email || !password) {
            this.showToast('Please fill all fields', 'error');
            return;
        }
        
        try {
            await this.login({ email, password });
            modal.remove();
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg ${
            type === 'error' ? 'bg-red-500' : 
            type === 'success' ? 'bg-green-500' : 'bg-blue-500'
        } text-white transform transition-transform duration-300 translate-x-full`;
        
        toast.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="text-lg">${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
                <p class="text-sm">${message}</p>
                <button class="ml-4 text-white/80 hover:text-white" onclick="this.parentElement.parentElement.remove()">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
}

// Initialize Auth System when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});
