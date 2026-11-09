/* ============================================================
   ADMİN PANELİ — TiryakiSPOR
   Not: bu panel yalnızca AYNI TARAYICIDA gönderilen form mesajlarını gösterir
   (mesajlar localStorage'da tutulur). Şifre denetimi tarayıcıda yapıldığı için gerçek güvenlik sağlamaz;
   gerçek mesaj kutusu için js/ayarlar.js içindeki FORM_ENDPOINT (Formspree vb.) kullanılmalıdır.
   ============================================================ */
(function () {
"use strict";
const { esc, waTel, oku, yaz } = TS;

// ===== AYARLAR =====
// Şifrenin SHA-256 özeti (şifrenin kendisi kodda tutulmaz).
// Şifre değiştirmek için siteyi açıp tarayıcı konsoluna şunu yapıştırın ve çıkan değeri aşağıya koyun:
//   crypto.subtle.digest("SHA-256", new TextEncoder().encode("YENI_SIFRE")).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")))
const ADMIN_HASH = "ab58021aaf2413724276aab88c0ba55191e1625090e146132cc67c71d27c66ce";
const DEPO_KEY   = "sz_mesajlar";
const OTURUM_KEY = "sz_admin_oturum";
const MAX_DENEME = 5;

async function sha256(metin) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(metin));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function sifreDogrula(girilen) {
  if (!window.crypto || !crypto.subtle) throw new Error("no-crypto");
  return (await sha256(girilen)) === ADMIN_HASH;
}

// Güvenli depolama (kapalıysa çökmesin)
function sGet(k)    { try { return sessionStorage.getItem(k); } catch { return null; } }
function sSet(k, v) { try { sessionStorage.setItem(k, v); } catch {} }
function sDel(k)    { try { sessionStorage.removeItem(k); } catch {} }

// ===== DENEME SAYACI =====
let deneme = parseInt(sGet("sz_deneme") || "0");
let kilitli = deneme >= MAX_DENEME;

// ===== DOM =====
const girisEkrani  = document.getElementById("girisEkrani");
const adminPanel   = document.getElementById("adminPanel");
const sifreInput   = document.getElementById("sifreInput");
const girisBtn     = document.getElementById("girisBtn");
const gozBtn       = document.getElementById("gozBtn");
const hataMesaj    = document.getElementById("hataMesaj");
const denemeUyari  = document.getElementById("denemeUyari");
const cikisBtn     = document.getElementById("cikisBtn");
const yenileBtn    = document.getElementById("yenileBtn");
const mesajListesi = document.getElementById("mesajListesi");
const hepsiniSil   = document.getElementById("hepsiniSil");
const hepsiniOku   = document.getElementById("hepsiniOku");
const onayKutu     = document.getElementById("onayKutu");
const onayMetin    = document.getElementById("onayMetin");

// ===== ONAY PENCERESİ =====
// Tarayıcının confirm() penceresi bazı ortamlarda (ör. yayın sayfasının çerçevesi) hiç açılmaz ve hep "hayır" döner;
// bu yüzden silmeden önce sayfanın kendi <dialog> penceresiyle sorulur. "Vazgeç", Esc ya da dışarı tıklamak = hayır.
function onayIste(metin) {
  if (typeof onayKutu.showModal !== "function") return Promise.resolve(confirm(metin));   // <dialog> bilmeyen eski tarayıcı
  return new Promise(coz => {
    onayMetin.textContent = metin;
    onayKutu.returnValue = "";
    onayKutu.addEventListener("close", () => coz(onayKutu.returnValue === "evet"), { once: true });
    onayKutu.showModal();
  });
}
onayKutu.addEventListener("click", (e) => {
  if (e.target !== onayKutu) return;                       // düğmelere (klavyeyle basılanlar dahil) dokunma
  const r = onayKutu.getBoundingClientRect();              // pencerenin kendi dolgusu değil, dışındaki karartılmış alan
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onayKutu.close("");
});
// Düğmeler pencereyi doğrudan kapatır (form göndermeden): izinsiz çerçevelerde (allow-forms yok) form gönderimi engellenir
onayKutu.querySelectorAll("button[value]").forEach(b => b.addEventListener("click", () => onayKutu.close(b.value)));

// ===== GİRİŞ KONTROLÜ =====
if (sGet(OTURUM_KEY) === "1") {
  panelGoster();
}

if (kilitli) {
  sifreInput.disabled = true;
  girisBtn.disabled   = true;
  denemeUyari.textContent = "⛔ Çok fazla hatalı giriş. Oturumu kapatıp açın.";
}

// Gözü göster/gizle
gozBtn.addEventListener("click", () => {
  const goster = sifreInput.type === "password";
  sifreInput.type = goster ? "text" : "password";
  gozBtn.textContent = goster ? "🙈" : "👁️";
});

// Enter ile giriş
sifreInput.addEventListener("keydown", e => { if (e.key === "Enter") girisBtn.click(); });

girisBtn.addEventListener("click", async () => {
  if (kilitli) return;
  const girilen = sifreInput.value.trim();
  if (!girilen) return;

  let dogru = false;
  try { dogru = await sifreDogrula(girilen); }
  catch {
    denemeUyari.textContent = "⚠️ Bu tarayıcı güvenli (https) bağlantı olmadan giriş yapamıyor.";
    return;
  }

  if (dogru) {
    sSet(OTURUM_KEY, "1");
    sSet("sz_deneme", "0");
    deneme = 0;
    panelGoster();
  } else {
    deneme++;
    sSet("sz_deneme", deneme);
    hataMesaj.style.display = "block";
    sifreInput.value = "";
    sifreInput.focus();
    const kalan = MAX_DENEME - deneme;
    denemeUyari.textContent = kalan > 0
      ? `⚠️ ${kalan} deneme hakkınız kaldı.`
      : "⛔ Hesap kilitlendi. Sayfayı yenileyin.";
    if (deneme >= MAX_DENEME) {
      kilitli = true; sifreInput.disabled = true; girisBtn.disabled = true;
    }
  }
});

// Çıkış
cikisBtn.addEventListener("click", () => {
  sDel(OTURUM_KEY);
  location.reload();
});

// Yenile
yenileBtn.addEventListener("click", panelGuncelle);

// ===== PANELİ GÖSTER =====
function panelGoster() {
  girisEkrani.style.display = "none";
  adminPanel.style.display  = "block";
  panelGuncelle();
}

// ===== PANEL GÜNCELLE =====
function panelGuncelle() {
  const mesajlar = mesajlariAl();
  const bugun = new Date().toDateString();

  const toplam     = mesajlar.length;
  const okunmamis  = mesajlar.filter(m => !m.okundu).length;
  const yanitlanan = mesajlar.filter(m => m.okundu).length;
  const bugunSayisi= mesajlar.filter(m => new Date(m.tarih).toDateString() === bugun).length;

  document.getElementById("statToplam").textContent    = toplam;
  document.getElementById("statOkunmamis").textContent = okunmamis;
  document.getElementById("statYanit").textContent     = yanitlanan;
  document.getElementById("statBugun").textContent     = bugunSayisi;
  document.getElementById("okunmamisSayi").textContent = `${okunmamis} Yeni`;

  if (toplam === 0) {
    mesajListesi.innerHTML = `
      <div class="bos-panel">
        <div class="bos-icon">📭</div>
        <p>Henüz hiç müşteri mesajı yok.</p>
      </div>`;
    return;
  }

  const sirali = [...mesajlar].reverse(); // En yeni en üstte
  mesajListesi.innerHTML = sirali.map(m => mesajKartHTML(m)).join("");

  // Buton eventleri
  mesajListesi.querySelectorAll(".mk-btn-sil").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (await onayIste("Bu mesajı silmek istediğinize emin misiniz?")) {
        mesajSil(btn.dataset.id);
      }
    });
  });
  mesajListesi.querySelectorAll(".mk-btn-ok").forEach(btn => {
    btn.addEventListener("click", () => mesajOkundu(btn.dataset.id));
  });
}

// ===== MESAJ KARTI HTML =====
function mesajKartHTML(m) {
  const tarihStr = new Date(m.tarih).toLocaleString("tr-TR");
  const waLink   = `https://wa.me/${waTel(m.tel)}?text=${encodeURIComponent("Merhaba " + m.ad + ", TiryakiSPOR olarak size dönüş yapıyoruz.")}`;
  const durum    = m.okundu ? "okundu" : "okunmamis";
  const etiket   = m.okundu
    ? `<span class="mk-etiket etiket-ok">✅ Okundu</span>`
    : `<span class="mk-etiket etiket-yeni">🔔 Yeni</span>`;

  return `
    <div class="mesaj-kart ${durum}">
      <div class="mk-header">
        <div>
          <div class="mk-isim">👤 ${esc(m.ad)}</div>
          <div class="mk-tel">📞 <a href="tel:+${waTel(m.tel)}">${esc(m.tel)}</a></div>
        </div>
        <div class="mk-sag">
          <div class="mk-tarih">🕐 ${tarihStr}</div>
          ${etiket}
        </div>
      </div>
      <div class="mk-mesaj">💬 ${esc(m.mesaj)}</div>
      <div class="mk-aksiyonlar">
        <a class="mk-btn mk-btn-wa" href="${waLink}" target="_blank">💬 WhatsApp ile Yanıtla</a>
        ${!m.okundu ? `<button class="mk-btn mk-btn-ok" data-id="${m.id}">✅ Okundu İşaretle</button>` : ""}
        <button class="mk-btn mk-btn-sil" data-id="${m.id}">🗑️ Sil</button>
      </div>
    </div>`;
}

// ===== DEPOLAMA =====
function mesajlariAl() {
  return oku(DEPO_KEY, []);
}

function mesajSil(id) {
  yaz(DEPO_KEY, mesajlariAl().filter(m => m.id !== id));
  panelGuncelle();
}

function mesajOkundu(id) {
  yaz(DEPO_KEY, mesajlariAl().map(m => m.id === id ? { ...m, okundu: true } : m));
  panelGuncelle();
}

hepsiniSil.addEventListener("click", async () => {
  if (await onayIste("Tüm mesajları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
    try { localStorage.removeItem(DEPO_KEY); } catch { /* depolama kapalı */ }
    panelGuncelle();
  }
});

hepsiniOku.addEventListener("click", () => {
  yaz(DEPO_KEY, mesajlariAl().map(m => ({ ...m, okundu: true })));
  panelGuncelle();
});

// Otomatik yenile (her 30 saniyede)
setInterval(() => { if (adminPanel.style.display === "block") panelGuncelle(); }, 30000);
})();
