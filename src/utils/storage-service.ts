import {
  ClosedTabGroup,
  GroupLabel,
  GroupLabelAssignment,
  ArchivedTabGroup,
  AutoAddConfig,
  ExtensionSettings,
  GroupOrderConfig,
  SharedTab,
} from '../types/tab-group';
import { generateUUID } from './uuid';

// Storage keys
const KEYS = {
  HISTORY: 'tgs_history',
  PRIVATE: 'tgs_private',
  FAVORITES: 'tgs_favorites',
  ORDER: 'tgs_order',
  LABELS: 'tgs_labels',
  LABEL_ASSIGNMENTS: 'tgs_label_assignments',
  ARCHIVE: 'tgs_archive',
  AUTO_ADD: 'tgs_autoAdd',
  SETTINGS: 'tgs_settings',
} as const;

// Default settings
const DEFAULT_SETTINGS: ExtensionSettings = {
  historyRetentionDays: 7,
  maxHistoryItems: 50,
};

// === Generic Storage Helpers ===

async function getItem<T>(key: string, defaultValue: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? defaultValue;
}

async function setItem<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

// === History Operations ===

export async function getHistory(): Promise<ClosedTabGroup[]> {
  return getItem<ClosedTabGroup[]>(KEYS.HISTORY, []);
}

export async function addToHistory(
  title: string,
  color: chrome.tabGroups.ColorEnum,
  tabs: SharedTab[]
): Promise<void> {
  const history = await getHistory();
  const settings = await getSettings();

  const entry: ClosedTabGroup = {
    id: generateUUID(),
    title,
    color,
    tabs,
    closedAt: Date.now(),
  };

  // Add to beginning
  history.unshift(entry);

  // Limit size
  if (history.length > settings.maxHistoryItems) {
    history.splice(settings.maxHistoryItems);
  }

  await setItem(KEYS.HISTORY, history);
}

export async function removeFromHistory(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((h) => h.id !== id);
  await setItem(KEYS.HISTORY, filtered);
}

export async function clearHistory(): Promise<void> {
  await setItem(KEYS.HISTORY, []);
}

export async function cleanupExpiredHistory(): Promise<void> {
  const history = await getHistory();
  const settings = await getSettings();
  const cutoff = Date.now() - settings.historyRetentionDays * 24 * 60 * 60 * 1000;

  const filtered = history.filter((h) => h.closedAt > cutoff);

  if (filtered.length !== history.length) {
    await setItem(KEYS.HISTORY, filtered);
  }
}

// === Private Groups Operations ===

export async function getPrivateGroupIds(): Promise<number[]> {
  return getItem<number[]>(KEYS.PRIVATE, []);
}

export async function setGroupPrivate(groupId: number, isPrivate: boolean): Promise<void> {
  const privateIds = await getPrivateGroupIds();

  if (isPrivate && !privateIds.includes(groupId)) {
    privateIds.push(groupId);
  } else if (!isPrivate) {
    const index = privateIds.indexOf(groupId);
    if (index !== -1) {
      privateIds.splice(index, 1);
    }
  }

  await setItem(KEYS.PRIVATE, privateIds);
}

export async function isGroupPrivate(groupId: number): Promise<boolean> {
  const privateIds = await getPrivateGroupIds();
  return privateIds.includes(groupId);
}

// === Favorites Operations ===

export async function getFavoriteGroupIds(): Promise<number[]> {
  return getItem<number[]>(KEYS.FAVORITES, []);
}

export async function toggleFavorite(groupId: number): Promise<boolean> {
  const favorites = await getFavoriteGroupIds();
  const index = favorites.indexOf(groupId);

  if (index === -1) {
    favorites.push(groupId);
    await setItem(KEYS.FAVORITES, favorites);
    return true;
  } else {
    favorites.splice(index, 1);
    await setItem(KEYS.FAVORITES, favorites);
    return false;
  }
}

export async function isGroupFavorite(groupId: number): Promise<boolean> {
  const favorites = await getFavoriteGroupIds();
  return favorites.includes(groupId);
}

// === Custom Order Operations ===

export async function getGroupOrder(windowId: number): Promise<number[]> {
  const orders = await getItem<GroupOrderConfig[]>(KEYS.ORDER, []);
  const config = orders.find((o) => o.windowId === windowId);
  return config?.order ?? [];
}

export async function setGroupOrder(windowId: number, order: number[]): Promise<void> {
  const orders = await getItem<GroupOrderConfig[]>(KEYS.ORDER, []);
  const index = orders.findIndex((o) => o.windowId === windowId);

  if (index === -1) {
    orders.push({ windowId, order });
  } else {
    orders[index].order = order;
  }

  await setItem(KEYS.ORDER, orders);
}

// === Labels Operations ===

export async function getLabels(): Promise<GroupLabel[]> {
  return getItem<GroupLabel[]>(KEYS.LABELS, []);
}

export async function createLabel(name: string, color: string): Promise<GroupLabel> {
  const labels = await getLabels();
  const label: GroupLabel = {
    id: generateUUID(),
    name,
    color,
  };
  labels.push(label);
  await setItem(KEYS.LABELS, labels);
  return label;
}

export async function deleteLabel(labelId: string): Promise<void> {
  const labels = await getLabels();
  const filtered = labels.filter((l) => l.id !== labelId);
  await setItem(KEYS.LABELS, filtered);

  // Also remove assignments
  const assignments = await getLabelAssignments();
  const updatedAssignments = assignments.map((a) => ({
    ...a,
    labelIds: a.labelIds.filter((id) => id !== labelId),
  }));
  await setItem(KEYS.LABEL_ASSIGNMENTS, updatedAssignments);
}

export async function getLabelAssignments(): Promise<GroupLabelAssignment[]> {
  return getItem<GroupLabelAssignment[]>(KEYS.LABEL_ASSIGNMENTS, []);
}

export async function assignLabel(groupId: number, labelId: string): Promise<void> {
  const assignments = await getLabelAssignments();
  const index = assignments.findIndex((a) => a.groupId === groupId);

  if (index === -1) {
    assignments.push({ groupId, labelIds: [labelId] });
  } else if (!assignments[index].labelIds.includes(labelId)) {
    assignments[index].labelIds.push(labelId);
  }

  await setItem(KEYS.LABEL_ASSIGNMENTS, assignments);
}

export async function unassignLabel(groupId: number, labelId: string): Promise<void> {
  const assignments = await getLabelAssignments();
  const index = assignments.findIndex((a) => a.groupId === groupId);

  if (index !== -1) {
    assignments[index].labelIds = assignments[index].labelIds.filter((id) => id !== labelId);
    await setItem(KEYS.LABEL_ASSIGNMENTS, assignments);
  }
}

export async function getGroupLabels(groupId: number): Promise<GroupLabel[]> {
  const labels = await getLabels();
  const assignments = await getLabelAssignments();
  const assignment = assignments.find((a) => a.groupId === groupId);

  if (!assignment) return [];

  return labels.filter((l) => assignment.labelIds.includes(l.id));
}

// === Archive Operations ===

export async function getArchive(): Promise<ArchivedTabGroup[]> {
  return getItem<ArchivedTabGroup[]>(KEYS.ARCHIVE, []);
}

export async function archiveGroup(
  title: string,
  color: chrome.tabGroups.ColorEnum,
  tabs: SharedTab[]
): Promise<void> {
  const archive = await getArchive();
  const entry: ArchivedTabGroup = {
    id: generateUUID(),
    title,
    color,
    tabs,
    archivedAt: Date.now(),
  };
  archive.unshift(entry);
  await setItem(KEYS.ARCHIVE, archive);
}

export async function removeFromArchive(id: string): Promise<ArchivedTabGroup | null> {
  const archive = await getArchive();
  const index = archive.findIndex((a) => a.id === id);

  if (index === -1) return null;

  const [removed] = archive.splice(index, 1);
  await setItem(KEYS.ARCHIVE, archive);
  return removed;
}

export async function deleteFromArchive(id: string): Promise<void> {
  const archive = await getArchive();
  const filtered = archive.filter((a) => a.id !== id);
  await setItem(KEYS.ARCHIVE, filtered);
}

// === Auto-Add Operations ===

const DEFAULT_AUTO_ADD: AutoAddConfig = {
  enabled: false,
  targetGroupId: null,
  targetGroupTitle: '',
  targetGroupColor: 'grey',
  includeNewTabs: true,
  includeMovedTabs: false,
};

export async function getAutoAddConfig(): Promise<AutoAddConfig> {
  return getItem<AutoAddConfig>(KEYS.AUTO_ADD, DEFAULT_AUTO_ADD);
}

export async function setAutoAddConfig(config: Partial<AutoAddConfig>): Promise<void> {
  const current = await getAutoAddConfig();
  await setItem(KEYS.AUTO_ADD, { ...current, ...config });
}

// === Settings Operations ===

export async function getSettings(): Promise<ExtensionSettings> {
  return getItem<ExtensionSettings>(KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export async function updateSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings();
  await setItem(KEYS.SETTINGS, { ...current, ...settings });
}
