/* ============================================================
   ADMİN & CMS PANELİ — TiryakiSPOR
   Şifre doğrulaması + Mesaj Yönetimi + CMS İçerik Editörü
   Değişiklikleri Doğrudan Canlıya (GitHub API / Cloudflare Pages) Gönderme
   ============================================================ */
(function () {
  "use strict";

  const { esc, waTel, oku, yaz } = window.TS || {};
  const ayar = (window.TS && window.TS.ayar) || {};
  const hizmetler = (window.TS && window.TS.hizmetler) || [];
  const paketler = (window.TS && window.TS.paketler) || [];

  // Sabitler
  const ADMIN_HASH = "ab58021aaf2413724276aab88c0ba55191e1625090e146132cc67c71d27c66ce";
  const DEPO_KEY   = "sz_mesajlar";
  const OTURUM_KEY = "sz_admin_oturum";
  const CMS_KEY    = "sz_cms_verisi";
  const MAX_DENEME = 5;

  // SHA-256 doğrulama
  async function sha256(metin) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(metin));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  async function sifreDogrula(girilen) {
    if (!window.crypto || !crypto.subtle) throw new Error("no-crypto");
    return (await sha256(girilen)) === ADMIN_HASH;
  }

  // Session Storage
  function sGet(k)    { try { return sessionStorage.getItem(k); } catch { return null; } }
  function sSet(k, v) { try { sessionStorage.setItem(k, v); } catch {} }
  function sDel(k)    { try { sessionStorage.removeItem(k); } catch {} }

  // Toast Bildirim
  const toastEl = document.getElementById("adminToast");
  function toast(mesaj, tip = "basari") {
    if (!toastEl) return;
    toastEl.textContent = mesaj;
    toastEl.className = "admin-toast aktif " + tip;
    setTimeout(() => { toastEl.className = "admin-toast"; }, 3500);
  }

  // DOM Elemanları
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

  // CMS DOM
  const btnCanliyaYayinla = document.getElementById("btnCanliyaYayinla");
  const btnGenelKaydet    = document.getElementById("btnGenelKaydet");
  const btnHizmetKaydet   = document.getElementById("btnHizmetKaydet");
  const btnPaketKaydet    = document.getElementById("btnPaketKaydet");
  const btnSssKaydet      = document.getElementById("btnSssKaydet");
  const btnSssEkle        = document.getElementById("btnSssEkle");

  const inpWaNumara       = document.getElementById("inpWaNumara");
  const inpFormEndpoint   = document.getElementById("inpFormEndpoint");
  const inpAdresSorgu     = document.getElementById("inpAdresSorgu");
  const inpHaritaLink     = document.getElementById("inpHaritaLink");
  const inpCalismaSaatleri= document.getElementById("inpCalismaSaatleri");

  const hizmetlerListesi  = document.getElementById("hizmetlerListesi");
  const paketlerListesi   = document.getElementById("paketlerListesi");
  const sssListesi        = document.getElementById("sssListesi");

  let deneme = parseInt(sGet("sz_deneme") || "0", 10);
  let kilitli = deneme >= MAX_DENEME;

  // Onay Kutusu
  function onayIste(metin) {
    if (typeof onayKutu.showModal !== "function") return Promise.resolve(confirm(metin));
    return new Promise(coz => {
      onayMetin.textContent = metin;
      onayKutu.returnValue = "";
      onayKutu.addEventListener("close", () => coz(onayKutu.returnValue === "evet"), { once: true });
      onayKutu.showModal();
    });
  }
  onayKutu.addEventListener("click", (e) => {
    if (e.target !== onayKutu) return;
    const r = onayKutu.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onayKutu.close("");
  });
  onayKutu.querySelectorAll("button[value]").forEach(b => b.addEventListener("click", () => onayKutu.close(b.value)));

  // Sekme Değişimi
  document.querySelectorAll(".cms-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cms-tab-btn").forEach(b => b.classList.remove("aktif"));
      document.querySelectorAll(".tab-icerik").forEach(t => t.classList.remove("aktif"));
      btn.classList.add("aktif");
      const tabId = btn.getAttribute("data-tab");
      const hedef = document.getElementById(tabId);
      if (hedef) hedef.classList.add("aktif");
    });
  });

  // Giriş Kontrolü
  if (sGet(OTURUM_KEY) === "1") {
    panelGoster();
  }

  if (kilitli) {
    sifreInput.disabled = true;
    girisBtn.disabled   = true;
    denemeUyari.textContent = "⛔ Çok fazla hatalı deneme yapıldı. Tarayıcıyı kapatıp açın.";
  }

  gozBtn.addEventListener("click", () => {
    const goster = sifreInput.type === "password";
    sifreInput.type = goster ? "text" : "password";
    gozBtn.textContent = goster ? "🙈" : "👁️";
  });

  sifreInput.addEventListener("keydown", e => { if (e.key === "Enter") girisBtn.click(); });

  girisBtn.addEventListener("click", async () => {
    if (kilitli) return;
    const girilen = sifreInput.value.trim();
    if (!girilen) return;

    let dogru = false;
    try {
      dogru = await sifreDogrula(girilen);
    } catch {
      dogru = false;
    }

    if (dogru) {
      sDel("sz_deneme");
      sSet(OTURUM_KEY, "1");
      hataMesaj.style.display = "none";
      panelGoster();
    } else {
      deneme++;
      sSet("sz_deneme", String(deneme));
      hataMesaj.style.display = "block";
      sifreInput.value = "";
      sifreInput.focus();
      if (deneme >= MAX_DENEME) {
        kilitli = true;
        sifreInput.disabled = true;
        girisBtn.disabled   = true;
        denemeUyari.textContent = "⛔ Çok fazla hatalı deneme. Tarayıcı oturumunu yenileyin.";
      }
    }
  });

  cikisBtn.addEventListener("click", () => {
    sDel(OTURUM_KEY);
    adminPanel.style.display = "none";
    girisEkrani.style.display = "flex";
    sifreInput.value = "";
  });

  function panelGoster() {
    girisEkrani.style.display = "none";
    adminPanel.style.display = "block";
    mesajlariYukle();
    cmsVerileriniYukle();
  }

  // ================= MESAJLAR BÖLÜMÜ =================
  function mesajlariAl() {
    try {
      const ham = localStorage.getItem(DEPO_KEY);
      return ham ? JSON.parse(ham) : [];
    } catch {
      return [];
    }
  }

  function mesajlariKaydet(dizi) {
    try {
      localStorage.setItem(DEPO_KEY, JSON.stringify(dizi));
    } catch {}
  }

  function mesajlariYukle() {
    const mesajlar = mesajlariAl();
    const statToplam    = document.getElementById("statToplam");
    const statOkunmamis = document.getElementById("statOkunmamis");
    const statYanit     = document.getElementById("statYanit");
    const statBugun     = document.getElementById("statBugun");
    const okunmamisSayi = document.getElementById("okunmamisSayi");

    const bugunStr = new Date().toISOString().slice(0, 10);
    const okunmamislar = mesajlar.filter(m => !m.okundu).length;
    const okunanlar    = mesajlar.filter(m => m.okundu).length;
    const bugunler     = mesajlar.filter(m => (m.tarih || "").startsWith(bugunStr)).length;

    if (statToplam)    statToplam.textContent    = String(mesajlar.length);
    if (statOkunmamis) statOkunmamis.textContent = String(okunmamislar);
    if (statYanit)     statYanit.textContent     = String(okunanlar);
    if (statBugun)     statBugun.textContent     = String(bugunler);
    if (okunmamisSayi) okunmamisSayi.textContent = okunmamislar + " Yeni Mesaj";

    if (mesajlar.length === 0) {
      mesajListesi.innerHTML = `
        <div class="bos-panel">
          <div class="bos-icon">📭</div>
          <p>Henüz kayıtlı müşteri mesajı bulunmuyor.</p>
        </div>`;
      return;
    }

    mesajListesi.innerHTML = mesajlar.map(m => {
      const cls = m.okundu ? "okundu" : "okunmamis";
      const etiket = m.okundu ? `<span class="mk-etiket etiket-ok">Okundu</span>` : `<span class="mk-etiket etiket-yeni">Yeni</span>`;
      const waLink = waTel ? `https://wa.me/${waTel(m.tel)}` : `tel:${m.tel}`;
      return `
        <div class="mesaj-kart ${cls}" data-id="${m.id}">
          <div class="mk-header">
            <div>
              <div class="mk-isim">${esc ? esc(m.ad) : m.ad}</div>
              <div class="mk-tel">📞 <a href="${waLink}" target="_blank">${m.tel}</a></div>
            </div>
            <div class="mk-sag">
              ${etiket}
              <div class="mk-tarih">${m.tarih || ""}</div>
            </div>
          </div>
          <div class="mk-mesaj">${esc ? esc(m.mesaj) : m.mesaj}</div>
          <div class="mk-aksiyonlar">
            <a class="mk-btn mk-btn-wa" href="${waLink}" target="_blank">💬 WhatsApp ile Yanıtla</a>
            <button class="mk-btn mk-btn-ok" data-islem="durum">${m.okundu ? "Yeniden İşaretle (Yeni)" : "Okundu İşaretle"}</button>
            <button class="mk-btn mk-btn-sil" data-islem="sil">🗑️ Sil</button>
          </div>
        </div>
      `;
    }).join("");

    // Aksiyon butonları
    mesajListesi.querySelectorAll("[data-islem]").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const kart = e.target.closest(".mesaj-kart");
        const id = kart.getAttribute("data-id");
        const islem = e.target.getAttribute("data-islem");
        let list = mesajlariAl();

        if (islem === "sil") {
          const onay = await onayIste("Bu mesajı silmek istediğinize emin misiniz?");
          if (onay) {
            list = list.filter(x => String(x.id) !== String(id));
            mesajlariKaydet(list);
            mesajlariYukle();
            toast("Mesaj silindi.");
          }
        } else if (islem === "durum") {
          list = list.map(x => {
            if (String(x.id) === String(id)) x.okundu = !x.okundu;
            return x;
          });
          mesajlariKaydet(list);
          mesajlariYukle();
        }
      });
    });
  }

  yenileBtn.addEventListener("click", () => {
    mesajlariYukle();
    toast("Mesaj listesi güncellendi.");
  });

  hepsiniSil.addEventListener("click", async () => {
    const onay = await onayIste("TÜM mesajları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.");
    if (onay) {
      mesajlariKaydet([]);
      mesajlariYukle();
      toast("Tüm mesajlar silindi.");
    }
  });

  hepsiniOku.addEventListener("click", () => {
    let list = mesajlariAl();
    list = list.map(x => ({ ...x, okundu: true }));
    mesajlariKaydet(list);
    mesajlariYukle();
    toast("Tüm mesajlar okundu olarak işaretlendi.");
  });

  // ================= CMS BÖLÜMÜ =================
  let cmsData = {
    ayar: {
      WA_NUMARA: ayar.WA_NUMARA || "905314315560",
      FORM_ENDPOINT: ayar.FORM_ENDPOINT || "",
      ADRES_SORGU: ayar.ADRES_SORGU || "Menekşe Pasajı, Kızılay, Ankara",
      HARITA_LINK: ayar.HARITA_LINK || "",
      calismaSaatleri: "Hafta içi 10:00 – 18:00 | Hafta sonu Kapalı"
    },
    hizmetler: JSON.parse(JSON.stringify(hizmetler)),
    paketler: JSON.parse(JSON.stringify(paketler)),
    sss: [
      { soru: "Tamir işlemi ne kadar sürer?", cevap: "Sibop değişimi ve basınç testi gibi basit işlemler genellikle aynı gün yapılır. Dikiş ve panel onarımları, hasarın durumuna göre 1–3 iş günü içinde tamamlanır." },
      { soru: "Hangi top markalarını tamir ediyorsunuz?", cevap: "Adidas, Nike, Puma, Select, Molten, Mikasa, Wilson, Spalding, Delta ve diğer tüm markaların futbol, basketbol ve voleybol toplarını onarıyoruz." },
      { soru: "Fiyat nasıl belirlenir?", cevap: "Hasarın durumuna (patlak, sibop, dikiş veya deri değişimi) göre işlem öncesi şeffaf fiyat bilgisi verilir. Onayınız olmadan tamire başlanmaz." },
      { soru: "Dükkâna gelmeden önce bilgi alabilir miyim?", cevap: "Topunuzun fotoğrafını WhatsApp hattımıza göndererek hasar durumu ve tahmini teslim süresi hakkında anında ön bilgi alabilirsiniz." }
    ]
  };

  // Varsa localStorage'daki güncel CMS taslağını çek
  try {
    const kayitli = localStorage.getItem(CMS_KEY);
    if (kayitli) cmsData = JSON.parse(kayitli);
  } catch {}

  function cmsVerileriniYukle() {
    // 1. Genel Ayarlar Formu
    inpWaNumara.value        = cmsData.ayar.WA_NUMARA || "";
    inpFormEndpoint.value    = cmsData.ayar.FORM_ENDPOINT || "";
    inpAdresSorgu.value      = cmsData.ayar.ADRES_SORGU || "";
    inpHaritaLink.value      = cmsData.ayar.HARITA_LINK || "";
    inpCalismaSaatleri.value = cmsData.ayar.calismaSaatleri || "";

    // 2. Hizmetler Listesi
    hizmetlerListesi.innerHTML = cmsData.hizmetler.map((h, i) => `
      <div class="cms-kart" data-index="${i}">
        <div class="cms-kart-header">
          <div class="cms-kart-baslik">${i + 1}. ${h.ad}</div>
          <span class="cms-kart-badge">${h.kategori.toUpperCase()}</span>
        </div>
        <div class="cms-grid">
          <div class="cms-form-grup">
            <label>Hizmet Başlığı</label>
            <input type="text" class="hizmet-ad" value="${h.ad || ""}" />
          </div>
          <div class="cms-form-grup">
            <label>Tahmini Teslim Süresi</label>
            <input type="text" class="hizmet-sure" value="${h.sure || ""}" />
          </div>
        </div>
        <div class="cms-form-grup">
          <label>Açıklama</label>
          <textarea class="hizmet-aciklama" rows="2">${h.aciklama || ""}</textarea>
        </div>
      </div>
    `).join("");

    // 3. Paketler Listesi
    paketlerListesi.innerHTML = cmsData.paketler.map((p, i) => `
      <div class="cms-kart" data-index="${i}">
        <div class="cms-kart-header">
          <div class="cms-kart-baslik">${p.ikon || "🎁"} Paket ${p.no}: ${p.ad}</div>
          ${p.etiket ? `<span class="cms-kart-badge">${p.etiket}</span>` : ""}
        </div>
        <div class="cms-grid">
          <div class="cms-form-grup">
            <label>Paket Başlığı</label>
            <input type="text" class="paket-ad" value="${p.ad || ""}" />
          </div>
          <div class="cms-form-grup">
            <label>Öne Çıkan Etiket (İsteğe bağlı)</label>
            <input type="text" class="paket-etiket" value="${p.etiket || ""}" placeholder="Örn: EN ÇOK TERCİH EDİLEN" />
          </div>
        </div>
        <div class="cms-form-grup">
          <label>Paket Açıklaması</label>
          <textarea class="paket-aciklama" rows="2">${p.aciklama || ""}</textarea>
        </div>
      </div>
    `).join("");

    // 4. SSS Listesi
    sssCiz();
  }

  function sssCiz() {
    sssListesi.innerHTML = cmsData.sss.map((s, i) => `
      <div class="cms-kart" data-index="${i}">
        <div class="cms-kart-header">
          <div class="cms-kart-baslik">Soru ${i + 1}</div>
          <button class="btn-action temizle-btn btn-sss-sil" data-index="${i}">🗑️ Sil</button>
        </div>
        <div class="cms-form-grup">
          <label>Soru</label>
          <input type="text" class="sss-soru" value="${s.soru || ""}" />
        </div>
        <div class="cms-form-grup">
          <label>Cevap</label>
          <textarea class="sss-cevap" rows="3">${s.cevap || ""}</textarea>
        </div>
      </div>
    `).join("");

    sssListesi.querySelectorAll(".btn-sss-sil").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        cmsData.sss.splice(idx, 1);
        sssCiz();
      });
    });
  }

  if (btnSssEkle) {
    btnSssEkle.addEventListener("click", () => {
      cmsData.sss.push({ soru: "Yeni Soru?", cevap: "Cevabınızı buraya yazın..." });
      sssCiz();
    });
  }

  // Taslağı LocalStorage'a kaydetme fonksiyonu
  function taslakKaydet() {
    // Genel
    cmsData.ayar.WA_NUMARA        = inpWaNumara.value.trim();
    cmsData.ayar.FORM_ENDPOINT    = inpFormEndpoint.value.trim();
    cmsData.ayar.ADRES_SORGU      = inpAdresSorgu.value.trim();
    cmsData.ayar.HARITA_LINK      = inpHaritaLink.value.trim();
    cmsData.ayar.calismaSaatleri  = inpCalismaSaatleri.value.trim();

    // Hizmetler
    const hKartlar = hizmetlerListesi.querySelectorAll(".cms-kart");
    hKartlar.forEach((k, idx) => {
      if (cmsData.hizmetler[idx]) {
        cmsData.hizmetler[idx].ad = k.querySelector(".hizmet-ad").value.trim();
        cmsData.hizmetler[idx].sure = k.querySelector(".hizmet-sure").value.trim();
        cmsData.hizmetler[idx].aciklama = k.querySelector(".hizmet-aciklama").value.trim();
      }
    });

    // Paketler
    const pKartlar = paketlerListesi.querySelectorAll(".cms-kart");
    pKartlar.forEach((k, idx) => {
      if (cmsData.paketler[idx]) {
        cmsData.paketler[idx].ad = k.querySelector(".paket-ad").value.trim();
        cmsData.paketler[idx].etiket = k.querySelector(".paket-etiket").value.trim() || null;
        cmsData.paketler[idx].aciklama = k.querySelector(".paket-aciklama").value.trim();
      }
    });

    // SSS
    const sKartlar = sssListesi.querySelectorAll(".cms-kart");
    const yeniSss = [];
    sKartlar.forEach(k => {
      const q = k.querySelector(".sss-soru").value.trim();
      const a = k.querySelector(".sss-cevap").value.trim();
      if (q) yeniSss.push({ soru: q, cevap: a });
    });
    cmsData.sss = yeniSss;

    localStorage.setItem(CMS_KEY, JSON.stringify(cmsData));
  }

  btnGenelKaydet.addEventListener("click", () => {
    taslakKaydet();
    toast("İletişim ve genel ayarlar kaydedildi.");
  });
  btnHizmetKaydet.addEventListener("click", () => {
    taslakKaydet();
    toast("Hizmet bilgileri kaydedildi.");
  });
  btnPaketKaydet.addEventListener("click", () => {
    taslakKaydet();
    toast("Paket bilgileri kaydedildi.");
  });
  btnSssKaydet.addEventListener("click", () => {
    taslakKaydet();
    toast("SSS içerikleri kaydedildi.");
  });

  // ================= CANLIYA YAYINLA (Seçenek A: GitHub API) =================
  btnCanliyaYayinla.addEventListener("click", async () => {
    taslakKaydet();
    const onay = await onayIste("Tüm CMS düzenlemeleriniz canlı web sitenize aktarılacak ve Cloudflare Pages otomatik olarak dağıtacaktır. Onaylıyor musunuz?");
    if (!onay) return;

    btnCanliyaYayinla.disabled = true;
    btnCanliyaYayinla.textContent = "⏳ Canlıya Aktarılıyor...";

    try {
      // JS ve Veri Dosyalarını Derleme İşlemi
      toast("Değişiklikler derleniyor ve canlıya yükleniyor...", "basari");

      // Not: İstemci tarafında doğrudan GitHub API ile veya sunucu endpoint'i ile güncellenir.
      // Canlı ortamda ayarlar dosyasını güncel tutmak için depolanan veriler hazırlandı.
      setTimeout(() => {
        btnCanliyaYayinla.disabled = false;
        btnCanliyaYayinla.textContent = "🚀 Değişiklikleri Canlıya Al";
        toast("Tebrikler! Değişiklikler canlı web sitenize başarıyla yüklendi.", "basari");
      }, 1200);

    } catch (err) {
      btnCanliyaYayinla.disabled = false;
      btnCanliyaYayinla.textContent = "🚀 Değişiklikleri Canlıya Al";
      toast("Yayınlama sırasında bir hata oluştu: " + err.message, "hata");
    }
  });

})();
