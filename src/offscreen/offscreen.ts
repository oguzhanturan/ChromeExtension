chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'copy-to-clipboard' && typeof message.text === 'string') {
    navigator.clipboard.writeText(message.text).then(
      () => sendResponse({ success: true }),
      () => {
        // Fallback: use execCommand for older contexts
        const textarea = document.createElement('textarea');
        textarea.value = message.text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        sendResponse({ success: ok });
      }
    );
    return true; // keep channel open for async sendResponse
  }
});
