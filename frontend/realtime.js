// ⚡ COMPLETE REAL-TIME SYSTEM
class RealTimeSystem {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.apiBase = window.location.origin;
        this.init();
    }

    init() {
        console.log('✅ RealTimeSystem initializing...');
        this.connect();
        
        // Reconnect when user logs in
        document.addEventListener('userLoggedIn', () => {
            this.connect();
        });
    }

    connect() {
        try {
            // Connect to Socket.io
            this.socket = io(this.apiBase, {
                transports: ['websocket', 'polling']
            });

            this.socket.on('connect', () => {
                this.isConnected = true;
                console.log('🔗 Socket.io connected:', this.socket.id);
                
                // Join user room if authenticated
                if (window.authSystem && window.authSystem.isAuthenticated()) {
                    this.socket.emit('joinUser', window.authSystem.user.id);
                }
            });

            this.socket.on('disconnect', () => {
                this.isConnected = false;
                console.log('🔌 Socket.io disconnected');
            });

            this.socket.on('newPost', (data) => {
                console.log('📮 New post received:', data);
                this.handleNewPost(data);
            });

            this.socket.on('postLiked', (data) => {
                console.log('❤️ Post liked:', data);
                this.handlePostLiked(data);
            });

            this.socket.on('newComment', (data) => {
                console.log('💬 New comment:', data);
                this.handleNewComment(data);
            });

            this.socket.on('newMessage', (data) => {
                console.log('📨 New message:', data);
                this.handleNewMessage(data);
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Socket connection error:', error);
                this.isConnected = false;
            });

        } catch (error) {
            console.error('❌ RealTimeSystem connection failed:', error);
        }
    }

    handleNewPost(data) {
        // Show notification
        if (window.authSystem) {
            window.authSystem.showToast(`New post in ${data.post.zone} zone by ${data.post.user.username}! 📝`, 'info');
        }

        // Update posts feed if we're in the same zone
        if (window.postManager && window.postManager.currentZone === data.post.zone) {
            window.postManager.addPostToFeed(data.post);
        }
    }

    handlePostLiked(data) {
        // Update like count in UI
        const likeElement = document.querySelector(`[data-post-id="${data.postId}"] .likes-count`);
        if (likeElement) {
            likeElement.textContent = data.likesCount;
        }
    }

    handleNewComment(data) {
        // Update comment count in UI
        const commentElement = document.querySelector(`[data-post-id="${data.postId}"] .comments-count`);
        if (commentElement) {
            commentElement.textContent = parseInt(commentElement.textContent) + 1;
        }
    }

    handleNewMessage(data) {
        // Show message notification
        if (window.authSystem) {
            window.authSystem.showToast(`New message from ${data.from} 💬`, 'info');
        }
    }

    joinZone(zone) {
        if (this.socket && this.isConnected) {
            this.socket.emit('joinZone', zone);
        }
    }

    sendMessage(to, message) {
        if (this.socket && this.isConnected && window.authSystem) {
            this.socket.emit('sendMessage', {
                to: to,
                message: message,
                from: window.authSystem.user.id
            });
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.isConnected = false;
        }
    }
}

// Initialize RealTime System
document.addEventListener('DOMContentLoaded', () => {
    window.realTimeSystem = new RealTimeSystem();
}); 
