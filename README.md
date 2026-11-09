# TiryakiSPOR — Top Tamir & Bakım Servisi

Kızılay/Ankara'daki top onarım servisi için statik site (HTML + CSS + sade JavaScript, derleme gerektirmez).
`index.html` dosyasını tarayıcıda açmak yeterlidir.

## Klasörler

| Yol | Ne işe yarar |
|---|---|
| `index.html` | Ana sayfa (içerik burada) |
| `admin.html` | Admin paneli (aynı tarayıcıdaki form mesajlarını gösterir) |
| `css/style.css` | Ana site stilleri. Renkler/ölçüler dosyanın başındaki `:root` içinde |
| `css/admin.css` | Admin paneli stilleri (ana siteden bağımsız) |
| `js/ayarlar.js` | **Numara, form adresi, hizmet ve paket listeleri — çoğu değişiklik burada** |
| `js/ortak.js` | Ortak yardımcılar (`esc`, `waTel`, `oku`/`yaz`) — site ve admin kullanır |
| `js/arayuz.js` | Toast bildirimi, mobil menü, Esc tuşu, "görününce belir" |
| `js/liste.js` | Hizmet kartları, paketler, filtre ve arama |
| `js/kaydirma.js` | Tek scroll dinleyicisi, navbar, top dönme efektleri |
| `js/deste.js` | Hizmet kartlarının deste gibi durup dağıtılma efekti |
| `js/form.js` | İletişim formu (Formspree veya WhatsApp yedeği) |
| `js/baslat.js` | Sayfa açılışında sırayla çalışan başlatma adımları |
| `js/hareket.js` | GSAP: açılış animasyonu ve hero → bölüm katman geçişi |
| `js/admin.js` | Admin paneli mantığı (silme onayı, tarayıcının `confirm()` penceresi yerine sayfanın kendi penceresiyle alınır) |
| `images/` | Top görselleri |
| `tools/` | Derleme ve denetim araçları (siteye dahil değil) |

`js/` dosyalarının **yükleme sırası önemlidir** (her dosya öncekilerin hazırladığı `TS` ad alanını kullanır).
Sıra `index.html` içinde yazılıdır.

## Sık yapılan değişiklikler

- **WhatsApp numarası:** `js/ayarlar.js` → `WA_NUMARA`; ayrıca `index.html` içindeki sabit `wa.me` / `tel:` bağlantıları.
  Unuttuğunuz yer olursa `node tools/dogrula.js` gösterir.
- **Hizmet / paket eklemek:** `js/ayarlar.js` → `hizmetler`, `paketler`. Yeni marka eklerseniz
  `index.html` içindeki `markaSelect` seçeneğine de ekleyin (denetim aracı eksiği bildirir).
- **Form mesajlarının size ulaşması:** Formspree'de form açın, adresi `js/ayarlar.js` → `FORM_ENDPOINT` içine yazın.
  Boşken form, hazır mesajı WhatsApp'ta açar.

## Araçlar

```bash
node tools/dogrula.js     # numara / marka / id / dosya tutarlılık denetimi
python3 tools/derle.py    # dist/ altında tek dosyalık yayın sayfaları (ana sayfa + admin) ve zip üretir
```

## Bilinen sınırlar

- Admin paneli yalnızca **aynı tarayıcıda** gönderilen mesajları gösterir; şifre denetimi tarayıcıda yapıldığı için
  gerçek güvenlik sağlamaz. Gerçek mesaj kutusu için `FORM_ENDPOINT` kullanın.
- GSAP, `cdnjs.cloudflare.com` üzerinden yüklenir; yüklenemezse site animasyonsuz ama tam çalışır.
- İşletim sisteminde "hareketi azalt" açıksa animasyonlar bilerek kapanır.
- Yayın sayfasının çerçevesinde tarayıcının `confirm()` penceresi hiç açılmaz (hep "hayır" döner); bu yüzden admin'deki
  silme onayı sayfanın kendi `<dialog>` penceresiyle alınır (`js/admin.js` → `onayIste`).
- Yayın aracı `<html lang>` vermez; `tools/derle.py` sayfanın en başına `lang="tr"` yapan bir satır ekler.
  Yoksa CSS'teki büyük harf dönüşümü Türkçe "i"yi "I" yapar (İÇİN → IÇIN).
- Form servisi (Formspree vb.) yalnızca site kendi barındırmasında çalışır; yayın sayfasında dış istekler engellidir,
  orada form hazır mesajı WhatsApp'ta açar.
