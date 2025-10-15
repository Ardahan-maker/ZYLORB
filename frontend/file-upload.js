// 📁 COMPLETE FILE UPLOAD SYSTEM
class FileUploadSystem {
    constructor() {
        this.apiBase = window.location.origin + '/api';
        this.init();
    }

    init() {
        console.log('✅ FileUploadSystem initialized');
    }

    async uploadFile(file) {
        try {
            if (!window.authSystem || !window.authSystem.isAuthenticated()) {
                throw new Error('Please login to upload files');
            }

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(this.apiBase + '/upload', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + window.authSystem.token
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Upload failed');
            }

            window.authSystem.showToast('File uploaded successfully! 📁', 'success');
            return data;

        } catch (error) {
            console.error('❌ Upload error:', error);
            window.authSystem.showToast(error.message, 'error');
            throw error;
        }
    }

    showUploader() {
        if (!window.authSystem || !window.authSystem.isAuthenticated()) {
            window.authSystem.showToast('Please login to upload files', 'error');
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.style.display = 'none';

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const result = await this.uploadFile(file);
                    console.log('✅ Upload result:', result);
                    
                    // You can use the uploaded file URL here
                    // For example, in post creation
                    if (window.postCreation) {
                        window.postCreation.addMedia(result.url);
                    }
                } catch (error) {
                    console.error('Upload failed:', error);
                }
            }
        });

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }
}

// Initialize File Upload System
document.addEventListener('DOMContentLoaded', () => {
    window.fileUploadSystem = new FileUploadSystem();
});
