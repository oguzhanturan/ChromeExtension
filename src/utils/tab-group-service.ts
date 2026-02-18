import { DisplayTabGroup, SharePayload } from '../types/tab-group';

export interface ImportResult {
  groupId: number;
  created: number;
  failed: number;
}

// Known tracking/analytics params that are safe to remove
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id',
  'gclid', 'gclsrc', 'gad_source', 'gad_campaignid', 'gbraid', 'wbraid', 'dclid',
  'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_ref',
  'msclkid',
  'mc_cid', 'mc_eid',
  '_ga', '_gl', '_gac',
  'twclid', 'igshid',
  'is_sa', 'android-min-version', 'ios-min-version', 'campaign_id',
]);

function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key)) {
        u.searchParams.delete(key);
      }
    }
    return u.toString();
  } catch {
    return url;
  }
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
  const shareableTabs = group.tabs
    .filter((tab) => tab.url.startsWith('http://') || tab.url.startsWith('https://'))
    .map((tab) => ({ ...tab, url: cleanUrl(tab.url) }));

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
