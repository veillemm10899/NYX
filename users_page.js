// USERS PAGE JAVASCRIPT
class UsersPage {
    constructor() {
        this.supabase = window.supabaseConfig.supabaseClient;
        this.currentUser = null;
        this.allUsers = [];
        this.onlineUsers = [];
        
        this.init();
    }
    
    async init() {
        console.log('👥 === INITIALIZING USERS PAGE ===');
        
        // Check authentication
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) {
            console.log('No authenticated user, redirecting to login');
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = user;
        console.log('Current user:', user.id);
        
        // Load users
        await this.loadAllUsers();
        await this.loadOnlineUsers();
        
        // Set up real-time subscription for profile changes
        this.subscribeToProfileChanges();
        
        // Update online users every 10 seconds
        this.updateInterval = setInterval(() => {
            this.loadOnlineUsers();
        }, 10000);
        
        // Hide loading
        this.hideLoading();
        
        console.log('✅ Users page initialized successfully');
    }
    
    async loadAllUsers() {
        try {
            console.log('📥 Loading all users...');
            
            const { data: users, error } = await this.supabase
                .from('profiles')
                .select('id, nyx_name, nyx_number, is_online, last_seen, status_message')
                .order('is_online', { ascending: false })
                .order('last_seen', { ascending: false });
                
            if (error) {
                console.error('❌ Error loading users:', error);
                this.showError('Failed to load users');
                return;
            }
            
            // Filter out current user but keep ALL other users (online + offline)
            this.allUsers = (users || []).filter(user => user.id !== this.currentUser.id);
            this.renderUsers();
            console.log('✅ Loaded ' + this.allUsers.length + ' users');
        } catch (error) {
            console.error('❌ Error loading users:', error);
            this.showError('Failed to load users');
        }
    }
    
    async loadOnlineUsers() {
        try {
            const { data: onlineUsers, error } = await this.supabase
                .from('profiles')
                .select('id')
                .eq('is_online', true)
                .gt('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());
                
            if (error) {
                console.error('Error loading online users:', error);
                return;
            }
            
            this.onlineUsers = (onlineUsers || []).map(u => u.id);
            console.log('✅ Online users loaded: ' + this.onlineUsers.length);
            
            // Re-render users to update online status
            this.renderUsers();
        } catch (error) {
            console.error('Error loading online users:', error);
        }
    }
    
    renderUsers() {
        const usersGrid = document.getElementById('users-grid');
        if (!usersGrid) return;
        
        usersGrid.innerHTML = '';
        
        this.allUsers.forEach(user => {
            const userCard = this.createUserCard(user);
            usersGrid.appendChild(userCard);
        });
    }
    
    createUserCard(user) {
        const card = document.createElement('div');
        card.className = 'user-card';
        
        // Check if user is online (from database field or online users array)
        const isOnline = this.onlineUsers.includes(user.id) || 
                         (user.is_online && user.last_seen > new Date(Date.now() - 5 * 60 * 1000).toISOString());
        
        const avatarText = user.nyx_name.replace('Nyx ', '').substring(0, 2).toUpperCase();
        
        card.innerHTML = `
            <div class="user-card-header">
                <div class="user-avatar ${isOnline ? 'online' : 'offline'}">
                    ${avatarText}
                </div>
                <div class="user-info">
                    <div class="user-name">${user.nyx_name}</div>
                    <div class="user-number">Nyx #${user.nyx_number}</div>
                </div>
            </div>
            <div class="user-status ${isOnline ? 'online' : 'offline'}">
                ${isOnline ? '🟢 Online' : '⚫ Offline'}
            </div>
        `;
        
        // Add click handler - allow chat with both online and offline users
        card.addEventListener('click', () => {
            this.startPrivateChat(user);
        });
        
        return card;
    }
    
    subscribeToProfileChanges() {
        console.log('🔄 Setting up profile changes subscription...');
        
        const profileChannel = this.supabase
            .channel('users-page-profiles')
            .on('postgres_changes',
                { 
                    event: 'UPDATE',
                    schema: 'public', 
                    table: 'profiles' 
                },
                (payload) => {
                    console.log('👤 Profile change detected:', payload);
                    
                    const oldProfile = payload.old;
                    const newProfile = payload.new;
                    
                    // Check if online status changed
                    if (oldProfile.is_online !== newProfile.is_online) {
                        console.log(`User ${newProfile.nyx_name} is now ${newProfile.is_online ? 'online' : 'offline'}`);
                        
                        // Update online users list
                        if (newProfile.is_online) {
                            if (!this.onlineUsers.includes(newProfile.id)) {
                                this.onlineUsers.push(newProfile.id);
                            }
                        } else {
                            const index = this.onlineUsers.indexOf(newProfile.id);
                            if (index > -1) {
                                this.onlineUsers.splice(index, 1);
                            }
                        }
                        
                        // Re-render users to update status
                        this.renderUsers();
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 Profile subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to profile changes');
                }
            });
    }
    
    startPrivateChat(user) {
        console.log('Starting private chat with:', user.nyx_name);
        console.log('User object:', user);
        console.log('User ID:', user.id);
        
        // Store selected user in sessionStorage
        sessionStorage.setItem('selectedChatUser', JSON.stringify(user));
        console.log('Stored user in sessionStorage');
        
        // Go to private chat page
        const chatUrl = `private_chat.html?user=${user.id}`;
        console.log('Navigating to:', chatUrl);
        window.location.href = chatUrl;
    }
    
    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 68, 68, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 3000;
            animation: slideIn 0.3s ease-out;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }
    
    // Cleanup when page unloads
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize users page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const usersPage = new UsersPage();
    
    // Cleanup when page unloads
    window.addEventListener('beforeunload', () => {
        usersPage.cleanup();
    });
});