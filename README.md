# Tab Group Share - Chrome Extension

Chrome'daki sekme gruplarını paylaşma ve içe aktarma eklentisi.

## Kurulum

### Gereksinimler

- Node.js (v16+)
- Google Chrome (v89+)

### Derleme

```bash
npm install
npm run build
```

Build çıktısı `dist/` klasörüne oluşturulur.

### Chrome'a Yükleme

1. Chrome'da `chrome://extensions` adresini aç
2. Sağ üstteki **Developer mode** (Geliştirici modu) anahtarını etkinleştir
3. **Load unpacked** (Paketlenmemiş uzantı yükle) butonuna tıkla
4. Projedeki `dist/` klasörünü seç
5. Eklenti araç çubuğunda görünecektir

## Kullanım

### Sekme Grubunu Paylaşma

1. Chrome'da araç çubuğundaki **Tab Group Share** ikonuna tıkla
2. Popup'ta mevcut penceredeki tüm sekme grupları listelenir
3. Paylaşmak istediğin grubun yanındaki **Share** butonuna tıkla
4. Oluşan paylaşım kodunu **Copy to Clipboard** ile kopyala
5. Kodu istediğin kişiye gönder (mesaj, e-posta, vb.)

### Sekme Grubunu İçe Aktarma

1. Popup'ta üstteki **Import** sekmesine geç
2. Aldığın paylaşım kodunu (`tgs:...` ile başlayan) metin alanına yapıştır
3. **Import Tab Group** butonuna tıkla
4. Gruptaki tüm sekmeler otomatik olarak açılır ve aynı isim/renkte gruplandırılır

### Paylaşım Kodu Formatı

Paylaşım kodları `tgs:` ön eki ile başlar ve base64 ile kodlanmış JSON verisi içerir:

```
tgs:eyJ2ZXJzaW9uIjoxLCJuYW1lIjoiV29yayIsImNvbG9yIjoiYmx1ZSIsInRhYnMiOlt7InVybCI6Imh0dHBzOi8vZXhhbXBsZS5jb20iLCJ0aXRsZSI6IkV4YW1wbGUifV19
```

Kod içeriği:
- Grup adı
- Grup rengi
- Tüm sekmelerin URL ve başlıkları

> **Not:** Yalnızca `http://` ve `https://` ile başlayan URL'ler paylaşılır. Chrome dahili sayfaları (`chrome://`, `about:`) paylaşım koduna dahil edilmez.

## Geliştirme

Değişiklikleri otomatik izlemek için:

```bash
npm run dev
```

Bu komut webpack'i watch modunda çalıştırır. Kod değişikliklerinde `dist/` otomatik güncellenir. Chrome'da eklentiyi yenilemek için `chrome://extensions` sayfasında yenile ikonuna tıkla.

## İzinler

| İzin | Açıklama |
|------|----------|
| `tabGroups` | Sekme gruplarını okuma ve oluşturma |
| `tabs` | Sekme URL ve başlıklarını okuma |
