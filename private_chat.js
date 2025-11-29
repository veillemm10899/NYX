// NYX PRIVATE CHAT SYSTEM
class NyxPrivateChat {
    constructor() {
        this.supabase = window.supabaseConfig.supabaseClient;
        this.currentUser = null;
        this.currentChatUser = null;
        this.messages = [];
        this.allProfiles = [];
        this.onlineUsers = [];
        
        // UI elements
        this.messageContainer = null;
        this.messageInput = null;
        this.sendButton = null;
        this.profilesModal = null;
        this.profilesList = null;
        
        // Mobile elements
        this.mobileMessageContainer = null;
        this.mobileMessageInput = null;
        this.mobileSendButton = null;
        
        this.init();
    }
    
    async init() {
        console.log('🔒 === INITIALIZING NYX PRIVATE CHAT ===');
        
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
        
        // Get selected user from URL parameter or sessionStorage
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user');
        const storedUser = sessionStorage.getItem('selectedChatUser');
        
        if (userId || storedUser) {
            // Direct chat mode - user selected from users.html
            let selectedUser = null;
            
            if (userId) {
                // Load user from database using ID
                selectedUser = await this.loadUserById(userId);
            } else if (storedUser) {
                // Load user from sessionStorage
                selectedUser = JSON.parse(storedUser);
            }
            
            if (selectedUser) {
                await this.startDirectChat(selectedUser);
                return;
            }
        }
        
        // Fallback: Show profiles modal if no user selected
        await this.loadUserProfile();
        await this.loadAllProfiles();
        await this.loadOnlineUsers();
        this.subscribeToPrivateMessages();
        this.subscribeToOnlineUsers();
        this.profilesModal.classList.remove('hidden');
        
        // Hide loading overlay
        this.hideLoading();
        
        console.log('✅ NYX Private Chat initialized successfully');
    }
    
    initializeElements() {
        // Desktop elements
        this.messageContainer = document.getElementById('messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-btn');
        this.profilesModal = document.getElementById('profiles-modal');
        this.profilesList = document.getElementById('profiles-list');
        
        // Mobile elements
        this.mobileMessageContainer = document.getElementById('mobile-messages');
        this.mobileMessageInput = document.getElementById('mobile-message-input');
        this.mobileSendButton = document.getElementById('mobile-send-btn');
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
        
        // Back to public buttons in sidebar
        const backToPublicSidebarBtns = document.querySelectorAll('#back-to-public-sidebar-btn, #mobile-back-to-public-sidebar-btn');
        backToPublicSidebarBtns.forEach(btn => {
            btn.addEventListener('click', () => this.goToPublicChat());
        });
        
        // Back to public buttons
        const backToPublicBtns = document.querySelectorAll('#back-to-public-btn, #mobile-back-to-public-btn');
        backToPublicBtns.forEach(btn => {
            btn.addEventListener('click', () => this.goToPublicChat());
        });
        
        // Modal controls
        const closeProfilesModal = document.getElementById('close-profiles-modal');
        if (closeProfilesModal) {
            closeProfilesModal.addEventListener('click', () => this.closeProfilesModal());
        }
        
        // Close modal on outside click
        this.profilesModal.addEventListener('click', (e) => {
            if (e.target === this.profilesModal) {
                this.closeProfilesModal();
            }
        });
        
        // Mobile drawer
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
    
    async loadUserById(userId) {
        try {
            const { data: user, error } = await this.supabase
                .from('profiles')
                .select('id, nyx_name, nyx_number, is_online, last_seen')
                .eq('id', userId)
                .single();
                
            if (error) {
                console.error('Error loading user:', error);
                return null;
            }
            
            console.log('✅ Loaded selected user:', user);
            return user;
        } catch (error) {
            console.error('Error loading user:', error);
            return null;
        }
    }
    
    async loadAllProfiles() {
        try {
            const { data: profiles, error } = await this.supabase
                .rpc('get_all_profiles');
                
            if (error) {
                console.error('Error loading profiles:', error);
                return;
            }
            
            this.allProfiles = profiles || [];
            console.log('✅ Loaded ' + this.allProfiles.length + ' profiles');
        } catch (error) {
            console.error('Error loading profiles:', error);
        }
    }
    
    async loadOnlineUsers() {
        try {
            const { data: onlineUsers, error } = await this.supabase
                .from('profiles')
                .select('id, nyx_name, nyx_number, is_online, last_seen')
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
        } catch (error) {
            console.error('Error updating online users:', error);
        }
    }
    
    openProfilesModal() {
        console.log('Opening profiles modal...');
        this.renderProfilesList();
        this.profilesModal.classList.remove('hidden');
    }
    
    closeProfilesModal() {
        this.profilesModal.classList.add('hidden');
    }
    
    renderProfilesList() {
        if (!this.profilesList) return;
        
        this.profilesList.innerHTML = '';
        
        // Filter out current user
        const otherUsers = this.allProfiles.filter(user => user.id !== this.currentUser.id);
        
        otherUsers.forEach(user => {
            const profileElement = document.createElement('div');
            profileElement.className = 'profile-item';
            
            const isOnline = this.onlineUsers.some(online => online.id === user.id);
            
            profileElement.innerHTML = `
                <div class="profile-avatar ${isOnline ? 'online' : 'offline'}">
                    ${user.nyx_name.replace('Nyx ', '')}
                </div>
                <div class="profile-info">
                    <div class="profile-name">${user.nyx_name}</div>
                    <div class="profile-number">Nyx #${user.nyx_number}</div>
                    <div class="profile-status ${isOnline ? 'online' : 'offline'}">
                        ${isOnline ? '🟢 Online' : '⚫ Offline'}
                    </div>
                </div>
            `;
            
            profileElement.addEventListener('click', () => {
                this.startPrivateChat(user);
            });
            
            this.profilesList.appendChild(profileElement);
        });
    }
    
    renderOnlineUsers() {
        this.renderOnlineUsersList(document.getElementById('online-users'), document.getElementById('online-count'));
        this.renderOnlineUsersList(document.getElementById('mobile-online-users'), document.getElementById('mobile-online-count'));
    }
    
    renderOnlineUsersList(container, countElement) {
        if (!container) return;
        
        container.innerHTML = '';
        
        this.onlineUsers.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'online-user';
            
            const avatarText = user.nyx_name.replace('Nyx ', '');
            userElement.innerHTML = `
                <div class="user-avatar">${avatarText}</div>
                <div class="user-info">
                    <div class="user-name">${user.nyx_name}</div>
                    <div class="user-status">Crossing the cosmic river</div>
                </div>
            `;
            
            container.appendChild(userElement);
        });
        
        if (countElement) {
            countElement.textContent = this.onlineUsers.length;
        }
    }
    
    async startDirectChat(user) {
        console.log('Starting direct chat with:', user.nyx_name);
        
        // Load current user profile
        await this.loadUserProfile();
        
        // Set current chat user
        this.currentChatUser = user;
        this.messages = [];
        
        // Load online users first
        await this.loadOnlineUsers();
        
        // Set up subscriptions
        this.subscribeToPrivateMessages();
        this.subscribeToOnlineUsers();
        
        // Update UI
        this.updateChatHeader(user);
        this.loadPrivateMessages(user.id);
        
        // Hide loading overlay
        this.hideLoading();
        
        // Focus on input
        setTimeout(() => {
            if (this.messageInput) {
                this.messageInput.focus();
            }
        }, 300);
    }
    
    startPrivateChat(user) {
        console.log('Starting private chat with:', user.nyx_name);
        
        this.currentChatUser = user;
        this.messages = [];
        
        // Update UI
        this.updateChatHeader(user);
        this.closeProfilesModal();
        this.loadPrivateMessages(user.id);
        
        // Focus on input
        setTimeout(() => {
            if (this.messageInput) {
                this.messageInput.focus();
            }
        }, 300);
    }
    
    updateChatHeader(user) {
        // Check if user is online
        const isOnline = this.onlineUsers.some(online => online.id === user.id) || 
                         (user.is_online && user.last_seen > new Date(Date.now() - 5 * 60 * 1000).toISOString());
        
        // Get avatar text from nyx_name
        const avatarText = user.nyx_name.replace('Nyx ', '').substring(0, 2).toUpperCase();
        
        // Update desktop
        const partnerAvatar = document.getElementById('partner-avatar');
        const partnerName = document.getElementById('partner-name');
        const partnerStatus = document.getElementById('partner-status');
        
        if (partnerAvatar) {
            partnerAvatar.textContent = avatarText;
        }
        if (partnerName) {
            partnerName.textContent = user.nyx_name;
        }
        if (partnerStatus) {
            partnerStatus.textContent = isOnline ? 'Online' : 'Offline';
            partnerStatus.style.color = isOnline ? 'var(--success)' : 'var(--text-dim)';
        }
        
        // Update mobile
        const mobilePartnerAvatar = document.getElementById('mobile-partner-avatar');
        const mobilePartnerName = document.getElementById('mobile-partner-name');
        const mobilePartnerStatus = document.getElementById('mobile-partner-status');
        
        if (mobilePartnerAvatar) {
            mobilePartnerAvatar.textContent = avatarText;
        }
        if (mobilePartnerName) {
            mobilePartnerName.textContent = user.nyx_name;
        }
        if (mobilePartnerStatus) {
            mobilePartnerStatus.textContent = isOnline ? 'Online' : 'Offline';
            mobilePartnerStatus.style.color = isOnline ? 'var(--success)' : 'var(--text-dim)';
        }
    }
    
    async loadPrivateMessages(otherUserId) {
        try {
            const { data: messages, error } = await this.supabase
                .rpc('get_private_messages', {
                    p_user_id: this.currentUser.id,
                    p_other_user_id: otherUserId,
                    p_limit_count: 50
                });
                
            if (error) {
                console.error('Error loading private messages:', error);
                return;
            }
            
            this.messages = (messages || []).reverse();
            this.renderMessages();
            this.scrollToBottom();
            
            // Mark messages as read
            this.markMessagesAsRead(otherUserId);
            
            console.log('✅ Loaded ' + this.messages.length + ' private messages');
        } catch (error) {
            console.error('Error loading private messages:', error);
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
        const isOwnMessage = message.sender_id === this.currentUser.id;
        
        messageDiv.className = isOwnMessage ? 'message own-message' : 'message other-message';
        
        const avatarText = message.sender_nyx_name.replace('Nyx ', '');
        
        if (isOwnMessage) {
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(message.message)}</div>
                    <div class="message-time">${this.formatTime(message.created_at)}</div>
                </div>
                <div class="message-avatar">${avatarText}</div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-avatar">${avatarText}</div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-sender">${message.sender_nyx_name}</span>
                        <span class="message-time">${this.formatTime(message.created_at)}</span>
                    </div>
                    <div class="message-text">${this.escapeHtml(message.message)}</div>
                </div>
            `;
        }
        
        return messageDiv;
    }
    
    async sendMessage(isMobile = false) {
        const input = isMobile ? this.mobileMessageInput : this.messageInput;
        const text = input.value.trim();
        
        if (!text || !this.currentChatUser || !this.userProfile) return;
        
        try {
            // Create message object for immediate display
            const messageObj = {
                id: Date.now(), // Temporary ID
                sender_id: this.currentUser.id,
                receiver_id: this.currentChatUser.id,
                sender_nyx_name: this.userProfile.nyx_name,
                receiver_nyx_name: this.currentChatUser.nyx_name,
                sender_nyx_number: this.userProfile.nyx_number,
                receiver_nyx_number: this.currentChatUser.nyx_number,
                message: text,
                message_type: 'text',
                is_read: false,
                created_at: new Date().toISOString()
            };
            
            // Display message immediately for sender
            this.messages.push(messageObj);
            this.renderMessage(messageObj);
            this.scrollToBottom();
            
            const { error } = await this.supabase
                .rpc('send_private_message', {
                    p_sender_id: this.currentUser.id,
                    p_receiver_id: this.currentChatUser.id,
                    p_sender_nyx_name: this.userProfile.nyx_name,
                    p_receiver_nyx_name: this.currentChatUser.nyx_name,
                    p_sender_nyx_number: this.userProfile.nyx_number,
                    p_receiver_nyx_number: this.currentChatUser.nyx_number,
                    p_message: text
                });
                
            if (error) {
                throw error;
            }
            
            input.value = '';
            console.log('✅ Private message sent successfully');
            
        } catch (error) {
            console.error('❌ Error sending private message:', error);
            this.showError('Failed to send private message');
            
            // Remove the message from display if sending failed
            this.messages.pop();
            this.renderMessages();
        }
    }
    
    subscribeToPrivateMessages() {
        const channel = this.supabase
            .channel('private-messages')
            .on('postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'private_messages' 
                },
                (payload) => {
                    const newMessage = payload.new;
                    
                    if (newMessage.receiver_id === this.currentUser.id || newMessage.sender_id === this.currentUser.id) {
                        console.log('🔒 New private message:', newMessage);
                        
                        if (this.currentChatUser && 
                            (this.currentChatUser.id === newMessage.sender_id || 
                             this.currentChatUser.id === newMessage.receiver_id)) {
                            
                            // Don't add our own message again (prevent duplicates)
                            if (newMessage.sender_id !== this.currentUser.id) {
                                this.messages.push(newMessage);
                                this.renderMessage(newMessage);
                                this.scrollToBottom();
                                
                                if (newMessage.receiver_id === this.currentUser.id) {
                                    this.markMessagesAsRead(newMessage.sender_id);
                                    this.playNotificationSound();
                                }
                            }
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 Private messages subscription status:', status);
            });
    }
    
    subscribeToOnlineUsers() {
        const profileChannel = this.supabase
            .channel('online-users')
            .on('postgres_changes',
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'profiles' 
                },
                (payload) => {
                    console.log('👤 Profile change detected:', payload);
                    if (payload.eventType === 'UPDATE') {
                        this.loadOnlineUsers();
                        
                        // Update chat header if current user's status changed
                        if (this.currentChatUser && payload.new.id === this.currentChatUser.id) {
                            this.updateChatHeader(payload.new);
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 Online users subscription status:', status);
            });
        
        // Update every 30 seconds as fallback
        setInterval(async () => {
            await this.loadOnlineUsers();
        }, 30000);
    }
    
    async markMessagesAsRead(otherUserId) {
        try {
            const { error } = await this.supabase
                .rpc('mark_messages_read', {
                    p_user_id: this.currentUser.id,
                    p_other_user_id: otherUserId
                });
                
            if (error) {
                console.error('Error marking messages as read:', error);
            }
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    }
    
    goToPublicChat() {
        window.location.href = 'chat.html';
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
    
    scrollToBottom() {
        setTimeout(() => {
            // Desktop messages container
            if (this.messageContainer) {
                this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
            }
            // Mobile messages container
            if (this.mobileMessageContainer) {
                this.mobileMessageContainer.scrollTop = this.mobileMessageContainer.scrollHeight;
            }
            // Also try scrolling parent chat-container
            const desktopChatContainer = document.querySelector('#desktop-layout .chat-container');
            const mobileChatContainer = document.querySelector('#mobile-layout .chat-container');
            
            if (desktopChatContainer) {
                desktopChatContainer.scrollTop = desktopChatContainer.scrollHeight;
            }
            if (mobileChatContainer) {
                mobileChatContainer.scrollTop = mobileChatContainer.scrollHeight;
            }
        }, 200);
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
}

// Initialize Private Chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NyxPrivateChat();
});