// ============ PHARMACY MANAGEMENT SYSTEM - AUTHENTICATION ============
// CONST ko hatakar VAR kar diya taaki doosri files ke sath clash na ho
var BASE_URL = 'https://pharmacy-backend-api-3ihh.onrender.com';

// 1. Check if user is logged in
function isAuthenticated() {
    return localStorage.getItem('isLoggedIn') === 'true';
}

// 2. Get current user data
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : { username: localStorage.getItem('username') || 'Admin' };
}

// 3. Login User Function
async function loginUser(username, password) {
    try {
        const response = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('loginTime', new Date().getTime());
            return { success: true, message: 'Login successful' };
        } else {
            return { success: false, message: data.message || 'Invalid credentials' };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Server connection error.' };
    }
}

// 4. Logout Function
async function logout() {
    const token = localStorage.getItem('authToken');
    try {
        await fetch(`${BASE_URL}/api/logout`, {
            method: 'POST',
            headers: { 'Authorization': token || '' }
        });
    } catch (error) {
        console.log('Logout API error:', error);
    }
    localStorage.clear();
    window.location.href = 'login.html';
}

// 5. Page Protection
function protectPage() {
    const currentPage = window.location.pathname.split('/').pop();
    const protectedPages = ['dashboard.html', 'add-medicine.html', 'billing.html', 'view-medicines.html'];
    if (protectedPages.includes(currentPage) && !isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// 6. Navigation Update
function updateNavigation() {
    const nav = document.querySelector('nav ul');
    if (!nav) return;
    
    const isLoggedIn = isAuthenticated();
    const loginLink = nav.querySelector('a[href="login.html"]');
    const logoutBtn = nav.querySelector('.logout-btn');
    
    if (isLoggedIn) {
        if (loginLink) loginLink.parentElement.style.display = 'none';
        if (!logoutBtn) {
            const user = getCurrentUser();
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" onclick="logout()" class="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout (${user.username})</a>`;
            nav.appendChild(li);
        }
    } else {
        if (loginLink) loginLink.parentElement.style.display = '';
        if (logoutBtn) logoutBtn.parentElement.remove();
    }
}

// 7. Forgot Password Function (NAYA ADD KIYA HAI)
async function handleForgotPassword() {
    const email = prompt("Please enter your registered Email ID:");
    
    if (!email) return; // User cancelled
    if (!email.includes('@')) {
        alert('❌ Please enter a valid email address.');
        return;
    }

    alert('⏳ Sending email... Please wait.');

    try {
        const response = await fetch(`${BASE_URL}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ ' + data.message);
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        alert('❌ Server connection error.');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    protectPage();
    updateNavigation();
});

// Make functions globally available
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.loginUser = loginUser;
window.logout = logout;
window.protectPage = protectPage;
window.handleForgotPassword = handleForgotPassword; // Isko global kar diya taaki HTML se chal sake