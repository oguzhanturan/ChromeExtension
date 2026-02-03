import './popup.css';
import { DisplayTabGroup, TAB_GROUP_COLOR_MAP } from '../types/tab-group';
import { encode, decode } from '../utils/codec';
import {
  getAllTabGroups,
  buildSharePayload,
  importTabGroup,
} from '../utils/tab-group-service';

// DOM References
const viewShare = document.getElementById('view-share')!;
const viewImport = document.getElementById('view-import')!;
const groupsList = document.getElementById('groups-list')!;
const emptyState = document.getElementById('empty-state')!;
const importInput = document.getElementById('import-input') as HTMLTextAreaElement;
const importBtn = document.getElementById('import-btn')!;
const shareResult = document.getElementById('share-result')!;
const shareOutput = document.getElementById('share-output') as HTMLTextAreaElement;
const copyBtn = document.getElementById('copy-btn')!;
const copyFeedback = document.getElementById('copy-feedback')!;
const closeBtn = document.getElementById('share-result-close')!;
const toast = document.getElementById('toast')!;
const navBtns = document.querySelectorAll<HTMLButtonElement>('.nav-btn');

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

// Load & Render Tab Groups
async function loadGroups(): Promise<void> {
  const groups = await getAllTabGroups();

  groupsList.innerHTML = '';
  if (groups.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  groups.forEach((group) => {
    const card = createGroupCard(group);
    groupsList.appendChild(card);
  });
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
  shareBtn.textContent = 'Share';
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

  importBtn.setAttribute('disabled', '');
  importBtn.textContent = 'Importing...';

  try {
    const payload = decode(code);
    await importTabGroup(payload);
    showToast(
      `Imported "${payload.name}" with ${payload.tabs.length} tabs!`,
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
  toast.textContent = message;
  toast.className = `toast toast--${type}`;
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}

// Init
loadGroups();
