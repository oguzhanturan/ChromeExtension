import { encode } from '../utils/codec';
import { buildSharePayload } from '../utils/tab-group-service';
import { addToHistory, isGroupPrivate, getAutoAddConfig, setAutoAddConfig } from '../utils/storage-service';

const CONTEXT_MENU_ID = 'share-tab-group';

// === Tab Group Cache for History ===
// We cache tab group data so we can save it when the group is closed
interface CachedGroup {
  title: string;
  color: chrome.tabGroups.ColorEnum;
  tabs: { url: string; title: string }[];
}

const groupCache = new Map<number, CachedGroup>();

// Update cache when tabs change
async function updateGroupCache(groupId: number): Promise<void> {
  if (groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) return;

  try {
    const group = await chrome.tabGroups.get(groupId);
    const tabs = await chrome.tabs.query({ groupId });

    groupCache.set(groupId, {
      title: group.title || '(Untitled)',
      color: group.color,
      tabs: tabs
        .filter((t) => t.url && (t.url.startsWith('http://') || t.url.startsWith('https://')))
        .map((t) => ({ url: t.url!, title: t.title || '' })),
    });
  } catch {
    // Group may have been deleted
  }
}

// Listen for tab group removal to save to history
chrome.tabGroups.onRemoved.addListener(async (tabGroup) => {
  const cached = groupCache.get(tabGroup.id);
  if (cached && cached.tabs.length > 0) {
    await addToHistory(cached.title, cached.color, cached.tabs);
  }
  groupCache.delete(tabGroup.id);
});

// Listen for tab group updates (title, color changes)
chrome.tabGroups.onUpdated.addListener(async (tabGroup) => {
  await updateGroupCache(tabGroup.id);
});

// Listen for tab creation/update to keep cache fresh
chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
    updateGroupCache(tab.groupId);
  }

  // Auto-add new tabs to target group
  const config = await getAutoAddConfig();
  if (config.enabled && config.includeNewTabs && config.targetGroupId && tab.id) {
    // Don't add if tab is already in a group
    if (!tab.groupId || tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
      try {
        // Verify target group still exists
        await chrome.tabGroups.get(config.targetGroupId);
        await chrome.tabs.group({ tabIds: [tab.id], groupId: config.targetGroupId });
      } catch {
        // Target group no longer exists, disable auto-add
        await setAutoAddConfig({ enabled: false, targetGroupId: null });
      }
    }
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
    // Only update on URL or title changes
    if (changeInfo.url || changeInfo.title) {
      updateGroupCache(tab.groupId);
    }
  }
  // Track when tab moves to a different group
  if (changeInfo.groupId !== undefined) {
    if (changeInfo.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      updateGroupCache(changeInfo.groupId);
    }

    // Auto-add tabs that are ungrouped back to target group
    if (changeInfo.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
      const config = await getAutoAddConfig();
      if (config.enabled && config.includeMovedTabs && config.targetGroupId) {
        try {
          await chrome.tabGroups.get(config.targetGroupId);
          await chrome.tabs.group({ tabIds: [tabId], groupId: config.targetGroupId });
        } catch {
          // Target group no longer exists
          await setAutoAddConfig({ enabled: false, targetGroupId: null });
        }
      }
    }
  }
});

chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  // Refresh all groups in cache when a tab is removed
  for (const groupId of groupCache.keys()) {
    await updateGroupCache(groupId);
  }
});

// Initialize cache on startup
chrome.runtime.onStartup.addListener(async () => {
  const groups = await chrome.tabGroups.query({});
  for (const group of groups) {
    await updateGroupCache(group.id);
  }
});

// --- Context Menu Setup ---

chrome.runtime.onInstalled.addListener(async () => {
  // Create context menu
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: 'Share this tab group',
    contexts: ['page'],
  });

  // Initialize group cache
  const groups = await chrome.tabGroups.query({});
  for (const group of groups) {
    await updateGroupCache(group.id);
  }
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

  // Check if group is private
  if (await isGroupPrivate(groupId)) {
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
