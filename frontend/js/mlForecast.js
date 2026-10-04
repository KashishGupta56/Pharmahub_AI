// mlForecast.js - Phase 4 Scikit-Learn Demand Forecast UI
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) {
        setTimeout(loadMLForecast, 600);
    }
});

async function loadMLForecast() {
    try {
        const response = await fetch('http://localhost:5000/api/ai/ml-forecast');
        if (!response.ok) return;

        const result = await response.json();
        if (!result.analytics) return;

        renderMLForecastCard(result.analytics);
    } catch (err) {
        console.warn("ML Forecast unavailable:", err);
    }
}

function renderMLForecastCard(items) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    let card = document.getElementById('aiMLForecastCard');
    if (!card) {
        card = document.createElement('div');
        card.id = 'aiMLForecastCard';
        card.style.cssText = 'background: white; border-radius: 12px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border-left: 5px solid #6f42c1;';

        const expiryCard = document.getElementById('aiExpiryRiskCard') || document.getElementById('aiReorderCard');
        if (expiryCard && expiryCard.nextSibling) {
            mainContent.insertBefore(card, expiryCard.nextSibling);
        } else {
            const firstRow = mainContent.querySelector('.row');
            if (firstRow) mainContent.insertBefore(card, firstRow);
            else mainContent.appendChild(card);
        }
    }

    const totalProjectedRev = items.reduce((acc, i) => acc + i.projected_revenue, 0);

    let rowsHtml = '';
    items.forEach(item => {
        rowsHtml += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 1px solid #f2f4f4; font-size: 13px;">
                <div>
                    <strong>${item.name}</strong> 
                    <span style="font-size: 11px; color: #6f42c1; font-weight: bold; margin-left: 6px;">${item.trend}</span>
                    <div style="font-size: 11px; color: #888; margin-top: 2px;">
                        Velocity: ${item.daily_velocity} units/day | In Stock: ${item.current_stock}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="color: #2c3e50; font-weight: bold;">Est. Demand: ${item.predicted_30d_demand} Units</div>
                    <small style="color: #28a745; font-weight: bold;">Proj. Rev: ₹${item.projected_revenue}</small>
                </div>
            </div>
        `;
    });

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <h3 style="margin:0; font-size: 16px; color: #2c3e50;">
                <i class="fas fa-brain" style="color: #6f42c1; margin-right: 8px;"></i> Pure ML Demand Forecast (Scikit-Learn Regression)
            </h3>
            <span style="font-size: 12px; background: #f3ebff; color: #6f42c1; padding: 4px 10px; border-radius: 12px; font-weight: bold;">
                Total 30-Day Proj. Revenue: ₹${totalProjectedRev.toFixed(2)}
            </span>
        </div>
        <div style="max-height: 220px; overflow-y: auto;">
            ${rowsHtml}
        </div>
    `;
}