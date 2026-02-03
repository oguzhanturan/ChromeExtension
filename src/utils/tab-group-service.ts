import { DisplayTabGroup, SharePayload } from '../types/tab-group';

export interface ImportResult {
  groupId: number;
  created: number;
  failed: number;
}

export async function getAllTabGroups(): Promise<DisplayTabGroup[]> {
  const groups = await chrome.tabGroups.query({
    windowId: chrome.windows.WINDOW_ID_CURRENT,
  });

  const allTabs = await chrome.tabs.query({
    currentWindow: true,
  });

  const tabsByGroup = new Map<number, chrome.tabs.Tab[]>();
  for (const tab of allTabs) {
    if (tab.groupId !== undefined && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      const list = tabsByGroup.get(tab.groupId) || [];
      list.push(tab);
      tabsByGroup.set(tab.groupId, list);
    }
  }

  return groups.map((group) => {
    const groupTabs = tabsByGroup.get(group.id) || [];
    return {
      id: group.id,
      title: group.title || '(Untitled)',
      color: group.color,
      tabCount: groupTabs.length,
      tabs: groupTabs.map((t) => ({
        url: t.url || '',
        title: t.title || '',
      })),
    };
  });
}

export function buildSharePayload(group: DisplayTabGroup): SharePayload {
  const shareableTabs = group.tabs.filter(
    (tab) => tab.url.startsWith('http://') || tab.url.startsWith('https://')
  );

  return {
    version: 1,
    name: group.title,
    color: group.color,
    tabs: shareableTabs,
  };
}

export async function importTabGroup(payload: SharePayload): Promise<ImportResult> {
  if (payload.tabs.length === 0) {
    throw new Error('Cannot import an empty tab group.');
  }

  const results = await Promise.allSettled(
    payload.tabs.map((tab) =>
      chrome.tabs.create({ url: tab.url, active: false })
    )
  );

  const tabIds: number[] = [];
  let failed = 0;

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.id !== undefined) {
      tabIds.push(result.value.id);
    } else {
      failed++;
    }
  }

  if (tabIds.length === 0) {
    throw new Error('Failed to create any tabs.');
  }

  const groupId = await chrome.tabs.group({ tabIds });

  await chrome.tabGroups.update(groupId, {
    title: payload.name,
    color: payload.color,
    collapsed: false,
  });

  return { groupId, created: tabIds.length, failed };
}
