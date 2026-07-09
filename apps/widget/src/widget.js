(function () {
  'use strict';

  // Read config from the script tag itself
  const currentScript = document.currentScript;
  const businessId = currentScript.getAttribute('data-business-id');
  const apiKey = currentScript.getAttribute('data-api-key');
  const apiBaseUrl = currentScript.getAttribute('data-api-url') || 'https://api.qulify.com';

  if (!businessId || !apiKey) {
    console.error('[Qulify Widget] Missing data-business-id or data-api-key attribute on script tag.');
    return;
  }

  // Widget state
  let conversationId = null;
  let leadId = null;
  let isOpen = false;

  // Create isolated container using Shadow DOM — prevents the host
  // site's CSS from affecting the widget, and vice versa.
  const container = document.createElement('div');
  container.id = 'qulify-widget-root';
  document.body.appendChild(container);
  const shadow = container.attachShadow({ mode: 'open' });

  // Basic scoped styles — plain CSS, not Tailwind, since Tailwind
  // assumes ownership of the global stylesheet, which we don't have here.
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .qlfy-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #1A2B3C;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: sans-serif;
      font-size: 24px;
      z-index: 999999;
    }
    .qlfy-window {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 320px;
      height: 440px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      display: none;
      flex-direction: column;
      font-family: sans-serif;
      overflow: hidden;
      z-index: 999999;
    }
    .qlfy-window.open { display: flex; }
    .qlfy-header {
      background: #1A2B3C;
      color: white;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 600;
    }
    .qlfy-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .qlfy-msg {
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 13px;
      line-height: 1.4;
    }
    .qlfy-msg.visitor {
      align-self: flex-end;
      background: #1A2B3C;
      color: white;
    }
    .qlfy-msg.assistant {
      align-self: flex-start;
      background: #f0f0f0;
      color: #222;
    }
    .qlfy-input-row {
      display: flex;
      border-top: 1px solid #eee;
      padding: 8px;
      gap: 8px;
    }
    .qlfy-input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 13px;
      outline: none;
    }
    .qlfy-send {
      background: #1A2B3C;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      cursor: pointer;
    }
  `;
  shadow.appendChild(style);

  // Build DOM
  const bubble = document.createElement('div');
  bubble.className = 'qlfy-bubble';
  bubble.textContent = '💬';

  const chatWindow = document.createElement('div');
  chatWindow.className = 'qlfy-window';
  chatWindow.innerHTML = `
    <div class="qlfy-header">Chat with us</div>
    <div class="qlfy-messages"></div>
    <div class="qlfy-input-row">
      <input class="qlfy-input" type="text" placeholder="Type a message..." />
      <button class="qlfy-send">Send</button>
    </div>
  `;

  shadow.appendChild(bubble);
  shadow.appendChild(chatWindow);

  const messagesEl = chatWindow.querySelector('.qlfy-messages');
  const inputEl = chatWindow.querySelector('.qlfy-input');
  const sendBtn = chatWindow.querySelector('.qlfy-send');

  function addMessage(role, content) {
    const msg = document.createElement('div');
    msg.className = `qlfy-msg ${role}`;
    msg.textContent = content;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function startConversation() {
    try {
      const res = await fetch(`${apiBaseUrl}/chat/start`, {
        method: 'POST',
        headers: {
          'x-business-id': businessId,
          'x-api-key': apiKey
        }
      });
      const data = await res.json();
      if (data.success) {
        conversationId = data.conversationId;
        leadId = data.leadId;
      }
    } catch (err) {
      console.error('[Qulify Widget] Failed to start conversation:', err);
    }
  }

  let conversationHistory = [];

  const MAX_HISTORY = 10; // must match MAX_MESSAGES on the backend

  async function sendMessage(message) {
    addMessage('visitor', message);
    inputEl.value = '';
    conversationHistory.push({ role: 'user', content: message });

    try {
      const res = await fetch(`${apiBaseUrl}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': businessId,
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          message,
          history: conversationHistory.slice(0, -1).slice(-MAX_HISTORY), // exclude current message, keep only last 10
          conversationId,
          leadId
        })
      });
      const data = await res.json();
      if (data.success) {
        addMessage('assistant', data.reply);
        conversationHistory.push({ role: 'assistant', content: data.reply });
      } else {
        addMessage('assistant', 'Sorry, something went wrong.');
      }
    } catch (err) {
      console.error('[Qulify Widget] Failed to send message:', err);
      addMessage('assistant', 'Sorry, something went wrong.');
    }
  }

  bubble.addEventListener('click', async () => {
    isOpen = !isOpen;
    chatWindow.classList.toggle('open', isOpen);

    if (isOpen && !conversationId) {
      await startConversation();
      addMessage('assistant', 'Hi! How can I help you today?');
    }
  });

  sendBtn.addEventListener('click', () => {
    const value = inputEl.value.trim();
    if (value) sendMessage(value);
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const value = inputEl.value.trim();
      if (value) sendMessage(value);
    }
  });
})();