// main.js - Main JavaScript with Backend URL fix

// 1. Sabse pehle apna Render Backend URL yahan declare karo (const ki jagah var lagaya hai error rokne ke liye)
var API_BASE_URL = 'https://pharmacy-backend-api-3ihh.onrender.com';

// Show message function
function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        const alertClass = type === 'success' ? 'alert-success' : 
                           type === 'error' ? 'alert-error' : 
                           type === 'warning' ? 'alert-warning' : 'alert';
        
        messageDiv.innerHTML = `
            <div class="alert ${alertClass}">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 
                                   type === 'error' ? 'exclamation-triangle' : 
                                   type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
                ${message}
            </div>
        `;
        
        setTimeout(() => {
            if (messageDiv.innerHTML.includes(message)) {
                messageDiv.innerHTML = '';
            }
        }, 5000);
    }
    console.log(`${type.toUpperCase()}: ${message}`);
}

// API request helper
async function apiRequest(endpoint, options = {}) { // URL ki jagah endpoint use karenge
    // Yahan hum base URL aur endpoint ko jod rahe hain
    const fullUrl = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    const requestOptions = {
        ...options,
        headers
    };
    
    try {
        const response = await fetch(fullUrl, requestOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `Request failed with status ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        showMessage(`API Error: ${error.message}`, 'error');
        throw error;
    }
}

// Check server health
async function checkServerHealth() {
    try {
        // Yahan bhi full Render URL ka use ho raha hai
        const response = await fetch(`${API_BASE_URL}/api/health`);
        if (!response.ok) {
            return false;
        }
        const data = await response.json();
        return data.status === 'healthy';
    } catch (error) {
        console.error('Server health check failed:', error);
        return false;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 Pharmacy Management System loaded');
    
    if (window.location.pathname.includes('dashboard.html')) {
        checkServerHealth().then(isHealthy => {
            if (!isHealthy) {
                showMessage('⚠️ Backend server connection issue detected', 'warning');
            } else {
                console.log('✅ Backend connected successfully');
            }
        });
    }
});

// Export functions for use in other files
window.utils = {
    showMessage,
    apiRequest,
    checkServerHealth,
    API_BASE_URL // Isse baaki files mein bhi use kar sakte hain
};