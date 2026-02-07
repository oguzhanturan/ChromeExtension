export interface SharedTab {
  url: string;
  title: string;
}

export interface SharePayload {
  version: 1 | 2;
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
