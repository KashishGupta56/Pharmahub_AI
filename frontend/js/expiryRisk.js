// expiryRisk.js - Phase 3 AI Expiry Financial Risk Handler
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        setTimeout(loadExpiryRiskAnalysis, 400);
    }
});

async function loadExpiryRiskAnalysis() {
    try {
        const response = await fetch('http://localhost:5000/api/ai/expiry-risk');
        if (!response.ok) return;

        const result = await response.json();
        if (!result.success || !result.data) return;

        renderExpiryRiskCard(result.data);
    } catch (err) {
        console.warn("Expiry risk engine offline:", err);
    }
}

function renderExpiryRiskCard(riskItems) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    let card = document.getElementById('aiExpiryRiskCard');
    if (!card) {
        card = document.createElement('div');
        card.id = 'aiExpiryRiskCard';
        card.style.cssText = 'background: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border-left: 5px solid #e74c3c;';

        const reorderCard = document.getElementById('aiReorderCard') || document.getElementById('smartInventoryPanel');
        if (reorderCard && reorderCard.nextSibling) {
            mainContent.insertBefore(card, reorderCard.nextSibling);
        } else {
            const firstRow = mainContent.querySelector('.row');
            if (firstRow) mainContent.insertBefore(card, firstRow);
            else mainContent.appendChild(card);
        }
    }

    if (riskItems.length === 0) {
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0; font-size: 16px; color: #2c3e50;">
                    <i class="fas fa-shield-alt" style="color: #27ae60; margin-right: 8px;"></i> AI Expiry Financial Risk Analysis
                </h3>
                <span style="font-size: 12px; color: #27ae60; font-weight: bold;">
                    <i class="fas fa-check-circle"></i> Zero Expiry Financial Risk
                </span>
            </div>
            <p style="margin: 8px 0 0; font-size: 13px; color: #7f8c8d;">
                All near-expiry inventory is safely on track to be sold out before expiration.
            </p>
        `;
        return;
    }

    const totalLoss = riskItems.reduce((acc, i) => acc + i.potentialFinancialLoss, 0);

    let rowsHtml = '';
    riskItems.slice(0, 4).forEach(item => {
        let badgeColor = '#27ae60';
        if (item.status === 'EXPIRED') badgeColor = '#721c24';
        else if (item.status === 'CRITICAL_LOSS_RISK') badgeColor = '#dc3545';
        else if (item.status === 'MODERATE_RISK') badgeColor = '#ffc107';

        rowsHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 1px solid #f2f4f4; font-size: 13px;">
                <div>
                    <strong>${item.name}</strong> 
                    <span style="font-size: 10px; background: ${badgeColor}; color: ${badgeColor === '#ffc107' ? '#333' : '#fff'}; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: bold;">
                        ${item.status.replace(/_/g, ' ')} (${item.riskScore}%)
                    </span>
                    <div style="font-size: 11px; color: #888; margin-top: 2px;">
                        Expires in: <strong>${item.daysToExpiry <= 0 ? 'Already Expired' : item.daysToExpiry + ' days'}</strong> | Current Stock: ${item.currentStock}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="color: #c0392b; font-weight: bold;">Potential Loss: ₹${item.potentialFinancialLoss}</div>
                    <small style="color: #555;">${item.unitsAtRisk} units surplus risk</small>
                </div>
            </div>
        `;
    });

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <h3 style="margin:0; font-size: 16px; color: #2c3e50;">
                <i class="fas fa-exclamation-circle" style="color: #e74c3c; margin-right: 8px;"></i> AI Expiry Financial Risk Analysis (${riskItems.length} Medicines at Risk)
            </h3>
            <span style="font-size: 12px; background: #fdeed9; color: #c0392b; padding: 4px 10px; border-radius: 12px; font-weight: bold;">
                Total Potential Loss: ₹${totalLoss.toFixed(2)}
            </span>
        </div>
        <div style="max-height: 220px; overflow-y: auto;">
            ${rowsHtml}
        </div>
    `;
}