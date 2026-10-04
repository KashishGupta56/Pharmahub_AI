// smartReorder.js - Phase 2 AI Reorder Engine (Autonomous Rendering)
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        setTimeout(loadReorderRecommendations, 300);
    }
});

async function loadReorderRecommendations() {
    try {
        const response = await fetch('http://localhost:5000/api/ai/reorder-recommendations');
        if (!response.ok) return;

        const result = await response.json();
        if (!result.success || !result.data) return;

        renderReorderCard(result.data);
    } catch (e) {
        console.warn("Reorder recommendation service error:", e);
    }
}

function renderReorderCard(items) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    let card = document.getElementById('aiReorderCard');
    if (!card) {
        card = document.createElement('div');
        card.id = 'aiReorderCard';
        card.style.cssText = 'background: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border-left: 5px solid #e67e22;';
        
        // Smart Inventory Panel ke theek baad insert karein
        const invPanel = document.getElementById('smartInventoryPanel');
        if (invPanel && invPanel.nextSibling) {
            mainContent.insertBefore(card, invPanel.nextSibling);
        } else {
            const firstRow = mainContent.querySelector('.row');
            if (firstRow) mainContent.insertBefore(card, firstRow);
            else mainContent.appendChild(card);
        }
    }

    if (items.length === 0) {
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size: 16px; color: #2c3e50;">
                    <i class="fas fa-truck-loading" style="color: #e67e22; margin-right: 8px;"></i> AI Smart Reorder Suggestions
                </h3>
                <span style="font-size: 12px; color: #27ae60; font-weight: bold;">
                    <i class="fas fa-check-circle"></i> All Stock Optimal
                </span>
            </div>
            <p style="margin: 8px 0 0; font-size: 13px; color: #7f8c8d;">
                Current stock velocity indicates no medicines need restocking right now.
            </p>
        `;
        return;
    }

    let rowsHtml = '';
    items.forEach(item => {
        const isOut = item.currentStock === 0;
        const badgeBg = isOut ? '#dc3545' : '#e67e22';
        const badgeText = isOut ? 'OUT OF STOCK' : 'LOW';

        rowsHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 1px solid #f2f4f4; font-size: 13px;">
                <div>
                    <strong>${item.name}</strong> <small style="color:#7f8c8d;">(${item.company})</small>
                    <span style="font-size: 10px; background: ${badgeBg}; color: white; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: bold;">${badgeText}</span>
                </div>
                <div style="text-align: right;">
                    Current: <strong>${item.currentStock}</strong> | 
                    <span style="color: #2980b9; font-weight: bold; background: #ebf5fb; padding: 3px 8px; border-radius: 4px;">
                        Reorder: +${item.recommendedUnits} units
                    </span>
                </div>
            </div>
        `;
    });

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <h3 style="margin:0; font-size: 16px; color: #2c3e50;">
                <i class="fas fa-truck-loading" style="color: #e67e22; margin-right: 8px;"></i> AI Smart Reorder Suggestions (${items.length} Medicines)
            </h3>
            <span style="font-size: 11px; background: #fef5e7; color: #d35400; padding: 4px 10px; border-radius: 12px; font-weight: bold;">
                Automated Lead Time & Safety Buffer
            </span>
        </div>
        <div style="max-height: 200px; overflow-y: auto;">
            ${rowsHtml}
        </div>
    `;
}