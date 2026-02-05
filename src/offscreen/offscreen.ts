chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'copy-to-clipboard' && typeof message.text === 'string') {
    copyText(message.text).then(
      () => sendResponse({ success: true }),
      () => sendResponse({ success: false })
    );
    return true; // keep channel open for async sendResponse
  }
});

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback: use execCommand
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!ok) throw new Error('execCommand failed');
  }
}
