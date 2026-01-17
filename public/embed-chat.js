(function() {
  // Nashoba Valley Support Chat Widget
  // Embed on your website with:
  // <script src="https://YOUR_REPLIT_URL/embed-chat.js"></script>

  const WIDGET_URL = window.location.origin + '/support/widget';
  
  // Create styles
  const style = document.createElement('style');
  style.textContent = `
    #nashoba-chat-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }
    
    #nashoba-chat-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    #nashoba-chat-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
    }
    
    #nashoba-chat-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    
    #nashoba-chat-iframe-container {
      position: absolute;
      bottom: 70px;
      right: 0;
      width: 380px;
      height: 550px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      display: none;
      opacity: 0;
      transform: translateY(10px) scale(0.95);
      transition: opacity 0.3s, transform 0.3s;
    }
    
    #nashoba-chat-iframe-container.open {
      display: block;
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    
    #nashoba-chat-iframe-header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    #nashoba-chat-iframe-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    #nashoba-chat-close {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: background 0.2s;
    }
    
    #nashoba-chat-close:hover {
      background: rgba(255,255,255,0.3);
    }
    
    #nashoba-chat-iframe {
      width: 100%;
      height: calc(100% - 48px);
      border: none;
    }
    
    @media (max-width: 480px) {
      #nashoba-chat-iframe-container {
        width: calc(100vw - 40px);
        height: calc(100vh - 100px);
        bottom: 70px;
        right: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // Create container
  const container = document.createElement('div');
  container.id = 'nashoba-chat-widget-container';
  
  container.innerHTML = `
    <div id="nashoba-chat-iframe-container">
      <div id="nashoba-chat-iframe-header">
        <h3>Chat with Nashoba Valley</h3>
        <button id="nashoba-chat-close">&times;</button>
      </div>
      <iframe id="nashoba-chat-iframe" src="${WIDGET_URL}"></iframe>
    </div>
    <button id="nashoba-chat-button" aria-label="Open chat">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
      </svg>
    </button>
  `;
  
  document.body.appendChild(container);

  // Add click handlers
  const chatButton = document.getElementById('nashoba-chat-button');
  const chatContainer = document.getElementById('nashoba-chat-iframe-container');
  const closeButton = document.getElementById('nashoba-chat-close');

  chatButton.addEventListener('click', function() {
    chatContainer.classList.toggle('open');
  });

  closeButton.addEventListener('click', function() {
    chatContainer.classList.remove('open');
  });

  // Close on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      chatContainer.classList.remove('open');
    }
  });

  // Proactive Engagement - Auto-open after 60 seconds if not already opened
  let hasProactivelyOpened = false;
  let hasUserInteracted = false;
  
  // Track if user has already interacted
  chatButton.addEventListener('click', function() {
    hasUserInteracted = true;
  });
  
  setTimeout(function() {
    // Only proactively open if:
    // 1. User hasn't already interacted with the widget
    // 2. Widget isn't already open
    // 3. We haven't already proactively opened
    if (!hasUserInteracted && !chatContainer.classList.contains('open') && !hasProactivelyOpened) {
      hasProactivelyOpened = true;
      chatContainer.classList.add('open');
      
      // Send a message to the iframe to show a welcome prompt
      const iframe = document.getElementById('nashoba-chat-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'proactive-greeting' }, '*');
      }
    }
  }, 60000); // 60 seconds
})();
