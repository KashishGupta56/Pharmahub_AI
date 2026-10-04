// dashboard.js - Full Integrated Version with Role-Based Cloud Bills & Smart Expiry Alert
var BASE_URL = 'http://localhost:5000'; // Local server link
let stockChartInstance = null; 

document.addEventListener('DOMContentLoaded', function() {
    console.log('🏥 Pharmacy Dashboard - Role Based System Loaded');
    
    if (window.location.pathname.includes('dashboard.html')) {
        checkServerHealth().then(isHealthy => {
            if (!isHealthy) console.warn('⚠️ Backend connection issue. Using local data fallback.');
            loadDashboardStats();
        });

        window.addEventListener('storage', function(event) {
            const updates = ['medicineAdded', 'medicineUpdated', 'medicineDeleted', 'dashboardNeedsUpdate', 'billProcessed'];
            if (updates.includes(event.key)) {
                loadDashboardStats();
            }
        });

        setInterval(() => {
            if (document.visibilityState === 'visible') loadDashboardStats();
        }, 30000);
    }
});

async function checkServerHealth() {
    try {
        const response = await fetch(`${BASE_URL}/api/health`);
        const data = await response.json();
        return data.status === 'healthy';
    } catch (error) { return false; }
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${BASE_URL}/api/medicines`);
        if (!response.ok) throw new Error('Backend failed');
        
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = JSON.parse(await response.text());
        }
        
        const medicinesArray = Array.isArray(data) ? data : (data.medicines || data.data || []);
        
        updateDashboardUI(medicinesArray);
        updateSalesStats(); 
        loadSmartExpiryAlert();
    } catch (error) {
        console.error('❌ Stats Error:', error);
        updateSalesStats(); 
    }
}

function updateDashboardUI(medicines) {
    if (!medicines || medicines.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);

    let stats = { totalMedicines: medicines.length, totalStock: 0, totalValue: 0, expiredCount: 0, expiringSoon: 0, lowStock: 0, outOfStock: 0 };
    
    let expiredListArray = [];
    let expiringListArray = [];
    let lowStockListArray = [];
    let outOfStockListArray = [];

    medicines.forEach(m => {
        const qty = parseInt(m.stock !== undefined ? m.stock : (m.quantity !== undefined ? m.quantity : 0)) || 0;
        const price = parseFloat(m.price) || 0;
        const expiry = m.expiryDate ? new Date(m.expiryDate) : null;
        if (expiry) expiry.setHours(0, 0, 0, 0);

        stats.totalStock += qty;
        stats.totalValue += (qty * price);

        if (qty <= 0) {
            stats.outOfStock++;
            outOfStockListArray.push(m.name);
        } else if (qty < 10) {
            stats.lowStock++;
            lowStockListArray.push(`${m.name} (${qty})`);
        }

        if (expiry) {
            if (expiry < today) {
                stats.expiredCount++;
                expiredListArray.push(m.name);
            } else if (expiry >= today && expiry <= thirtyDaysLater) {
                stats.expiringSoon++;
                expiringListArray.push(m.name);
            }
        }
    });

    const inStockCount = medicines.filter(m => {
        const q = parseInt(m.stock !== undefined ? m.stock : (m.quantity || 0)) || 0;
        return q >= 10;
    }).length;

    const elements = {
        'totalMedicines': stats.totalMedicines,
        'totalStock': stats.totalStock,
        'totalStockValue': '₹' + stats.totalValue.toFixed(2),
        'expiredMedicines': stats.expiredCount,
        'expiringSoon': stats.expiringSoon,
        'lowStock': stats.lowStock,
        'outOfStock': stats.outOfStock,
        'inStockCount': inStockCount,
        'lowStockCount': stats.lowStock,
        'emptyStockCount': stats.outOfStock
    };

    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // Populate card text previews
    populateListPreview('expiredList', expiredListArray, 'text-danger');
    populateListPreview('expiringList', expiringListArray, 'text-warning');
    populateListPreview('lowStockList', lowStockListArray, 'text-warning');
    populateListPreview('outOfStockList', outOfStockListArray, 'text-secondary');
    
    updateStockChart(inStockCount, stats.lowStock, stats.outOfStock);
    updateRecentMedicinesTable(medicines.slice(-5).reverse());
}

// 🔥 Smart Expiry Alert Scrollable Box Render Function
async function loadSmartExpiryAlert() {
    try {
        const response = await fetch(`${BASE_URL}/api/medicines/expiring-soon`);
        if (!response.ok) return;
        
        const result = await response.json();
        const expiringList = result.data || [];

        let alertContainer = document.getElementById('smartExpiryAlertBox');
        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.id = 'smartExpiryAlertBox';
            alertContainer.style.cssText = 'background: #fff; border-left: 5px solid #dc3545; border-radius: 8px; padding: 20px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);';
            
            const mainContent = document.querySelector('.main-content');
            const welcomeDiv = mainContent?.querySelector('div');
            if (welcomeDiv && welcomeDiv.nextSibling) {
                mainContent.insertBefore(alertContainer, welcomeDiv.nextSibling);
            } else if (mainContent) {
                mainContent.insertBefore(alertContainer, mainContent.firstChild);
            }
        }

        if (expiringList.length > 0) {
            alertContainer.style.display = 'block';
            let listHtml = '';
            expiringList.forEach(med => {
                const batchText = med.batch ? ` (Batch: ${med.batch})` : '';
                const expiryDateStr = new Date(med.expiryDate).toLocaleDateString('en-GB');
                listHtml += `
                    <li style="margin-bottom: 8px; font-size: 14px; color: #333;">
                        <strong>${med.name}</strong>${batchText} - Expires: <span style="color: #dc3545; font-weight: bold;">${expiryDateStr}</span>
                    </li>
                `;
            });

            alertContainer.innerHTML = `
                <div style="display: flex; align-items: center; color: #dc3545; font-size: 18px; font-weight: bold; margin-bottom: 8px;">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i> Smart Expiry Alert
                </div>
                <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
                    <strong>${expiringList.length}</strong> medicines are expiring in the next 30 days! Please remove them from the front shelf.
                </p>
                <ul style="max-height: 180px; overflow-y: auto; padding-left: 20px; margin: 0; list-style-type: disc;">
                    ${listHtml}
                </ul>
            `;
        } else {
            alertContainer.style.display = 'none';
        }
    } catch (e) {
        console.error("Smart expiry alert error:", e);
    }
}

function populateListPreview(elementId, itemsArray, className) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (itemsArray.length === 0) {
        el.innerHTML = '<span style="color: #28a745; font-size: 11px;">No issues</span>';
        return;
    }
    el.innerHTML = `<span class="${className}" style="font-size: 11px;">${itemsArray.slice(0, 2).join(', ')}</span>`;
}

function updateStockChart(inStock, lowStock, outOfStock) {
    const ctx = document.getElementById('stockChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (stockChartInstance) stockChartInstance.destroy();

    stockChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['In Stock (Good)', 'Low Stock (<10)', 'Out of Stock (0)'],
            datasets: [{
                data: [inStock, lowStock, outOfStock],
                backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                hoverOffset: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });
}

// ==========================================
// 🔥 Role-Based Sales Fetching & UI 🔥
// ==========================================
async function updateSalesStats() {
    try {
        const userStr = localStorage.getItem('user');
        const currentUser = userStr ? JSON.parse(userStr) : null;
        
        let username = '';
        let fullName = '';
        let role = 'staff';

        if (currentUser) {
            username = currentUser.username || '';
            fullName = currentUser.fullName || '';
            role = currentUser.role || 'staff';
        }

        const mainHeader = document.querySelector('.main-content h2');
        if (mainHeader) {
            if (role === 'admin') {
                mainHeader.innerHTML = '<i class="fas fa-tachometer-alt"></i> Admin Dashboard <span style="font-size: 0.5em; background: #dc3545; color: white; padding: 4px 10px; border-radius: 12px; vertical-align: middle; margin-left: 10px; font-family: sans-serif;">GLOBAL</span>';
            } else {
                mainHeader.innerHTML = `<i class="fas fa-user"></i> Staff Dashboard <span style="font-size: 0.5em; background: #28a745; color: white; padding: 4px 10px; border-radius: 12px; vertical-align: middle; margin-left: 10px; font-family: sans-serif;">${fullName || username}</span>`;
            }
        }

        // Fetch bills without restrictive query param so nothing is dropped
        let billHistory = [];
        try {
            const response = await fetch(`${BASE_URL}/api/bills`);
            if (response.ok) {
                billHistory = await response.json(); 
            }
        } catch (fetchErr) {
            console.warn("API fetch error, falling back to local storage");
        }

        if (!billHistory || billHistory.length === 0) {
            const localBills = localStorage.getItem('billHistory');
            billHistory = localBills ? JSON.parse(localBills) : [];
        }

        // Header Text
        const salesHeader = document.querySelector('#recentSales')?.parentElement?.querySelector('h3');
        if (salesHeader) {
            salesHeader.innerHTML = (role === 'admin')
                ? '<i class="fas fa-chart-line"></i> Global Sales (All Staff)'
                : '<i class="fas fa-chart-line"></i> My Recent Sales';
        }

        // Flexible user filtering: Admin sees all, staff sees own bills or global fallback
        let displayBills = billHistory;
        if (role !== 'admin' && (username || fullName)) {
            const userSpecific = billHistory.filter(b => {
                const issuer = (b.issuedBy || '').toLowerCase();
                return issuer === username.toLowerCase() || 
                       issuer === fullName.toLowerCase() || 
                       issuer === 'admin';
            });
            if (userSpecific.length > 0) {
                displayBills = userSpecific;
            }
        }

        // Today's Sales Calculation using locale date string
        const todayDateStr = new Date().toLocaleDateString();
        const todaySales = displayBills.filter(bill => {
            if (!bill.date) return false;
            return new Date(bill.date).toLocaleDateString() === todayDateStr;
        });

        const todaySalesCount = todaySales.length;
        const todaySalesAmount = todaySales.reduce((sum, bill) => sum + (parseFloat(bill.total) || 0), 0);

        const salesCountEl = document.getElementById('todaySales');
        const salesAmtEl = document.getElementById('salesAmount');

        if (salesCountEl) salesCountEl.textContent = todaySalesCount;
        if (salesAmtEl) salesAmtEl.textContent = '₹' + todaySalesAmount.toFixed(2);

        updateRecentSalesTable(displayBills);
    } catch (error) { 
        console.error("Sales Calculation Error:", error); 
    }
}

function updateRecentSalesTable(billHistory) {
    try {
        const container = document.getElementById('recentSales');
        if (!container) return;

        if (!billHistory || billHistory.length === 0) {
            container.innerHTML = '<p class="text-muted p-3">No sales data available yet.</p>';
            return;
        }

        const recentBills = billHistory.slice(0, 5);
        let html = `<div class="table-responsive"><table class="table table-sm table-hover mb-0" style="width: 100%;">
                    <thead>
                        <tr>
                            <th>Bill No</th>
                            <th>Customer</th>
                            <th>Issued By</th>
                            <th>Amount</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        recentBills.forEach(bill => {
            const dateObj = new Date(bill.date || Date.now());
            const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const customerName = (bill.customer && bill.customer.name) ? bill.customer.name : 'Walk-in';
            const totalAmount = bill.total ? parseFloat(bill.total).toFixed(2) : '0.00';
            const issuedBy = bill.issuedBy || 'Admin'; 
            
            const badgeStyle = (issuedBy.toLowerCase() === 'admin') 
                ? 'background: #6a5acd; color: white; padding: 2px 8px; border-radius: 10px;' 
                : 'background: #e9ecef; color: #495057; border: 1px solid #ccc; padding: 2px 8px; border-radius: 10px;';

            html += `<tr>
                <td><small class="text-muted">${bill.billNumber || '-'}</small></td>
                <td><strong>${customerName}</strong></td>
                <td><span class="badge" style="${badgeStyle}">${issuedBy}</span></td>
                <td><span style="color: #28a745; font-weight: bold;">₹${totalAmount}</span></td>
                <td><span class="badge text-muted" style="background: transparent;">${time}</span></td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    } catch (e) { 
        console.error("Table render error:", e); 
    }
}

function updateRecentMedicinesTable(recentMeds) {
    const container = document.getElementById('recentMedicines');
    if (!container) return;

    if (recentMeds.length === 0) {
        container.innerHTML = '<p class="text-muted p-2">No recent medicines found.</p>';
        return;
    }

    let html = '<table class="table table-sm"><tbody>';
    recentMeds.forEach(med => {
        const qty = med.stock !== undefined ? med.stock : (med.quantity || 0);
        html += `<tr>
            <td><strong>${med.name}</strong></td>
            <td><span class="badge ${qty < 10 ? 'bg-warning text-dark' : 'bg-success'}">${qty} in stock</span></td>
        </tr>`;
    });
    container.innerHTML = html + '</tbody></table>';
}

window.loadDashboardStats = loadDashboardStats;