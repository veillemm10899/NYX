// RESTORE YOUR ORIGINAL WORKING PUBLIC CHAT
// This is the version that was working before any changes

class SimpleCosmicRiver {
    constructor() {
        this.supabase = window.supabaseConfig.supabaseClient;
        this.currentUser = null;
        this.messages = [];
        this.onlineUsers = [];
        
        // UI elements
        this.messageContainer = null;
        this.messageInput = null;
        this.sendButton = null;
        this.onlineUsersContainer = null;
        this.onlineCountElement = null;
        
        // Mobile elements
        this.mobileMessageContainer = null;
        this.mobileMessageInput = null;
        this.mobileSendButton = null;
        this.mobileOnlineUsersContainer = null;
        this.mobileOnlineCountElement = null;
        
        this.init();
    }
    
    async init() {
        console.log('🌊 === INITIALIZING THE COSMIC RIVER ===');
        
        // Check authentication
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) {
            console.log('No authenticated user, redirecting to login');
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = user;
        console.log('Current user:', user.id);
        
        // Initialize UI elements
        this.initializeElements();
        this.setupEventListeners();
        
        // Set user online FIRST
        await this.setUserOnline(true);
        
        // Load initial data
        await this.loadUserProfile();
        await this.loadMessages();
        this.subscribeToMessages();
        this.subscribeToOnlineUsers();
        
        // Join The Cosmic River
        await this.joinTheRiver();
        
        // Hide loading overlay
        this.hideLoading();
        
        console.log('✅ The Cosmic River initialized successfully');
    }
    
    initializeElements() {
        this.messageContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-btn');
        this.onlineUsersContainer = document.getElementById('online-users');
        this.onlineCountElement = document.getElementById('online-count');
        
        // Mobile elements
        this.mobileMessageContainer = document.getElementById('mobile-messages');
        this.mobileMessageInput = document.getElementById('mobile-message-input');
        this.mobileSendButton = document.getElementById('mobile-send-btn');
        this.mobileOnlineUsersContainer = document.getElementById('mobile-online-users');
        this.mobileOnlineCountElement = document.getElementById('mobile-online-count');
    }
    
    setupEventListeners() {
        // Desktop events
        if (this.sendButton && this.messageInput) {
            this.sendButton.addEventListener('click', () => this.sendMessage());
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        // Mobile events
        if (this.mobileSendButton && this.mobileMessageInput) {
            this.mobileSendButton.addEventListener('click', () => this.sendMessage(true));
            this.mobileMessageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage(true);
                }
            });
        }
        
        // Logout buttons
        const logoutBtns = document.querySelectorAll('#logout-btn, #mobile-logout-btn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', () => this.logout());
        });
        
        // Developer button
        const developerBtns = document.querySelectorAll('#developer-btn, #mobile-developer-btn');
        developerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                window.open('https://veillemm.netlify.app', '_blank');
            });
        });
        
        // Mobile drawer events
        const openDrawerBtn = document.getElementById('open-drawer');
        const closeDrawerBtn = document.getElementById('close-drawer');
        const mobileDrawer = document.getElementById('mobile-drawer');
        
        if (openDrawerBtn) {
            openDrawerBtn.addEventListener('click', () => {
                mobileDrawer.classList.add('open');
            });
        }
        
        if (closeDrawerBtn) {
            closeDrawerBtn.addEventListener('click', () => {
                mobileDrawer.classList.remove('open');
            });
        }
        
        // Close drawer when clicking outside
        document.addEventListener('click', (e) => {
            if (mobileDrawer && mobileDrawer.classList.contains('open') && 
                !mobileDrawer.contains(e.target) && 
                !openDrawerBtn.contains(e.target)) {
                mobileDrawer.classList.remove('open');
            }
        });
    }
    
    async loadUserProfile() {
        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('nyx_name, nyx_number')
                .eq('id', this.currentUser.id)
                .single();
                
            if (error) {
                console.error('Error loading user profile:', error);
                return;
            }
            
            this.userProfile = profile;
            console.log('User profile loaded:', profile);
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }
    
    async loadMessages() {
        try {
            console.log('📥 Loading messages from The Cosmic River...');
            
            const { data: messages, error } = await this.supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
                
            if (error) {
                console.error('❌ Error loading messages:', error);
                this.showError('Failed to load messages from The Cosmic River');
                return;
            }
            
            // Reverse to show oldest first, newest at bottom
            this.messages = (messages || []).reverse();
            this.renderMessages();
            console.log('✅ Loaded ' + this.messages.length + ' messages from The Cosmic River');
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            this.showError('Failed to load messages');
        }
    }
    
    async joinTheRiver() {
        try {
            const nyxName = this.userProfile?.nyx_name || 'Unknown Nyx';
            
            // Simple direct insert - no functions, no triggers
            await this.supabase
                .from('messages')
                .insert({
                    sender_id: this.currentUser.id,
                    sender_nyx_name: nyxName,
                    sender_nyx_number: this.userProfile?.nyx_number || 0,
                    message: `${nyxName} has entered The Cosmic River 🌊`,
                    message_type: 'join'
                });
            
            console.log('✅ Successfully joined The Cosmic River');
        } catch (error) {
            console.error('Error joining river:', error);
        }
    }
    
    subscribeToMessages() {
        console.log('🔄 Setting up real-time message subscription...');
        
        const channel = this.supabase
            .channel('the-cosmic-river')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'messages' 
                },
                (payload) => {
                    console.log('🌊 New message in The Cosmic River:', payload.new);
                    
                    const newMessage = payload.new;
                    
                    // Don't add our own message again (prevent duplicates)
                    if (newMessage.sender_id !== this.currentUser.id) {
                        // Add message to array and render
                        this.messages.push(newMessage);
                        this.renderMessage(newMessage);
                        this.scrollToBottom();
                        
                        // Play notification sound for other users' messages
                        this.playNotificationSound();
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 Message subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully connected to The Cosmic River');
                    this.showSystemMessage('Welcome to The Cosmic River 🌊');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Connection to The Cosmic River failed');
                    this.showSystemMessage('Connection to The Cosmic River unstable ⚡');
                } else if (status === 'TIMED_OUT') {
                    console.error('❌ Connection to The Cosmic River timed out');
                    this.showSystemMessage('Connection to The Cosmic River timed out ⏰');
                }
            });
            
        console.log('🔄 Connecting to The Cosmic River...');
    }
    
    subscribeToOnlineUsers() {
        console.log('🔄 Setting up online users tracking...');
        
        const profileChannel = this.supabase
            .channel('online-users-channel')
            .on('postgres_changes',
                { 
                    event: '*',  // Listen to all events (INSERT, UPDATE, DELETE)
                    schema: 'public', 
                    table: 'profiles' 
                },
                (payload) => {
                    console.log('👤 Profile change detected:', payload);
                    
                    if (payload.eventType === 'UPDATE') {
                        const oldProfile = payload.old;
                        const newProfile = payload.new;
                        
                        // Check if online status changed
                        if (oldProfile.is_online !== newProfile.is_online) {
                            const nyxName = newProfile.nyx_name || 'Unknown Nyx';
                            
                            if (newProfile.is_online) {
                                this.showSystemMessage(`${nyxName} has entered The Cosmic River 🌊`);
                                // Add to online users list
                                this.addUserToOnlineList(newProfile);
                            } else {
                                this.showSystemMessage(`${nyxName} has left The Cosmic River 🌊`);
                                // Remove from online users list
                                this.removeUserFromOnlineList(newProfile.id);
                            }
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 Profile subscription status:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Successfully subscribed to online users');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Failed to subscribe to online users');
                }
            });
        
        // Update every 10 seconds as fallback
        setInterval(async () => {
            await this.updateOnlineUsers();
        }, 10000);
        
        // Initial load
        this.updateOnlineUsers();
    }
    
    async updateOnlineUsers() {
        try {
            console.log('🔄 Updating online users...');
            
            // Direct query to get online users (no function call)
            const { data: onlineUsers, error } = await this.supabase
                .from('profiles')
                .select('id, nyx_name, nyx_number, status_message, last_seen, is_online')
                .eq('is_online', true)
                .gt('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString())
                .order('last_seen', { ascending: false });
                
            if (error) {
                console.error('Error fetching online users:', error);
                return;
            }
            
            this.onlineUsers = onlineUsers || [];
            this.renderOnlineUsers();
            console.log('✅ Online users updated: ' + this.onlineUsers.length + ' users');
            
            // Debug: Log current online users
            console.log('Current online users:', this.onlineUsers.map(u => u.nyx_name));
            
        } catch (error) {
            console.error('Error updating online users:', error);
        }
    }
    
    renderMessages() {
        if (!this.messageContainer) return;
        
        this.messageContainer.innerHTML = '';
        if (this.mobileMessageContainer) {
            this.mobileMessageContainer.innerHTML = '';
        }
        
        this.messages.forEach(message => {
            this.renderMessage(message);
        });
        
        this.scrollToBottom();
        console.log('✅ Messages rendered successfully');
    }
    
    renderMessage(message) {
        const messageElement = this.createMessageElement(message);
        
        if (this.messageContainer) {
            this.messageContainer.appendChild(messageElement.cloneNode(true));
        }
        
        if (this.mobileMessageContainer) {
            this.mobileMessageContainer.appendChild(messageElement.cloneNode(true));
        }
    }
    
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        
        if (message.message_type === 'system' || message.message_type === 'join') {
            messageDiv.className = 'message system-message';
            messageDiv.innerHTML = '<div class="message-content">' + message.message + '</div>';
        } else {
            const isOwnMessage = message.sender_id === this.currentUser.id;
            messageDiv.className = isOwnMessage ? 'message own-message' : 'message other-message';
            
            const avatarText = message.sender_nyx_name.replace('Nyx ', '');
            
            if (isOwnMessage) {
                messageDiv.innerHTML = '<div class="message-content"><div class="message-text">' + this.escapeHtml(message.message) + '</div><div class="message-time">' + this.formatTime(message.created_at) + '</span></div><div class="message-avatar">' + avatarText + '</div>';
            } else {
                messageDiv.innerHTML = '<div class="message-avatar">' + avatarText + '</div><div class="message-content"><div class="message-header"><span class="message-sender">' + message.sender_nyx_name + '</span><span class="message-time">' + this.formatTime(message.created_at) + '</span></div><div class="message-text">' + this.escapeHtml(message.message) + '</div></div>';
            }
        }
        
        return messageDiv;
    }
    
    renderOnlineUsers() {
        this.renderOnlineUsersList(this.onlineUsersContainer, this.onlineCountElement);
        this.renderOnlineUsersList(this.mobileOnlineUsersContainer, this.mobileOnlineCountElement);
    }
    
    renderOnlineUsersList(container, countElement) {
        if (!container) return;
        
        container.innerHTML = '';
        
        this.onlineUsers.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'online-user';
            
            const avatarText = user.nyx_name.replace('Nyx ', '');
            userElement.innerHTML = '<div class="user-avatar">' + avatarText + '</div><div class="user-info"><div class="user-name">' + user.nyx_name + '</div><div class="user-status">Crossing the cosmic river</div></div>';
            
            container.appendChild(userElement);
        });
        
        if (countElement) {
            countElement.textContent = this.onlineUsers.length;
        }
    }
    
    // Helper method to add user to online list
    addUserToOnlineList(user) {
        const existingIndex = this.onlineUsers.findIndex(u => u.id === user.id);
        if (existingIndex === -1) {
            this.onlineUsers.push(user);
            this.renderOnlineUsers();
        }
    }
    
    // Helper method to remove user from online list
    removeUserFromOnlineList(userId) {
        const existingIndex = this.onlineUsers.findIndex(u => u.id === userId);
        if (existingIndex !== -1) {
            this.onlineUsers.splice(existingIndex, 1);
            this.renderOnlineUsers();
        }
    }
    
    async sendMessage(isMobile = false) {
        const input = isMobile ? this.mobileMessageInput : this.messageInput;
        const text = input.value.trim();
        
        if (!text || !this.userProfile) return;
        
        try {
            // Create message object for immediate display
            const messageObj = {
                id: Date.now(), // Temporary ID
                sender_id: this.currentUser.id,
                sender_nyx_name: this.userProfile.nyx_name,
                sender_nyx_number: this.userProfile.nyx_number,
                message: text,
                message_type: 'text',
                created_at: new Date().toISOString()
            };
            
            // Display message immediately for sender
            this.messages.push(messageObj);
            this.renderMessage(messageObj);
            this.scrollToBottom();
            
            // Simple direct insert - NO FUNCTIONS, NO TRIGGERS
            const { error } = await this.supabase
                .from('messages')
                .insert({
                    sender_id: this.currentUser.id,
                    sender_nyx_name: this.userProfile.nyx_name,
                    sender_nyx_number: this.userProfile.nyx_number,
                    message: text,
                    message_type: 'text'
                });
                
            if (error) {
                throw error;
            }
            
            input.value = '';
            console.log('✅ Message sent to The Cosmic River successfully');
            
        } catch (error) {
            console.error('❌ Error sending message:', error);
            this.showError('Failed to send message to The Cosmic River');
            
            // Remove the message from display if sending failed
            this.messages.pop();
            this.renderMessages();
        }
    }
    
    async logout() {
        try {
            await this.supabase.auth.signOut();
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error during logout:', error);
            window.location.href = 'login.html';
        }
    }
    
    hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(255, 68, 68, 0.9); color: white; padding: 12px 20px; border-radius: 8px; z-index: 3000; animation: slideIn 0.3s ease-out;';
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }
    
    showSystemMessage(message) {
        console.log('📢 System message:', message);
        
        const systemMessage = {
            id: Date.now(),
            sender_id: 'system',
            sender_nyx_name: 'The Cosmic River',
            sender_nyx_number: 0,
            message: message,
            message_type: 'system',
            created_at: new Date().toISOString()
        };
        
        this.messages.push(systemMessage);
        this.renderMessage(systemMessage);
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        setTimeout(() => {
            if (this.messageContainer) {
                this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
            }
            if (this.mobileMessageContainer) {
                this.mobileMessageContainer.scrollTop = this.mobileMessageContainer.scrollHeight;
            }
        }, 100);
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            console.log('Could not play notification sound:', error);
        }
    }
    
    // Add method to set user online status
    async setUserOnline(isOnline) {
        try {
            const { error } = await this.supabase.rpc('update_online_status', {
                user_id: this.currentUser.id,
                online_status: isOnline
            });

            if (error) {
                console.error('Failed to update online status:', error);
            } else {
                console.log(`✅ User is now ${isOnline ? 'online' : 'offline'}`);
            }
        } catch (error) {
            console.error('Error setting online status:', error);
        }
    }
}

// Initialize The Cosmic River when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.simpleChat = new SimpleCosmicRiver();
});