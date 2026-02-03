import './popup.css';
import { DisplayTabGroup, TAB_GROUP_COLOR_MAP } from '../types/tab-group';
import { encode, decode } from '../utils/codec';
import {
  getAllTabGroups,
  buildSharePayload,
  importTabGroup,
} from '../utils/tab-group-service';

const LARGE_GROUP_THRESHOLD = 30;

// DOM References
const viewShare = document.getElementById('view-share')!;
const viewImport = document.getElementById('view-import')!;
const groupsList = document.getElementById('groups-list')!;
const emptyState = document.getElementById('empty-state')!;
const errorState = document.getElementById('error-state')!;
const loadingState = document.getElementById('loading-state')!;
const retryBtn = document.getElementById('retry-btn')!;
const refreshBtn = document.getElementById('refresh-btn')!;
const importInput = document.getElementById('import-input') as HTMLTextAreaElement;
const importBtn = document.getElementById('import-btn')!;
const shareResult = document.getElementById('share-result')!;
const shareResultTitle = document.getElementById('share-result-title')!;
const shareResultColor = document.getElementById('share-result-color')!;
const shareOutput = document.getElementById('share-output') as HTMLTextAreaElement;
const copyBtn = document.getElementById('copy-btn')!;
const copyFeedback = document.getElementById('copy-feedback')!;
const closeBtn = document.getElementById('share-result-close')!;
const toast = document.getElementById('toast')!;
const navBtns = document.querySelectorAll<HTMLButtonElement>('.nav-btn');

let toastTimeout: ReturnType<typeof setTimeout> | null = null;

// SVG share icon template
const SHARE_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" fill="currentColor"/>
</svg>`;

// View Navigation
navBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.view;
    navBtns.forEach((b) => b.classList.remove('nav-btn--active'));
    btn.classList.add('nav-btn--active');
    viewShare.hidden = target !== 'share';
    viewImport.hidden = target !== 'import';
    shareResult.hidden = true;
  });
});

// Refresh
refreshBtn.addEventListener('click', () => loadGroups());
retryBtn.addEventListener('click', () => loadGroups());

// Load & Render Tab Groups
async function loadGroups(): Promise<void> {
  loadingState.hidden = false;
  groupsList.innerHTML = '';
  emptyState.hidden = true;
  errorState.hidden = true;

  try {
    const groups = await getAllTabGroups();

    loadingState.hidden = true;

    if (groups.length === 0) {
      emptyState.hidden = false;
      return;
    }

    groups.forEach((group) => {
      const card = createGroupCard(group);
      groupsList.appendChild(card);
    });
  } catch {
    loadingState.hidden = true;
    errorState.hidden = false;
  }
}

function createGroupCard(group: DisplayTabGroup): HTMLElement {
  const card = document.createElement('div');
  card.className = 'group-card';

  const colorDot = document.createElement('span');
  colorDot.className = 'group-card__color';
  colorDot.style.background = TAB_GROUP_COLOR_MAP[group.color];

  const info = document.createElement('div');
  info.className = 'group-card__info';

  const name = document.createElement('div');
  name.className = 'group-card__name';
  name.textContent = group.title;

  const count = document.createElement('div');
  count.className = 'group-card__count';
  count.textContent = `${group.tabCount} tab${group.tabCount !== 1 ? 's' : ''}`;

  info.appendChild(name);
  info.appendChild(count);

  const shareBtn = document.createElement('button');
  shareBtn.className = 'group-card__share';
  shareBtn.innerHTML = `${SHARE_ICON_SVG}<span>Share</span>`;
  shareBtn.addEventListener('click', () => handleShare(group));

  card.appendChild(colorDot);
  card.appendChild(info);
  card.appendChild(shareBtn);

  return card;
}

// Share Flow
function handleShare(group: DisplayTabGroup): void {
  const payload = buildSharePayload(group);

  if (payload.tabs.length === 0) {
    showToast('No shareable tabs (only http/https URLs can be shared).', 'error');
    return;
  }

  const code = encode(payload);
  shareOutput.value = code;
  shareResultTitle.textContent = group.title;
  shareResultColor.style.background = TAB_GROUP_COLOR_MAP[group.color];
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

// Import Flow
importBtn.addEventListener('click', async () => {
  const code = importInput.value.trim();
  if (!code) {
    showToast('Please paste a share code.', 'error');
    return;
  }

  let payload: ReturnType<typeof decode>;
  try {
    payload = decode(code);
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

// Init
loadGroups();
