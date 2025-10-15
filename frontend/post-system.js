// 📝 COMPLETE POST MANAGEMENT SYSTEM
class PostCreationSystem {
    constructor() {
        this.tags = [];
        this.media = [];
        this.apiBase = window.location.origin + '/api';
        this.init();
    }

    init() {
        this.setupEventListeners();
        console.log('✅ PostCreationSystem initialized');
    }

    setupEventListeners() {
        // Post form submission
        const postForm = document.getElementById('post-form');
        if (postForm) {
            postForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createPost();
            });
        }

        // Tags input
        const tagsInput = document.getElementById('post-tags');
        if (tagsInput) {
            tagsInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    this.addTag();
                }
            });

            tagsInput.addEventListener('blur', () => {
                this.addTag();
            });
        }

        // Zone selection
        document.querySelectorAll('input[name="zone"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateZone(e.target.value);
            });
        });
    }

    addTag() {
        const input = document.getElementById('post-tags');
        let tag = input.value.trim().replace(',', '').replace('#', '');
        
        if (tag && !this.tags.includes(tag)) {
            this.tags.push(tag);
            this.renderTags();
            input.value = '';
        }
    }

    removeTag(tagToRemove) {
        this.tags = this.tags.filter(tag => tag !== tagToRemove);
        this.renderTags();
    }

    renderTags() {
        const container = document.getElementById('tags-display');
        if (container) {
            container.innerHTML = this.tags.map(tag => `
                <span class="inline-flex items-center px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">
                    #${tag}
                    <button type="button" class="ml-2 text-purple-300 hover:text-white" onclick="window.postCreation.removeTag('${tag}')">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </span>
            `).join('');
        }
    }

    addMedia(url) {
        this.media.push(url);
        this.renderMedia();
    }

    removeMedia(url) {
        this.media = this.media.filter(mediaUrl => mediaUrl !== url);
        this.renderMedia();
    }

    renderMedia() {
        const container = document.querySelector('.media-preview');
        if (!container) return;

        container.innerHTML = this.media.map(url => `
            <div class="relative">
                <img src="${url}" alt="Preview" class="w-20 h-20 object-cover rounded-lg">
                <button type="button" class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs" onclick="window.postCreation.removeMedia('${url}')">
                    ×
                </button>
            </div>
        `).join('');
    }

    updateZone(zone) {
        console.log('Selected zone:', zone);
        // You can update UI based on selected zone
    }

    async createPost() {
        if (!window.authSystem || !window.authSystem.isAuthenticated()) {
            window.authSystem.showToast('Please login to create posts', 'error');
            return;
        }

        const zone = document.querySelector('input[name="zone"]:checked')?.value;
        const content = document.getElementById('post-content')?.value.trim();
        
        if (!zone) {
            window.authSystem.showToast('Please select a zone', 'error');
            return;
        }
        
        if (!content) {
            window.authSystem.showToast('Please add some content', 'error');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('content', content);
            formData.append('zone', zone);
            formData.append('tags', this.tags.join(','));

            // Add media files if any
            this.media.forEach((media, index) => {
                // This would need to be actual File objects, not URLs
                // For now, we'll handle media uploads separately
            });

            const response = await fetch(this.apiBase + '/posts', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + window.authSystem.token
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to create post');
            }

            window.authSystem.showToast(`Post created in ${zone} zone! 🎉`, 'success');
            
            // Reset form
            this.resetForm();
            
            // Refresh posts in the current zone
            if (window.postManager) {
                window.postManager.loadPosts(zone);
            }

        } catch (error) {
            console.error('❌ Post creation error:', error);
            window.authSystem.showToast(error.message, 'error');
        }
    }

    resetForm() {
        const form = document.getElementById('post-form');
        if (form) form.reset();
        
        this.tags = [];
        this.media = [];
        this.renderTags();
        this.renderMedia();
    }
}

// Zone Navigation System
class ZoneManager {
    constructor() {
        this.currentZone = null;
        this.init();
    }

    init() {
        this.setupZoneNavigation();
        console.log('✅ ZoneManager initialized');
    }

    setupZoneNavigation() {
        // Zone card buttons
        document.querySelectorAll('.zone-card .btn-primary').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const zoneCard = e.target.closest('.zone-card');
                const zone = zoneCard.id; // gaming, life, culture, professional
                this.enterZone(zone);
            });
        });
    }

    enterZone(zone) {
        if (!window.authSystem || !window.authSystem.isAuthenticated()) {
            window.authSystem.showToast('Please login to enter zones', 'error');
            return;
        }

        this.currentZone = zone;
        
        // Update UI to show we're in the zone
        document.querySelectorAll('.zone-card').forEach(card => {
            card.classList.remove('border-purple-500', 'border-2');
        });
        
        const currentZoneCard = document.getElementById(zone);
        if (currentZoneCard) {
            currentZoneCard.classList.add('border-purple-500', 'border-2');
        }

        // Show zone-specific content
        this.showZoneContent(zone);
        
        // Join zone in real-time system
        if (window.realTimeSystem) {
            window.realTimeSystem.joinZone(zone);
        }

        window.authSystem.showToast(`Entered ${this.getZoneName(zone)} Zone! 🎮`, 'success');
    }

    getZoneName(zone) {
        const zoneNames = {
            gaming: 'Gaming',
            life: 'Daily Life', 
            culture: 'Culture & Events',
            professional: 'Professional'
        };
        return zoneNames[zone] || zone;
    }

    showZoneContent(zone) {
        // Hide all zone contents
        document.querySelectorAll('.zone-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // Show current zone content
        const zoneContent = document.getElementById(`${zone}-content`);
        if (zoneContent) {
            zoneContent.classList.remove('hidden');
        }
        
        // Load posts for this zone
        if (window.postManager) {
            window.postManager.loadPosts(zone);
        }
    }
}

// Post Display Manager
class PostManager {
    constructor() {
        this.currentZone = null;
        this.apiBase = window.location.origin + '/api';
        this.init();
    }

    init() {
        console.log('✅ PostManager initialized');
    }

    async loadPosts(zone, page = 1) {
        try {
            const response = await fetch(`${this.apiBase}/posts/${zone}?page=${page}&limit=10`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to load posts');
            }

            this.displayPosts(data.posts, zone);
            
        } catch (error) {
            console.error('❌ Load posts error:', error);
            if (window.authSystem) {
                window.authSystem.showToast('Failed to load posts', 'error');
            }
        }
    }

    displayPosts(posts, zone) {
        const container = document.getElementById(`${zone}-posts`);
        if (!container) return;

        if (posts.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-white/60">No posts yet in ${zone} zone. Be the first to post! 🎉</p>
                </div>
            `;
            return;
        }

        container.innerHTML = posts.map(post => this.createPostHTML(post)).join('');
    }

    createPostHTML(post) {
        return `
            <div class="card-glass p-6 rounded-xl mb-4" data-post-id="${post._id}">
                <div class="flex items-center space-x-3 mb-4">
                    <div class="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span class="text-sm">${post.userAvatar || '👤'}</span>
                    </div>
                    <div>
                        <p class="text-white font-semibold">${post.username}</p>
                        <p class="text-white/60 text-sm">${new Date(post.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span class="ml-auto px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                        ${post.zone}
                    </span>
                </div>
                
                <p class="text-white mb-4">${post.content}</p>
                
                ${post.media && post.media.length > 0 ? `
                    <div class="grid grid-cols-2 gap-2 mb-4">
                        ${post.media.map(media => `
                            <div class="rounded-lg overflow-hidden">
                                ${media.mediaType === 'video' ? `
                                    <video src="${media.url}" controls class="w-full h-32 object-cover"></video>
                                ` : `
                                    <img src="${media.url}" alt="Post media" class="w-full h-32 object-cover">
                                `}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${post.tags && post.tags.length > 0 ? `
                    <div class="flex flex-wrap gap-1 mb-4">
                        ${post.tags.map(tag => `
                            <span class="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-full">#${tag}</span>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="flex items-center justify-between border-t border-white/10 pt-4">
                    <div class="flex items-center space-x-4">
                        <button class="flex items-center space-x-2 text-white/60 hover:text-red-400 transition-colors like-btn" onclick="window.postManager.likePost('${post._id}')">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                            </svg>
                            <span class="likes-count">${post.likesCount || 0}</span>
                        </button>
                        
                        <button class="flex items-center space-x-2 text-white/60 hover:text-blue-400 transition-colors comment-btn" onclick="window.postManager.showComments('${post._id}')">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                            <span class="comments-count">${post.commentsCount || 0}</span>
                        </button>
                    </div>
                    
                    <button class="text-white/60 hover:text-white transition-colors share-btn">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    async likePost(postId) {
        if (!window.authSystem || !window.authSystem.isAuthenticated()) {
            window.authSystem.showToast('Please login to like posts', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + window.authSystem.token,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to like post');
            }

            // Update like count in UI
            const likeElement = document.querySelector(`[data-post-id="${postId}"] .likes-count`);
            if (likeElement) {
                likeElement.textContent = data.likesCount;
            }

        } catch (error) {
            console.error('❌ Like post error:', error);
            window.authSystem.showToast(error.message, 'error');
        }
    }

    addPostToFeed(post) {
        if (this.currentZone === post.zone) {
            const container = document.getElementById(`${post.zone}-posts`);
            if (container) {
                const postHTML = this.createPostHTML(post);
                container.insertAdjacentHTML('afterbegin', postHTML);
            }
        }
    }
}

// Initialize all systems
document.addEventListener('DOMContentLoaded', () => {
    window.postCreation = new PostCreationSystem();
    window.zoneManager = new ZoneManager();
    window.postManager = new PostManager();
});
