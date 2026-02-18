import { encode } from '../utils/codec';
import { buildSharePayload } from '../utils/tab-group-service';
const CONTEXT_MENU_ID = 'share-tab-group';

// --- Context Menu Setup ---

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Share this tab group',
    contexts: ['page'],
  });
});

// --- Context Menu Click Handler ---

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !tab) return;
  await shareTabGroup(tab);
});

// --- Keyboard Shortcut Handler ---
// Windows/Linux: Ctrl+Shift+S
// macOS: Command+Shift+E

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'share-current-group') return;

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (activeTab) {
    await shareTabGroup(activeTab);
  }
});

// --- Core Share Logic ---

async function shareTabGroup(tab: chrome.tabs.Tab): Promise<void> {
  const groupId = tab.groupId;

  if (!groupId || groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
    showBadge('!', '#D93025');
    return;
  }

  try {
    const group = await chrome.tabGroups.get(groupId);

    const groupTabs = await chrome.tabs.query({
      groupId,
      currentWindow: true,
    });

    const displayGroup = {
      id: groupId,
      title: group.title || '(Untitled)',
      color: group.color,
      tabCount: groupTabs.length,
      tabs: groupTabs
        .filter((t) => t.url)
        .map((t) => ({ url: t.url!, title: t.title || '' })),
    };

    const payload = buildSharePayload(displayGroup);

    if (payload.tabs.length === 0) {
      showBadge('!', '#D93025');
      return;
    }

    const code = await encode(payload);
    const copied = await copyToClipboard(code);
    if (copied) {
      showBadge('OK', '#188038');
    } else {
      showBadge('!', '#D93025');
    }
  } catch {
    showBadge('!', '#D93025');
  }
}

// --- Clipboard via Offscreen Document ---

let creatingOffscreen: Promise<void> | null = null;

async function ensureOffscreenDocument(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });

  if (existingContexts.length > 0) return;

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: 'Copy tab group share code to clipboard',
  });

  await creatingOffscreen;
  creatingOffscreen = null;
}

async function copyToClipboard(text: string): Promise<boolean> {
  await ensureOffscreenDocument();
  // Small delay to ensure offscreen script is loaded
  await new Promise((r) => setTimeout(r, 50));

  try {
    const response = await chrome.runtime.sendMessage({ type: 'copy-to-clipboard', text });
    if (response?.success) return true;
  } catch {
    // Retry once if first attempt fails
    await new Promise((r) => setTimeout(r, 100));
    try {
      const response = await chrome.runtime.sendMessage({ type: 'copy-to-clipboard', text });
      if (response?.success) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

// --- Badge Feedback ---

function showBadge(text: string, color: string): void {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 2000);
}
