# Tab Group Share - Chrome Web Store Listing

## Temel Bilgiler

**Eklenti Adı:** Tab Group Share

**Kısa Açıklama (132 karakter):**
Share and import Chrome tab groups instantly with a single code. Perfect for collaboration and backup.

**Detaylı Açıklama:**

Tab Group Share makes it effortless to share your Chrome tab groups with anyone. Generate a compact share code for any tab group and send it to colleagues, friends, or save it for later. Recipients can instantly recreate the entire tab group with all its tabs in one click.

**Key Features:**

• **One-Click Sharing** - Select any tab group and generate a shareable code instantly
• **Easy Import** - Paste a share code to recreate the entire tab group with all tabs
• **Keyboard Shortcuts** - Quick sharing with Ctrl+Shift+S (Windows/Linux) or Cmd+Shift+E (Mac)
• **Right-Click Menu** - Share directly from the page context menu
• **Visual Preview** - See group name, color, and tab count before importing
• **Color Preservation** - Tab group colors are preserved when sharing
• **Privacy Focused** - No data collection, everything works locally

**Perfect For:**
• Team collaboration - share research tabs with colleagues
• Device switching - move tab groups between computers
• Backup - save important tab groups as text codes
• Teaching - share curated resources with students

**How It Works:**
1. Click the extension icon to see your tab groups
2. Click the share button on any group
3. Copy the generated code (starts with "tgs:")
4. Share the code with anyone
5. They paste it in the Import tab to recreate the group

No accounts, no cloud sync, no tracking - just simple, instant tab group sharing.

---

## Kategori

**Primary Category:** Productivity

**Secondary Category:** Tools

---

## Görseller

### Gerekli Görseller:

1. **Icon** (128x128 PNG) - `public/icons/icon128.png`

2. **Screenshots** (1280x800 veya 640x400 PNG/JPG):
   - Screenshot 1: Ana popup ekranı - tab grupları listesi
   - Screenshot 2: Share overlay - kod kopyalama ekranı
   - Screenshot 3: Import ekranı - kod yapıştırma ve önizleme
   - Screenshot 4: Sağ tık menüsü veya klavye kısayolu kullanımı

3. **Promotional Images (Opsiyonel):**
   - Small Tile: 440x280 PNG
   - Large Tile: 920x680 PNG
   - Marquee: 1400x560 PNG

---

## İzinler Açıklaması

**tabGroups:** Required to read and create tab groups

**tabs:** Required to access tab URLs and titles for sharing, and to create new tabs when importing

**contextMenus:** Required to add "Share this tab group" option to right-click menu

**offscreen:** Required to copy share codes to clipboard from background service worker

---

## Gizlilik Politikası

### Privacy Policy

**Tab Group Share** respects your privacy:

- **No Data Collection:** We do not collect, store, or transmit any personal data
- **No Analytics:** We do not use any analytics or tracking services
- **No External Servers:** All operations happen locally in your browser
- **No Account Required:** The extension works without any sign-up or login
- **Open Source:** The code is transparent and auditable

**Data Handling:**
- Tab URLs and titles are only processed locally to generate share codes
- Share codes are stored only in your clipboard when you choose to copy them
- No data is ever sent to external servers

**Permissions Used:**
- `tabGroups`: To read existing tab groups and create new ones
- `tabs`: To read tab information for sharing and create tabs when importing
- `contextMenus`: To add right-click menu option
- `offscreen`: To enable clipboard functionality

For questions, contact: [your-email@example.com]

---

## Sürüm Geçmişi

### Version 1.1.0 (Current)
- Chrome-style tab group chips design
- Keyboard shortcuts (Ctrl+Shift+S / Cmd+Shift+E)
- Right-click context menu integration
- Import preview with group info
- Dark mode support
- Back button in share overlay
- High-quality app icon

### Version 1.0.0
- Initial release
- Share and import tab groups
- Base64 encoded share codes with "tgs:" prefix
- Popup UI with Share/Import views

---

## Teknik Bilgiler

**Manifest Version:** 3

**Minimum Chrome Version:** 109

**Languages:** English (default), Turkish UI elements

**Size:** ~35 KB (unpacked)

**Technologies:**
- TypeScript
- Webpack
- Chrome Extensions API (Manifest V3)

---

## Store URL Formatı

Yayınlandıktan sonra URL şu formatta olacak:
```
https://chrome.google.com/webstore/detail/tab-group-share/[extension-id]
```

---

## Yayınlama Kontrol Listesi

- [ ] Developer hesabı oluşturuldu ($5 tek seferlik ücret)
- [ ] Icon (128x128) hazır
- [ ] En az 1 screenshot (1280x800) hazır
- [ ] Kısa açıklama (max 132 karakter) yazıldı
- [ ] Detaylı açıklama yazıldı
- [ ] Gizlilik politikası URL'si hazır
- [ ] Kategori seçildi
- [ ] dist/ klasörü zip'lendi
- [ ] Manifest.json kontrol edildi
