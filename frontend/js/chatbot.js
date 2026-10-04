// chatbot.js - Phase 5 AI Floating Assistant
(function() {
    const style = document.createElement('style');
    style.innerHTML = `
        #pharma-ai-btn {
            position: fixed; bottom: 25px; right: 25px; width: 60px; height: 60px;
            background: linear-gradient(135deg, #6f42c1 0%, #4864e4 100%);
            border-radius: 50%; color: white; display: flex; align-items: center;
            justify-content: center; font-size: 26px; cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3); z-index: 999999;
            transition: transform 0.3s ease;
        }
        #pharma-ai-btn:hover { transform: scale(1.08); }
        #pharma-ai-box {
            position: fixed; bottom: 95px; right: 25px; width: 350px; height: 460px;
            background: #ffffff; border-radius: 15px; box-shadow: 0 8px 30px rgba(0,0,0,0.2);
            display: none; flex-direction: column; overflow: hidden; z-index: 999999;
            border: 1px solid #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #pharma-ai-header {
            background: linear-gradient(135deg, #6f42c1 0%, #4864e4 100%);
            color: white; padding: 14px 16px; display: flex; justify-content: space-between;
            align-items: center; font-weight: bold; font-size: 15px;
        }
        #pharma-ai-messages {
            flex: 1; padding: 12px; overflow-y: auto; background: #f8f9fa;
            display: flex; flex-direction: column; gap: 8px; font-size: 13px;
        }
        .ai-bubble {
            max-width: 82%; padding: 10px 12px; border-radius: 12px; line-height: 1.4;
            word-wrap: break-word; white-space: pre-line;
        }
        .ai-bot-bubble { background: #ffffff; border: 1px solid #e5e5e5; color: #2c3e50; align-self: flex-start; }
        .ai-user-bubble { background: #6f42c1; color: white; align-self: flex-end; }
        #pharma-ai-input-wrap {
            display: flex; border-top: 1px solid #eee; background: white; padding: 8px;
        }
        #pharma-ai-input {
            flex: 1; border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px;
            font-size: 13px; outline: none;
        }
        #pharma-ai-send {
            background: #6f42c1; border: none; color: white; padding: 0 16px;
            margin-left: 6px; border-radius: 8px; cursor: pointer; font-size: 14px;
        }
    `;
    document.head.appendChild(style);

    const widget = document.createElement('div');
    widget.innerHTML = `
        <div id="pharma-ai-btn" title="Ask AI Pharmacy Assistant">
            <i class="fas fa-robot"></i>
        </div>
        <div id="pharma-ai-box">
            <div id="pharma-ai-header">
                <span>🤖 AI Pharmacy Copilot</span>
                <span id="pharma-ai-close" style="cursor:pointer; font-size:16px;">✖</span>
            </div>
            <div id="pharma-ai-messages">
                <div class="ai-bubble ai-bot-bubble">
                    Namaste! Main aapka AI Pharmacy Assistant hoon. Dawai ka naam, stock ya lakshan (fever, pain, acidity) pooch sakte hain.
                </div>
            </div>
            <div id="pharma-ai-input-wrap">
                <input type="text" id="pharma-ai-input" placeholder="Type medicine or symptom..." />
                <button id="pharma-ai-send"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;
    document.body.appendChild(widget);

    const btn = document.getElementById('pharma-ai-btn');
    const box = document.getElementById('pharma-ai-box');
    const close = document.getElementById('pharma-ai-close');
    const send = document.getElementById('pharma-ai-send');
    const input = document.getElementById('pharma-ai-input');
    const msgs = document.getElementById('pharma-ai-messages');

    btn.onclick = () => {
        box.style.display = box.style.display === 'flex' ? 'none' : 'flex';
        if (box.style.display === 'flex') input.focus();
    };

    close.onclick = () => box.style.display = 'none';

    async function sendQuery() {
        const text = input.value.trim();
        if (!text) return;

        // Render User Message
        const userMsg = document.createElement('div');
        userMsg.className = 'ai-bubble ai-user-bubble';
        userMsg.textContent = text;
        msgs.appendChild(userMsg);
        input.value = '';
        msgs.scrollTop = msgs.scrollHeight;

        // Loading indicator
        const botMsg = document.createElement('div');
        botMsg.className = 'ai-bubble ai-bot-bubble';
        botMsg.textContent = 'Analyzing inventory with NLP...';
        msgs.appendChild(botMsg);
        msgs.scrollTop = msgs.scrollHeight;

        try {
            const res = await fetch('http://localhost:5000/api/ai/nlp-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            botMsg.innerHTML = (data.reply || 'No response').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        } catch (e) {
            botMsg.textContent = '⚠️ Failed to connect to AI server.';
        }
        msgs.scrollTop = msgs.scrollHeight;
    }

    send.onclick = sendQuery;
    input.onkeypress = (e) => { if (e.key === 'Enter') sendQuery(); };
})();