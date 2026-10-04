// smartInventory.js - Phase 1 Frontend Handler
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('view-medicines.html')) {
        loadSmartInventoryData();
    }
});

async function loadSmartInventoryData() {
    try {
        const response = await fetch('http://localhost:5000/api/ai/smart-inventory');
        if (!response.ok) return;

        const result = await response.json();
        if (!result.success || !result.data) return;

        renderSmartInventoryWidgets(result.data);
    } catch (error) {
        console.warn("Smart Inventory Engine offline:", error);
    }
}

function renderSmartInventoryWidgets(items) {
    // Agar dashboard par hain toh smart panel inject karein
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    let panel = document.getElementById('smartInventoryPanel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'smartInventoryPanel';
        panel.style.cssText = 'background: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border-left: 5px solid #3498db;';
        
        const firstCard = mainContent.querySelector('div');
        if (firstCard) mainContent.insertBefore(panel, firstCard.nextSibling);
    }

    const criticalItems = items.filter(i => i.healthStatus.includes('Critical'));
    const deadStockItems = items.filter(i => i.healthStatus.includes('Dead'));

    panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <h3 style="margin:0; font-size: 17px; color: #2c3e50;">
                <i class="fas fa-boxes" style="color: #3498db; margin-right: 8px;"></i> Smart Inventory Intelligence
            </h3>
            <span style="font-size: 12px; background: #ebf5fb; color: #2980b9; padding: 4px 10px; border-radius: 15px; font-weight: bold;">
                Real-time Consumption Tracking
            </span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div style="background: #fdfefe; padding: 12px; border-radius: 8px; border: 1px solid #eaeded;">
                <small style="color: #7f8c8d;">Fast Depleting Items (&le; 5 Days)</small>
                <h4 style="margin: 5px 0 0; color: #e67e22; font-size: 20px;">${criticalItems.length} Medicines</h4>
            </div>
            <div style="background: #fdfefe; padding: 12px; border-radius: 8px; border: 1px solid #eaeded;">
                <small style="color: #7f8c8d;">Dead Stock (0 Sales Last 30d)</small>
                <h4 style="margin: 5px 0 0; color: #7f8c8d; font-size: 20px;">${deadStockItems.length} Medicines</h4>
            </div>
        </div>
    `;
}