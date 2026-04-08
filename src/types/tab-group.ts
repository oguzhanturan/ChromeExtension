export interface SharedTab {
  url: string;
  title: string;
}

export interface SharePayload {
  version: 1 | 2 | 3;
  name: string;
  color: chrome.tabGroups.ColorEnum;
  tabs: SharedTab[];
}

export interface DisplayTabGroup {
  id: number;
  title: string;
  color: chrome.tabGroups.ColorEnum;
  tabCount: number;
  tabs: SharedTab[];
}

// Color enum to index mapping for compact encoding
export const COLOR_LIST: chrome.tabGroups.ColorEnum[] = [
  'grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange',
];

export const TAB_GROUP_COLOR_MAP: Record<chrome.tabGroups.ColorEnum, string> = {
  grey: '#5F6368',
  blue: '#1A73E8',
  red: '#D93025',
  yellow: '#F9AB00',
  green: '#188038',
  pink: '#D01884',
  purple: '#A142F4',
  cyan: '#007B83',
  orange: '#FA903E',
};

// === History Feature ===
export interface ClosedTabGroup {
  id: string;                          // UUID
  title: string;
  color: chrome.tabGroups.ColorEnum;
  tabs: SharedTab[];
  closedAt: number;                    // Unix timestamp
}

// === Labels/Categories Feature ===
export interface GroupLabel {
  id: string;
  name: string;
  color: string;                       // Hex color
}

export interface GroupLabelAssignment {
  groupId: number;
  labelIds: string[];
}

// === Archive Feature ===
export interface ArchivedTabGroup {
  id: string;                          // UUID
  title: string;
  color: chrome.tabGroups.ColorEnum;
  tabs: SharedTab[];
  archivedAt: number;                  // Unix timestamp
}

// === Auto-Add Feature ===
export interface AutoAddConfig {
  enabled: boolean;
  targetGroupId: number | null;
  targetGroupTitle: string;
  targetGroupColor: chrome.tabGroups.ColorEnum;
  includeNewTabs: boolean;
  includeMovedTabs: boolean;
}

// === Settings ===
export interface ExtensionSettings {
  historyRetentionDays: number;        // Default: 7
  maxHistoryItems: number;             // Default: 50
}

// === Custom Order ===
export interface GroupOrderConfig {
  windowId: number;
  order: number[];                     // Array of Chrome group IDs
}

// === Enhanced Display (with metadata) ===
export interface EnhancedDisplayTabGroup extends DisplayTabGroup {
  isPrivate: boolean;
  isFavorite: boolean;
  labels: GroupLabel[];
}
