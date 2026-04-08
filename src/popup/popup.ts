import './popup.css';
import { DisplayTabGroup, TAB_GROUP_COLOR_MAP, ClosedTabGroup, ArchivedTabGroup } from '../types/tab-group';
import { encode, decode } from '../utils/codec';
import {
  getAllTabGroups,
  buildSharePayload,
  importTabGroup,
} from '../utils/tab-group-service';
import {
  getHistory,
  removeFromHistory,
  clearHistory,
  getArchive,
  archiveGroup,
  removeFromArchive,
  deleteFromArchive,
  getFavoriteGroupIds,
  toggleFavorite,
  getPrivateGroupIds,
  setGroupPrivate,
  cleanupExpiredHistory,
  getGroupOrder,
  setGroupOrder,
  getLabels,
  createLabel,
  getGroupLabels,
  assignLabel,
  unassignLabel,
  getAutoAddConfig,
  setAutoAddConfig,
} from '../utils/storage-service';
import { GroupLabel } from '../types/tab-group';

const LARGE_GROUP_THRESHOLD = 30;

// DOM References
const viewShare = document.getElementById('view-share')!;
const viewImport = document.getElementById('view-import')!;
const viewHistory = document.getElementById('view-history')!;
const viewArchive = document.getElementById('view-archive')!;
const groupsList = document.getElementById('groups-list')!;
const emptyState = document.getElementById('empty-state')!;
const errorState = document.getElementById('error-state')!;
const loadingState = document.getElementById('loading-state')!;
const retryBtn = document.getElementById('retry-btn')!;
const refreshBtn = document.getElementById('refresh-btn')!;
const importInput = document.getElementById('import-input') as HTMLTextAreaElement;
const importBtn = document.getElementById('import-btn')!;
const importPreview = document.getElementById('import-preview')!;
const shareResult = document.getElementById('share-result')!;
const shareResultChip = document.getElementById('share-result-chip')!;
const shareOutput = document.getElementById('share-output') as HTMLTextAreaElement;
const copyBtn = document.getElementById('copy-btn')!;
const copyFeedback = document.getElementById('copy-feedback')!;
const closeBtn = document.getElementById('share-result-close')!;
const toast = document.getElementById('toast')!;
const navBtns = document.querySelectorAll<HTMLButtonElement>('.nav-btn');
const shortcutHint = document.getElementById('shortcut-hint')!;

// History & Archive DOM
const historyList = document.getElementById('history-list')!;
const historyEmpty = document.getElementById('history-empty')!;
const clearHistoryBtn = document.getElementById('clear-history-btn')!;
const archiveList = document.getElementById('archive-list')!;
const archiveEmpty = document.getElementById('archive-empty')!;

// Settings DOM
const viewSettings = document.getElementById('view-settings')!;
const autoAddEnabled = document.getElementById('autoAdd-enabled') as HTMLInputElement;
const autoAddTarget = document.getElementById('autoAdd-target') as HTMLSelectElement;
const autoAddNewTabs = document.getElementById('autoAdd-newTabs') as HTMLInputElement;
const autoAddMovedTabs = document.getElementById('autoAdd-movedTabs') as HTMLInputElement;

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

// SVG Icons
const SHARE_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" fill="currentColor"/>
</svg>`;

const STAR_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
</svg>`;

const STAR_FILLED_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
</svg>`;

const LOCK_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
</svg>`;

const LOCK_FILLED_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6z"/>
</svg>`;

const ARCHIVE_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>
</svg>`;

const RESTORE_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
  <path d="M3 3v5h5"/>
</svg>`;

const DELETE_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
</svg>`;

const DRAG_HANDLE_SVG = `<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
  <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
  <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
  <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
</svg>`;

const LABEL_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
  <line x1="7" y1="7" x2="7.01" y2="7"/>
</svg>`;

// Predefined labels
const PREDEFINED_LABELS = [
  { name: 'Work', color: '#1a73e8' },
  { name: 'Personal', color: '#188038' },
  { name: 'Research', color: '#a142f4' },
  { name: 'Shopping', color: '#fa903e' },
  { name: 'Entertainment', color: '#d01884' },
];

// Detect platform for shortcut hint
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
shortcutHint.textContent = isMac ? '\u2318\u21E7E to share \u00B7 v1.2.0' : 'Ctrl+Shift+S to share \u00B7 v1.2.0';

// View Navigation
navBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.view;
    navBtns.forEach((b) => b.classList.remove('nav-btn--active'));
    btn.classList.add('nav-btn--active');
    viewShare.hidden = target !== 'share';
    viewImport.hidden = target !== 'import';
    viewHistory.hidden = target !== 'history';
    viewArchive.hidden = target !== 'archive';
    viewSettings.hidden = target !== 'settings';
    shareResult.hidden = true;

    // Load data for specific views
    if (target === 'history') loadHistory();
    if (target === 'archive') loadArchive();
    if (target === 'settings') loadSettings();
  });
});

// Refresh
refreshBtn.addEventListener('click', () => loadGroups());
retryBtn.addEventListener('click', () => loadGroups());

// Clear history button
clearHistoryBtn.addEventListener('click', async () => {
  if (confirm('Clear all history?')) {
    await clearHistory();
    loadHistory();
    showToast('History cleared.', 'success');
  }
});

// Drag & Drop state
let draggedCard: HTMLElement | null = null;
let currentWindowId: number = 0;

// Load & Render Tab Groups
async function loadGroups(): Promise<void> {
  loadingState.hidden = false;
  groupsList.innerHTML = '';
  emptyState.hidden = true;
  errorState.hidden = true;

  try {
    // Get current window ID for custom order
    const currentWindow = await chrome.windows.getCurrent();
    currentWindowId = currentWindow.id!;

    const [groups, favoriteIds, privateIds, customOrder] = await Promise.all([
      getAllTabGroups(),
      getFavoriteGroupIds(),
      getPrivateGroupIds(),
      getGroupOrder(currentWindowId),
    ]);

    loadingState.hidden = true;

    if (groups.length === 0) {
      emptyState.hidden = false;
      return;
    }

    // Sort: custom order first, then favorites, then rest
    const sorted = [...groups].sort((a, b) => {
      const aOrder = customOrder.indexOf(a.id);
      const bOrder = customOrder.indexOf(b.id);

      // If both have custom order, use it
      if (aOrder !== -1 && bOrder !== -1) {
        return aOrder - bOrder;
      }
      // Custom ordered items come first
      if (aOrder !== -1) return -1;
      if (bOrder !== -1) return 1;

      // Then sort by favorites
      const aFav = favoriteIds.includes(a.id) ? 0 : 1;
      const bFav = favoriteIds.includes(b.id) ? 0 : 1;
      return aFav - bFav;
    });

    sorted.forEach((group) => {
      const isFavorite = favoriteIds.includes(group.id);
      const isPrivate = privateIds.includes(group.id);
      const card = createGroupCard(group, isFavorite, isPrivate);
      groupsList.appendChild(card);
    });
  } catch {
    loadingState.hidden = true;
    errorState.hidden = false;
  }
}

function createGroupCard(group: DisplayTabGroup, isFavorite: boolean, isPrivate: boolean): HTMLElement {
  const card = document.createElement('div');
  card.className = 'group-card';
  card.draggable = true;
  card.dataset.groupId = String(group.id);

  // Drag handle
  const dragHandle = document.createElement('div');
  dragHandle.className = 'group-card__drag-handle';
  dragHandle.innerHTML = DRAG_HANDLE_SVG;

  // Drag events
  card.addEventListener('dragstart', (e) => {
    draggedCard = card;
    card.classList.add('group-card--dragging');
    e.dataTransfer!.effectAllowed = 'move';
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('group-card--dragging');
    draggedCard = null;
    // Remove all drag-over classes
    document.querySelectorAll('.group-card--drag-over').forEach((el) => {
      el.classList.remove('group-card--drag-over');
    });
  });

  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (draggedCard && draggedCard !== card) {
      card.classList.add('group-card--drag-over');
    }
  });

  card.addEventListener('dragleave', () => {
    card.classList.remove('group-card--drag-over');
  });

  card.addEventListener('drop', async (e) => {
    e.preventDefault();
    card.classList.remove('group-card--drag-over');

    if (draggedCard && draggedCard !== card) {
      // Reorder in DOM
      const parent = card.parentNode!;
      const cards = Array.from(parent.children);
      const draggedIndex = cards.indexOf(draggedCard);
      const dropIndex = cards.indexOf(card);

      if (draggedIndex < dropIndex) {
        parent.insertBefore(draggedCard, card.nextSibling);
      } else {
        parent.insertBefore(draggedCard, card);
      }

      // Save new order
      const newOrder = Array.from(parent.children).map((c) =>
        parseInt((c as HTMLElement).dataset.groupId || '0', 10)
      );
      await setGroupOrder(currentWindowId, newOrder);
    }
  });

  // Favorite button
  const favBtn = document.createElement('button');
  favBtn.className = `group-card__favorite${isFavorite ? ' group-card__favorite--active' : ''}`;
  favBtn.title = isFavorite ? 'Remove from favorites' : 'Add to favorites';
  favBtn.innerHTML = isFavorite ? STAR_FILLED_SVG : STAR_ICON_SVG;
  favBtn.addEventListener('click', async () => {
    const nowFavorite = await toggleFavorite(group.id);
    favBtn.className = `group-card__favorite${nowFavorite ? ' group-card__favorite--active' : ''}`;
    favBtn.innerHTML = nowFavorite ? STAR_FILLED_SVG : STAR_ICON_SVG;
    favBtn.title = nowFavorite ? 'Remove from favorites' : 'Add to favorites';
  });

  // Private button
  const privateBtn = document.createElement('button');
  privateBtn.className = `group-card__private${isPrivate ? ' group-card__private--active' : ''}`;
  privateBtn.title = isPrivate ? 'Make shareable' : 'Make private';
  privateBtn.innerHTML = isPrivate ? LOCK_FILLED_SVG : LOCK_ICON_SVG;
  privateBtn.addEventListener('click', async () => {
    const nowPrivate = !isPrivate;
    await setGroupPrivate(group.id, nowPrivate);
    privateBtn.className = `group-card__private${nowPrivate ? ' group-card__private--active' : ''}`;
    privateBtn.innerHTML = nowPrivate ? LOCK_FILLED_SVG : LOCK_ICON_SVG;
    privateBtn.title = nowPrivate ? 'Make shareable' : 'Make private';
    // Update share button
    shareBtn.className = `group-card__share${nowPrivate ? ' group-card__share--disabled' : ''}`;
    shareBtn.title = nowPrivate ? 'Private group (sharing disabled)' : 'Share group';
    isPrivate = nowPrivate;
  });

  // Info section
  const info = document.createElement('div');
  info.className = 'group-card__info';

  // Chrome-style chip
  const chip = document.createElement('span');
  chip.className = 'group-chip';
  chip.style.backgroundColor = TAB_GROUP_COLOR_MAP[group.color];

  const chipName = document.createElement('span');
  chipName.className = 'group-chip__name';
  chipName.textContent = group.title;

  const chipCount = document.createElement('span');
  chipCount.className = 'group-chip__count';
  chipCount.textContent = `\u00B7 ${group.tabCount}`;

  chip.appendChild(chipName);
  chip.appendChild(chipCount);

  info.appendChild(chip);

  // Tab preview line
  if (group.tabs.length > 0) {
    const preview = document.createElement('div');
    preview.className = 'group-card__preview';
    const titles = group.tabs.slice(0, 3).map((t) => extractDomain(t.url) || t.title);
    const suffix = group.tabs.length > 3 ? ', ...' : '';
    preview.textContent = titles.join(', ') + suffix;
    info.appendChild(preview);
  }

  // Labels container
  const labelsContainer = document.createElement('div');
  labelsContainer.className = 'group-card__labels';
  info.appendChild(labelsContainer);

  // Load and display existing labels
  getGroupLabels(group.id).then((groupLabels) => {
    renderLabels(labelsContainer, group.id, groupLabels);
  });

  // Label button with dropdown
  const labelBtn = document.createElement('button');
  labelBtn.className = 'group-card__label-btn';
  labelBtn.title = 'Add label';
  labelBtn.innerHTML = LABEL_ICON_SVG;
  labelBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    // Close any open dropdowns
    document.querySelectorAll('.label-dropdown').forEach((d) => d.remove());

    const allLabels = await getLabels();
    const groupLabels = await getGroupLabels(group.id);
    const dropdown = createLabelDropdown(allLabels, groupLabels, group.id, labelsContainer);
    card.appendChild(dropdown);

    // Close on outside click
    const closeDropdown = (ev: MouseEvent) => {
      if (!dropdown.contains(ev.target as Node)) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    };
    setTimeout(() => document.addEventListener('click', closeDropdown), 0);
  });

  // Archive button
  const archiveBtn = document.createElement('button');
  archiveBtn.className = 'group-card__archive';
  archiveBtn.title = 'Archive group';
  archiveBtn.innerHTML = ARCHIVE_ICON_SVG;
  archiveBtn.addEventListener('click', async () => {
    await archiveGroup(group.title, group.color, group.tabs);
    showToast(`"${group.title}" archived.`, 'success');
  });

  // Share button (icon-only)
  const shareBtn = document.createElement('button');
  shareBtn.className = `group-card__share${isPrivate ? ' group-card__share--disabled' : ''}`;
  shareBtn.title = isPrivate ? 'Private group (sharing disabled)' : 'Share group';
  shareBtn.innerHTML = SHARE_ICON_SVG;
  shareBtn.addEventListener('click', () => {
    if (!isPrivate) handleShare(group);
  });

  card.appendChild(dragHandle);
  card.appendChild(favBtn);
  card.appendChild(privateBtn);
  card.appendChild(info);
  card.appendChild(labelBtn);
  card.appendChild(archiveBtn);
  card.appendChild(shareBtn);

  return card;
}

function renderLabels(container: HTMLElement, groupId: number, labels: GroupLabel[]): void {
  container.innerHTML = '';
  labels.forEach((label) => {
    const pill = document.createElement('span');
    pill.className = 'label-pill';
    pill.style.backgroundColor = label.color;
    pill.textContent = label.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'label-pill__remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await unassignLabel(groupId, label.id);
      const updated = await getGroupLabels(groupId);
      renderLabels(container, groupId, updated);
    });

    pill.appendChild(removeBtn);
    container.appendChild(pill);
  });
}

function createLabelDropdown(
  allLabels: GroupLabel[],
  assignedLabels: GroupLabel[],
  groupId: number,
  labelsContainer: HTMLElement
): HTMLElement {
  const dropdown = document.createElement('div');
  dropdown.className = 'label-dropdown';

  allLabels.forEach((label) => {
    const item = document.createElement('div');
    item.className = 'label-dropdown__item';

    const colorDot = document.createElement('span');
    colorDot.className = 'label-dropdown__color';
    colorDot.style.backgroundColor = label.color;

    const name = document.createElement('span');
    name.textContent = label.name;

    item.appendChild(colorDot);
    item.appendChild(name);

    const isAssigned = assignedLabels.some((l) => l.id === label.id);
    if (isAssigned) {
      const check = document.createElement('span');
      check.className = 'label-dropdown__check';
      check.innerHTML = '&#10003;';
      item.appendChild(check);
    }

    item.addEventListener('click', async () => {
      if (isAssigned) {
        await unassignLabel(groupId, label.id);
      } else {
        await assignLabel(groupId, label.id);
      }
      const updated = await getGroupLabels(groupId);
      renderLabels(labelsContainer, groupId, updated);
      dropdown.remove();
    });

    dropdown.appendChild(item);
  });

  return dropdown;
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Share Flow
async function handleShare(group: DisplayTabGroup): Promise<void> {
  const payload = buildSharePayload(group);

  if (payload.tabs.length === 0) {
    showToast('No shareable tabs (only http/https URLs can be shared).', 'error');
    return;
  }

  const code = await encode(payload);
  shareOutput.value = code;

  // Render chip in overlay
  shareResultChip.style.backgroundColor = TAB_GROUP_COLOR_MAP[group.color];
  shareResultChip.innerHTML = '';
  const chipName = document.createElement('span');
  chipName.className = 'group-chip__name';
  chipName.textContent = group.title;
  const chipCount = document.createElement('span');
  chipCount.className = 'group-chip__count';
  chipCount.textContent = `\u00B7 ${payload.tabs.length} tabs`;
  shareResultChip.appendChild(chipName);
  shareResultChip.appendChild(chipCount);

  shareResult.hidden = false;
  copyFeedback.hidden = true;
}

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shareOutput.value);
    copyFeedback.hidden = false;
    setTimeout(() => {
      copyFeedback.hidden = true;
    }, 2000);
  } catch {
    showToast('Failed to copy to clipboard.', 'error');
  }
});

closeBtn.addEventListener('click', () => {
  shareResult.hidden = true;
});

// === History View ===
async function loadHistory(): Promise<void> {
  await cleanupExpiredHistory();
  const history = await getHistory();
  historyList.innerHTML = '';

  if (history.length === 0) {
    historyEmpty.hidden = false;
    clearHistoryBtn.hidden = true;
    return;
  }

  historyEmpty.hidden = true;
  clearHistoryBtn.hidden = false;

  history.forEach((item) => {
    const el = createHistoryItem(item);
    historyList.appendChild(el);
  });
}

function createHistoryItem(item: ClosedTabGroup): HTMLElement {
  const el = document.createElement('div');
  el.className = 'history-item';

  const info = document.createElement('div');
  info.className = 'history-item__info';

  const chip = document.createElement('span');
  chip.className = 'group-chip';
  chip.style.backgroundColor = TAB_GROUP_COLOR_MAP[item.color];
  const chipName = document.createElement('span');
  chipName.className = 'group-chip__name';
  chipName.textContent = item.title;
  const chipCount = document.createElement('span');
  chipCount.className = 'group-chip__count';
  chipCount.textContent = `\u00B7 ${item.tabs.length}`;
  chip.appendChild(chipName);
  chip.appendChild(chipCount);

  const time = document.createElement('div');
  time.className = 'history-item__time';
  time.textContent = formatTimeAgo(item.closedAt);

  info.appendChild(chip);
  info.appendChild(time);

  const actions = document.createElement('div');
  actions.className = 'history-item__actions';

  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'icon-btn icon-btn--restore';
  restoreBtn.title = 'Restore';
  restoreBtn.innerHTML = RESTORE_ICON_SVG;
  restoreBtn.addEventListener('click', async () => {
    await restoreGroup(item);
    await removeFromHistory(item.id);
    loadHistory();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'icon-btn icon-btn--delete';
  deleteBtn.title = 'Delete';
  deleteBtn.innerHTML = DELETE_ICON_SVG;
  deleteBtn.addEventListener('click', async () => {
    await removeFromHistory(item.id);
    loadHistory();
  });

  actions.appendChild(restoreBtn);
  actions.appendChild(deleteBtn);

  el.appendChild(info);
  el.appendChild(actions);

  return el;
}

// === Archive View ===
async function loadArchive(): Promise<void> {
  const archive = await getArchive();
  archiveList.innerHTML = '';

  if (archive.length === 0) {
    archiveEmpty.hidden = false;
    return;
  }

  archiveEmpty.hidden = true;

  archive.forEach((item) => {
    const el = createArchiveItem(item);
    archiveList.appendChild(el);
  });
}

function createArchiveItem(item: ArchivedTabGroup): HTMLElement {
  const el = document.createElement('div');
  el.className = 'archive-item';

  const info = document.createElement('div');
  info.className = 'archive-item__info';

  const chip = document.createElement('span');
  chip.className = 'group-chip';
  chip.style.backgroundColor = TAB_GROUP_COLOR_MAP[item.color];
  const chipName = document.createElement('span');
  chipName.className = 'group-chip__name';
  chipName.textContent = item.title;
  const chipCount = document.createElement('span');
  chipCount.className = 'group-chip__count';
  chipCount.textContent = `\u00B7 ${item.tabs.length}`;
  chip.appendChild(chipName);
  chip.appendChild(chipCount);

  const time = document.createElement('div');
  time.className = 'archive-item__time';
  time.textContent = `Archived ${formatTimeAgo(item.archivedAt)}`;

  info.appendChild(chip);
  info.appendChild(time);

  const actions = document.createElement('div');
  actions.className = 'archive-item__actions';

  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'icon-btn icon-btn--restore';
  restoreBtn.title = 'Restore';
  restoreBtn.innerHTML = RESTORE_ICON_SVG;
  restoreBtn.addEventListener('click', async () => {
    const removed = await removeFromArchive(item.id);
    if (removed) {
      await restoreGroup(removed);
      showToast(`"${item.title}" restored.`, 'success');
    }
    loadArchive();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'icon-btn icon-btn--delete';
  deleteBtn.title = 'Delete';
  deleteBtn.innerHTML = DELETE_ICON_SVG;
  deleteBtn.addEventListener('click', async () => {
    await deleteFromArchive(item.id);
    loadArchive();
  });

  actions.appendChild(restoreBtn);
  actions.appendChild(deleteBtn);

  el.appendChild(info);
  el.appendChild(actions);

  return el;
}

// Restore a saved group (from history or archive)
async function restoreGroup(item: { title: string; color: chrome.tabGroups.ColorEnum; tabs: { url: string; title: string }[] }): Promise<void> {
  try {
    await importTabGroup({
      version: 1,
      name: item.title,
      color: item.color,
      tabs: item.tabs,
    });
    showToast(`"${item.title}" restored with ${item.tabs.length} tabs.`, 'success');
  } catch {
    showToast('Failed to restore group.', 'error');
  }
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Import Flow
importInput.addEventListener('input', async () => {
  const code = importInput.value.trim();
  if (!code) {
    importPreview.hidden = true;
    return;
  }
  try {
    const payload = await decode(code);
    // Show preview chip
    importPreview.hidden = false;
    importPreview.innerHTML = '';

    const chip = document.createElement('span');
    chip.className = 'group-chip';
    chip.style.backgroundColor = TAB_GROUP_COLOR_MAP[payload.color];
    const name = document.createElement('span');
    name.className = 'group-chip__name';
    name.textContent = payload.name;
    const count = document.createElement('span');
    count.className = 'group-chip__count';
    count.textContent = `\u00B7 ${payload.tabs.length} tabs`;
    chip.appendChild(name);
    chip.appendChild(count);

    const tabsInfo = document.createElement('span');
    tabsInfo.className = 'import-preview__tabs';
    const domains = payload.tabs.slice(0, 3).map((t) => {
      try { return new URL(t.url).hostname.replace(/^www\./, ''); } catch { return ''; }
    }).filter(Boolean);
    const suffix = payload.tabs.length > 3 ? ', ...' : '';
    tabsInfo.textContent = domains.join(', ') + suffix;

    importPreview.appendChild(chip);
    importPreview.appendChild(tabsInfo);
  } catch {
    importPreview.hidden = true;
  }
});

importBtn.addEventListener('click', async () => {
  const code = importInput.value.trim();
  if (!code) {
    showToast('Please paste a share code.', 'error');
    return;
  }

  let payload: Awaited<ReturnType<typeof decode>>;
  try {
    payload = await decode(code);
  } catch (err) {
    showToast(err instanceof Error ? err.message : 'Invalid share code.', 'error');
    return;
  }

  if (payload.tabs.length >= LARGE_GROUP_THRESHOLD) {
    const proceed = confirm(
      `This group contains ${payload.tabs.length} tabs. Opening this many tabs may slow down Chrome. Continue?`
    );
    if (!proceed) return;
  }

  importBtn.setAttribute('disabled', '');
  importBtn.textContent = 'Importing...';

  try {
    const result = await importTabGroup(payload);
    showToast(
      `Imported "${payload.name}" with ${result.created} tab${result.created !== 1 ? 's' : ''}!`,
      'success'
    );
    importInput.value = '';
    importPreview.hidden = true;
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : 'Import failed.',
      'error'
    );
  } finally {
    importBtn.removeAttribute('disabled');
    importBtn.textContent = 'Import Tab Group';
  }
});

// Toast
function showToast(message: string, type: 'success' | 'error'): void {
  if (toastTimeout !== null) {
    clearTimeout(toastTimeout);
  }
  toast.textContent = message;
  toast.className = `toast toast--${type}`;
  toast.hidden = false;
  toastTimeout = setTimeout(() => {
    toast.hidden = true;
    toastTimeout = null;
  }, 3000);
}

// Initialize predefined labels if not exist
async function initLabels(): Promise<void> {
  const existing = await getLabels();
  if (existing.length === 0) {
    for (const label of PREDEFINED_LABELS) {
      await createLabel(label.name, label.color);
    }
  }
}

// === Settings View ===
async function loadSettings(): Promise<void> {
  const config = await getAutoAddConfig();
  const groups = await getAllTabGroups();

  // Populate target group dropdown
  autoAddTarget.innerHTML = '<option value="">Select a group...</option>';
  groups.forEach((group) => {
    const option = document.createElement('option');
    option.value = String(group.id);
    option.textContent = group.title;
    if (config.targetGroupId === group.id) {
      option.selected = true;
    }
    autoAddTarget.appendChild(option);
  });

  // Set checkbox states
  autoAddEnabled.checked = config.enabled;
  autoAddNewTabs.checked = config.includeNewTabs;
  autoAddMovedTabs.checked = config.includeMovedTabs;
}

// Settings event handlers
autoAddEnabled.addEventListener('change', async () => {
  await setAutoAddConfig({ enabled: autoAddEnabled.checked });
});

autoAddTarget.addEventListener('change', async () => {
  const targetGroupId = autoAddTarget.value ? parseInt(autoAddTarget.value, 10) : null;
  if (targetGroupId) {
    try {
      const group = await chrome.tabGroups.get(targetGroupId);
      await setAutoAddConfig({
        targetGroupId,
        targetGroupTitle: group.title || '(Untitled)',
        targetGroupColor: group.color,
      });
    } catch {
      await setAutoAddConfig({ targetGroupId: null });
    }
  } else {
    await setAutoAddConfig({ targetGroupId: null });
  }
});

autoAddNewTabs.addEventListener('change', async () => {
  await setAutoAddConfig({ includeNewTabs: autoAddNewTabs.checked });
});

autoAddMovedTabs.addEventListener('change', async () => {
  await setAutoAddConfig({ includeMovedTabs: autoAddMovedTabs.checked });
});

// Init
initLabels().then(() => loadGroups());
