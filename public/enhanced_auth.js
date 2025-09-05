// Enhanced Authentication System for PoolMate

class AuthManager {
    constructor() {
        this.baseURL = window.location.origin;
        this.token = localStorage.getItem('authToken');
        this.user = null;
        this.init();
    }

    init() {
        // Check if user is already logged in
        if (this.token) {
            this.validateToken();
        }
    }

    async validateToken() {
        try {
            const response = await this.makeRequest('/api/profile', 'GET');
            if (response.success) {
                this.user = response.data;
                this.redirectToDashboard();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Token validation failed:', error);
            this.logout();
        }
    }

    async register(userData, userType) {
        try {
            const endpoint = userType === 'rider' ? '/api/rider/register' : '/api/driver/register';
            const response = await this.makeRequest(endpoint, 'POST', userData);
            
            if (response.success) {
                this.token = response.data.token;
                this.user = response.data.user;
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('userEmail', this.user.email);
                
                this.showSuccess('Registration successful! Please check your email for verification.');
                setTimeout(() => this.redirectToDashboard(), 2000);
                
                return { success: true, data: response.data };
            } else {
                this.showError(response.message || 'Registration failed');
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Registration failed. Please try again.');
            return { success: false, message: error.message };
        }
    }

    async login(email, password, userType) {
        try {
            const response = await this.makeRequest('/api/login', 'POST', {
                email,
                password,
                userType
            });
            
            if (response.success) {
                this.token = response.data.token;
                this.user = response.data.user;
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('userEmail', this.user.email);
                
                this.showSuccess('Login successful! Redirecting...');
                setTimeout(() => this.redirectToDashboard(), 1500);
                
                return { success: true, data: response.data };
            } else {
                this.showError(response.message || 'Login failed');
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please check your credentials.');
            return { success: false, message: error.message };
        }
    }

    async updateProfile(updateData) {
        try {
            const response = await this.makeRequest('/api/profile', 'PUT', updateData);
            
            if (response.success) {
                this.user = response.data;
                this.showSuccess('Profile updated successfully!');
                return { success: true, data: response.data };
            } else {
                this.showError(response.message || 'Profile update failed');
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('Profile update error:', error);
            this.showError('Profile update failed. Please try again.');
            return { success: false, message: error.message };
        }
    }

    async uploadAvatar(file) {
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch(`${this.baseURL}/api/profile/upload-avatar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccess('Profile picture updated successfully!');
                return { success: true, data: data.data };
            } else {
                this.showError(data.message || 'Upload failed');
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Avatar upload error:', error);
            this.showError('Upload failed. Please try again.');
            return { success: false, message: error.message };
        }
    }

    async forgotPassword(email) {
        try {
            const response = await this.makeRequest('/api/auth/forgot-password', 'POST', { email });
            
            if (response.success) {
                this.showSuccess('Password reset email sent! Please check your inbox.');
                return { success: true };
            } else {
                this.showError(response.message || 'Failed to send reset email');
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showError('Failed to send reset email. Please try again.');
            return { success: false, message: error.message };
        }
    }

    async resetPassword(token, newPassword) {
        try {
            const response = await this.makeRequest('/api/auth/reset-password', 'POST', {
                token,
                newPassword
            });
            
            if (response.success) {
                this.showSuccess('Password reset successful! Please login with your new password.');
                setTimeout(() => window.location.href = '/rlogin', 2000);
                return { success: true };
            } else {
                this.showError(response.message || 'Password reset failed');
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('Password reset error:', error);
            this.showError('Password reset failed. Please try again.');
            return { success: false, message: error.message };
        }
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userEmail');
        window.location.href = '/';
    }

    redirectToDashboard() {
        window.location.href = '/dashboard';
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Remove existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="toast-icon fas fa-${this.getToastIcon(type)}"></i>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add toast styles if not already present
        if (!document.querySelector('#toast-styles')) {
            const styles = document.createElement('style');
            styles.id = 'toast-styles';
            styles.textContent = `
                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 10000;
                    min-width: 300px;
                    max-width: 500px;
                    animation: slideIn 0.3s ease-out;
                    border-left: 4px solid #10b981;
                }
                
                .toast-success {
                    border-left-color: #10b981;
                }
                
                .toast-error {
                    border-left-color: #ef4444;
                }
                
                .toast-warning {
                    border-left-color: #f59e0b;
                }
                
                .toast-info {
                    border-left-color: #3b82f6;
                }
                
                .toast-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                }
                
                .toast-icon {
                    font-size: 16px;
                }
                
                .toast-success .toast-icon {
                    color: #10b981;
                }
                
                .toast-error .toast-icon {
                    color: #ef4444;
                }
                
                .toast-warning .toast-icon {
                    color: #f59e0b;
                }
                
                .toast-info .toast-icon {
                    color: #3b82f6;
                }
                
                .toast-message {
                    font-weight: 500;
                    color: #374151;
                }
                
                .toast-close {
                    background: none;
                    border: none;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                
                .toast-close:hover {
                    background: #f3f4f6;
                    color: #374151;
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        // Add toast to page
        document.body.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    getToastIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            case 'info': return 'info-circle';
            default: return 'info-circle';
        }
    }
}

// Form validation utilities
class FormValidator {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    static validatePassword(password) {
        return password.length >= 6;
    }

    static validateRequired(value) {
        return value && value.trim().length > 0;
    }

    static validateForm(formData, rules) {
        const errors = {};

        for (const [field, rule] of Object.entries(rules)) {
            const value = formData[field];

            if (rule.required && !this.validateRequired(value)) {
                errors[field] = `${rule.label} is required`;
                continue;
            }

            if (value && rule.type === 'email' && !this.validateEmail(value)) {
                errors[field] = 'Please enter a valid email address';
            }

            if (value && rule.type === 'phone' && !this.validatePhone(value)) {
                errors[field] = 'Please enter a valid phone number';
            }

            if (value && rule.type === 'password' && !this.validatePassword(value)) {
                errors[field] = 'Password must be at least 6 characters long';
            }

            if (value && rule.minLength && value.length < rule.minLength) {
                errors[field] = `${rule.label} must be at least ${rule.minLength} characters long`;
            }

            if (value && rule.maxLength && value.length > rule.maxLength) {
                errors[field] = `${rule.label} must be no more than ${rule.maxLength} characters long`;
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    static showFieldError(fieldName, message) {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (!field) return;

        // Remove existing error
        const existingError = field.parentElement.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }

        // Add error class to field
        field.classList.add('error');

        // Create error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: #ef4444;
            font-size: 0.875rem;
            margin-top: 0.25rem;
            font-weight: 500;
        `;

        // Insert error message after field
        field.parentElement.appendChild(errorElement);
    }

    static clearFieldErrors() {
        // Remove error classes
        document.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
        });

        // Remove error messages
        document.querySelectorAll('.field-error').forEach(error => {
            error.remove();
        });
    }

    static showFormErrors(errors) {
        this.clearFieldErrors();
        
        for (const [field, message] of Object.entries(errors)) {
            this.showFieldError(field, message);
        }
    }
}

// Loading state manager
class LoadingManager {
    static showButtonLoading(button, loadingText = 'Loading...') {
        if (!button) return;

        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            ${loadingText}
        `;
    }

    static hideButtonLoading(button) {
        if (!button) return;

        button.disabled = false;
        button.textContent = button.dataset.originalText || 'Submit';
    }

    static showPageLoading() {
        const loader = document.createElement('div');
        loader.id = 'page-loader';
        loader.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            ">
                <div style="text-align: center;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #10b981; margin-bottom: 1rem;"></i>
                    <div style="color: #6b7280; font-weight: 500;">Loading...</div>
                </div>
            </div>
        `;
        document.body.appendChild(loader);
    }

    static hidePageLoading() {
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.remove();
        }
    }
}

// Initialize global auth manager
window.authManager = new AuthManager();
window.FormValidator = FormValidator;
window.LoadingManager = LoadingManager;

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, FormValidator, LoadingManager };
}

