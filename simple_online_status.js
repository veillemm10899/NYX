// Simple online status management for NYX

class SimpleOnlineStatus {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.userId = null;
        this.heartbeatInterval = null;
        this.cleanupInterval = null;
    }

    // Initialize online status tracking
    async initialize() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (user) {
                this.userId = user.id;
                await this.setOnline(true);
                this.startHeartbeat();
                console.log('Online status tracking started');
            }
        } catch (error) {
            console.error('Failed to initialize online status:', error);
        }
    }

    // Set user online/offline status
    async setOnline(isOnline) {
        if (!this.userId) return;

        try {
            const { error } = await this.supabase.rpc('update_online_status', {
                user_id: this.userId,
                online_status: isOnline
            });

            if (error) {
                console.error('Failed to update online status:', error);
            } else {
                console.log(`User is now ${isOnline ? 'online' : 'offline'}`);
            }
        } catch (error) {
            console.error('Error setting online status:', error);
        }
    }

    // Start heartbeat to keep user marked as online
    startHeartbeat() {
        // Send heartbeat every 2 minutes
        this.heartbeatInterval = setInterval(async () => {
            if (this.userId) {
                try {
                    const { error } = await this.supabase
                        .from('profiles')
                        .update({ 
                            last_seen: new Date().toISOString(),
                            is_online: true 
                        })
                        .eq('id', this.userId);

                    if (error) {
                        console.error('Heartbeat failed:', error);
                    }
                } catch (error) {
                    console.error('Heartbeat error:', error);
                }
            }
        }, 2 * 60 * 1000); // 2 minutes

        // Cleanup offline users every 5 minutes
        this.cleanupInterval = setInterval(async () => {
            try {
                await this.supabase.rpc('cleanup_offline_users');
            } catch (error) {
                console.error('Cleanup failed:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Stop heartbeat and set user offline
    async stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        await this.setOnline(false);
        console.log('Online status tracking stopped');
    }

    // Get current online users count
    async getOnlineCount() {
        try {
            const { data, error } = await this.supabase.rpc('get_online_count');
            return error ? 0 : data || 0;
        } catch (error) {
            console.error('Error getting online count:', error);
            return 0;
        }
    }

    // Get list of online users
    async getOnlineUsers() {
        try {
            const { data, error } = await this.supabase.rpc('get_online_users');
            return error ? [] : data || [];
        } catch (error) {
            console.error('Error getting online users:', error);
            return [];
        }
    }
}

// Initialize online status when user logs in
window.SimpleOnlineStatus = SimpleOnlineStatus;

// Auto-cleanup when user leaves the page
window.addEventListener('beforeunload', () => {
    if (window.simpleOnlineStatus) {
        window.simpleOnlineStatus.stop();
    }
});