/* ============================================================
   ADMİN & CMS PANELİ — Top Tamiri
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
  const sifreInput   = document.getElementById("sifreInput");
  const girisBtn     = document.getElementById("girisBtn");
  const gozBtn       = document.getElementById("gozBtn");
  const hataMesaj    = document.getElementById("hataMesaj");
  const denemeUyari  = document.getElementById("denemeUyari");
  let   mesajListesi = null;
  const onayKutu     = document.getElementById("onayKutu");
  const onayMetin    = document.getElementById("onayMetin");

  // CMS DOM Referansları (Panel enjekte edilince bağlanır)
  let btnCanliyaYayinla, btnGenelKaydet, btnHizmetKaydet, btnPaketKaydet, btnYorumKaydet, btnYorumEkle, btnSssKaydet, btnSssEkle;
  let inpWaNumara, inpFormEndpoint, inpAdresSorgu, inpAdresMetin, inpHaritaLink, inpHaftaIci, inpCumartesi, inpPazar, inpTurnstileKey;
  let hizmetlerListesi, paketlerListesi, yorumlarListesi, sssListesi, cikisBtn, yenileBtn, hepsiniSil, hepsiniOku, adminPanel;

  function domElemanlariniBagla() {
    adminPanel        = document.getElementById("adminPanel");
    btnCanliyaYayinla = document.getElementById("btnCanliyaYayinla");
    btnGenelKaydet    = document.getElementById("btnGenelKaydet");
    btnHizmetKaydet   = document.getElementById("btnHizmetKaydet");
    btnPaketKaydet    = document.getElementById("btnPaketKaydet");
    btnYorumKaydet    = document.getElementById("btnYorumKaydet");
    btnYorumEkle      = document.getElementById("btnYorumEkle");
    btnSssKaydet      = document.getElementById("btnSssKaydet");
    btnSssEkle        = document.getElementById("btnSssEkle");

    inpWaNumara       = document.getElementById("inpWaNumara");
    inpFormEndpoint   = document.getElementById("inpFormEndpoint");
    inpAdresSorgu     = document.getElementById("inpAdresSorgu");
    inpAdresMetin     = document.getElementById("inpAdresMetin");
    inpHaritaLink     = document.getElementById("inpHaritaLink");
    inpHaftaIci       = document.getElementById("inpHaftaIci");
    inpCumartesi      = document.getElementById("inpCumartesi");
    inpPazar          = document.getElementById("inpPazar");
    inpTurnstileKey   = document.getElementById("inpTurnstileKey");

    hizmetlerListesi  = document.getElementById("hizmetlerListesi");
    paketlerListesi   = document.getElementById("paketlerListesi");
    yorumlarListesi   = document.getElementById("yorumlarListesi");
    sssListesi        = document.getElementById("sssListesi");
    mesajListesi      = document.getElementById("mesajListesi");
    cikisBtn          = document.getElementById("cikisBtn");
    yenileBtn         = document.getElementById("yenileBtn");
    hepsiniSil        = document.getElementById("hepsiniSil");
    hepsiniOku        = document.getElementById("hepsiniOku");

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

    // Çıkış
    if (cikisBtn) {
      cikisBtn.addEventListener("click", () => {
        sDel(OTURUM_KEY);
        const konteyner = document.getElementById("panelKonteyner");
        if (konteyner) konteyner.innerHTML = "";
        girisEkrani.style.display = "flex";
        sifreInput.value = "";
      });
    }

    // Buton Dinleyicileri
    if (btnGenelKaydet) {
      btnGenelKaydet.addEventListener("click", () => { taslakKaydet(); toast("İletişim ve genel ayarlar kaydedildi."); });
    }
    if (btnHizmetKaydet) {
      btnHizmetKaydet.addEventListener("click", () => { taslakKaydet(); toast("Hizmet bilgileri kaydedildi."); });
    }
    if (btnPaketKaydet) {
      btnPaketKaydet.addEventListener("click", () => { taslakKaydet(); toast("Paket bilgileri kaydedildi."); });
    }
    if (btnYorumKaydet) {
      btnYorumKaydet.addEventListener("click", () => { taslakKaydet(); toast("Müşteri yorumları kaydedildi."); });
    }
    if (btnYorumEkle) {
      btnYorumEkle.addEventListener("click", () => {
        if (!cmsData.yorumlar) cmsData.yorumlar = [];
        cmsData.yorumlar.push({
          isim: "Yeni Müşteri",
          puan: 5,
          kaynak: "Google Haritalar",
          rozet: "Doğrulanmış",
          tur: "normal",
          metin: "Top tamiri konusundaki deneyiminizi buraya yazın...",
          etiket: "⚽ Top Onarımı"
        });
        yorumlarCiz();
      });
    }
    if (btnSssKaydet) {
      btnSssKaydet.addEventListener("click", () => { taslakKaydet(); toast("SSS içerikleri kaydedildi."); });
    }
    if (btnSssEkle) {
      btnSssEkle.addEventListener("click", () => {
        if (!cmsData.sss) cmsData.sss = [];
        cmsData.sss.push({ soru: "Yeni Soru?", cevap: "Cevabınızı buraya yazın..." });
        sssCiz();
      });
    }
    if (yenileBtn) {
      yenileBtn.addEventListener("click", () => { mesajlariYukle(); toast("Mesaj listesi güncellendi."); });
    }
    if (hepsiniSil) {
      hepsiniSil.addEventListener("click", async () => {
        const onay = await onayIste("TÜM mesajları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.");
        if (onay) { mesajlariKaydet([]); mesajlariYukle(); toast("Tüm mesajlar silindi."); }
      });
    }
    if (hepsiniOku) {
      hepsiniOku.addEventListener("click", () => {
        let list = mesajlariAl();
        list = list.map(x => ({ ...x, okundu: true }));
        mesajlariKaydet(list); mesajlariYukle();
        toast("Tüm mesajlar okundu olarak işaretlendi.");
      });
    }
    if (btnCanliyaYayinla) {
      btnCanliyaYayinla.addEventListener("click", canliyaYayinlaHandler);
    }
  }

  // Güvenlik: Sayfa yüklendiğinde F12 Console'dan içeriğe doğrudan erişimi engellemek için
  // şablon doğrulamadan önce açılmaz

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
    gozBtn.innerHTML = goster
      ? '<svg class="goz-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>'
      : '<svg class="goz-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
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

  function panelGoster() {
    girisEkrani.style.display = "none";
    const template = document.getElementById("panelSablonu");
    const konteyner = document.getElementById("panelKonteyner");
    if (template && konteyner) {
      konteyner.innerHTML = "";
      konteyner.appendChild(template.content.cloneNode(true));
      domElemanlariniBagla();
    }
    if (adminPanel) adminPanel.style.display = "block";
    try { mesajlariYukle(); } catch (e) { console.error("Mesajlar yüklenirken hata:", e); }
    try { cmsVerileriniYukle(); } catch (e) { console.error("CMS verileri yüklenirken hata:", e); }
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
    if (!mesajListesi) mesajListesi = document.getElementById("mesajListesi");
    if (!mesajListesi) return;

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
          <div class="mk-sablonlar">
            <span class="mk-sablon-baslik">⚡ Hızlı Yanıt Şablonları:</span>
            <div class="mk-sablon-butonlar">
              <button type="button" class="sablon-btn sablon-hazir" data-sablon="hazir" data-tel="${m.tel}" data-ad="${esc ? esc(m.ad) : m.ad}">✅ Teslime Hazır</button>
              <button type="button" class="sablon-btn sablon-fiyat" data-sablon="fiyat" data-tel="${m.tel}" data-ad="${esc ? esc(m.ad) : m.ad}">💰 Fiyat &amp; İşlem</button>
              <button type="button" class="sablon-btn sablon-basladi" data-sablon="basladi" data-tel="${m.tel}" data-ad="${esc ? esc(m.ad) : m.ad}">🛠️ Tamire Başlandı</button>
              <button type="button" class="sablon-btn sablon-foto" data-sablon="foto" data-tel="${m.tel}" data-ad="${esc ? esc(m.ad) : m.ad}">📸 Fotoğraf İste</button>
            </div>
          </div>
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

    // Hızlı WhatsApp Şablonları Dinleyicisi
    mesajListesi.querySelectorAll("[data-sablon]").forEach(btn => {
      btn.addEventListener("click", () => {
        const sablon = btn.getAttribute("data-sablon");
        const tel = btn.getAttribute("data-tel") || "";
        const ad = btn.getAttribute("data-ad") || "Müşterimiz";
        const hedefTel = waTel ? waTel(tel) : tel;
        let metin = "";

        if (sablon === "hazir") {
          metin = `Merhaba ${ad}, Top Tamiri'nden Kemal Usta. Topunuzun onarım ve bakımı başarıyla tamamlandı, testleri yapıldı. Atölyemizden teslim alabilirsiniz.\n📍 Adresimiz: Menekşe Pasajı Kızılay/Ankara.\n📞 İletişim: 0531 431 55 60`;
        } else if (sablon === "fiyat") {
          const girilen = prompt(`${ad} için yapılacak işlem ve fiyat bilgisini yazınız (Örn: İç lastik değişimi ve sibop onarımı 400 TL):`);
          if (!girilen) return;
          metin = `Merhaba ${ad}, topunuz Kemal Usta tarafından incelenmiştir. Yapılacak işlem ve fiyat bilgisi:\n👉 ${girilen}\n\nOnayınız doğrultusunda hemen tamir işlemine başlıyoruz. Teşekkürler, Top Tamiri.`;
        } else if (sablon === "basladi") {
          metin = `Merhaba ${ad}, topunuzun onarım işlemine Kemal Usta tarafından başlanmıştır. Tahmini 1-2 iş günü içerisinde hazır olduğunda size bilgi verilecektir.\nTeşekkürler, Top Tamiri.`;
        } else if (sablon === "foto") {
          metin = `Merhaba ${ad}, mesajınız için teşekkür ederiz. Kemal Usta'nın hasar tespiti yapabilmesi ve net fiyat verebilmesi için topun hasarlı bölgesinin ve markasının net bir fotoğrafını buradan gönderebilir misiniz?\nTeşekkürler, Top Tamiri.`;
        }

        if (metin && hedefTel) {
          const link = `https://wa.me/${hedefTel}?text=${encodeURIComponent(metin)}`;
          window.open(link, "_blank");
        }
      });
    });
  }

  // ================= CMS BÖLÜMÜ =================
  let cmsData = {
    ayar: {
      WA_NUMARA: ayar.WA_NUMARA || "905314315560",
      FORM_ENDPOINT: ayar.FORM_ENDPOINT || "",
      ADRES_SORGU: ayar.ADRES_SORGU || "Menekşe Pasajı, Kızılay, Ankara",
      ADRES_METIN: ayar.ADRES_METIN || "İzmir Cad. Menekşe Sok.\nMenekşe Pasajı Kızılay/ANKARA",
      HARITA_LINK: ayar.HARITA_LINK || "",
      haftaIci: "10:00 – 18:00",
      cumartesi: "Kapalı",
      pazar: "Kapalı"
    },
    calismaGunler: {
      1: ["10:00", "18:00"], 2: ["10:00", "18:00"], 3: ["10:00", "18:00"], 4: ["10:00", "18:00"], 5: ["10:00", "18:00"],
      6: null, 0: null,
    },
    hizmetler: JSON.parse(JSON.stringify(hizmetler)),
    paketler: JSON.parse(JSON.stringify(paketler)),
    yorumlar: (window.TS && window.TS.yorumlar) ? JSON.parse(JSON.stringify(window.TS.yorumlar)) : [
      {
        id: 1,
        isim: "Alperen K.",
        puan: 5,
        kaynak: "Google Haritalar",
        rozet: "Doğrulanmış",
        tur: "normal",
        metin: "Molten basketbol topumun sibop kaçırma sorunu vardı, başka yerler tamir edemeyiz yenisini al demişti. Kemal Usta 1 günde orijinal sibop takıp sıfır gibi teslim etti. 40 yıllık tecrübe gerçekten fark yaratıyor.",
        etiket: "🏀 Basketbol Topu Sibop Onarımı"
      },
      {
        id: 2,
        isim: "Murat H.",
        puan: 5,
        kaynak: "Kulüp Antrenörü",
        rozet: "Kulüp",
        tur: "kulup",
        metin: "Takımımızın 8 adet maç topunun dikiş açılmalarını ve basınç kayıplarını getirdik. Fabrika dikişi kalitesinde el işçiliğiyle onardı. Kulüp bütçemizi kurtardı, eline sağlık Kemal Usta.",
        etiket: "⚽ Çoklu Panel & El Dikişi Yenileme"
      },
      {
        id: 3,
        isim: "Burak D.",
        puan: 5,
        kaynak: "Google Haritalar",
        rozet: "Doğrulanmış",
        tur: "normal",
        metin: "Orijinal Adidas Şampiyonlar Ligi topum patlamıştı, atmaya kıyamıyordum. Kemal Bey iç lastiğini değiştirip su altı basınç testini gözümün önünde yaptı. Ankara'da bu işin tek ustası.",
        etiket: "🏆 İç Lastik Değişimi & Basınç Testi"
      },
      {
        id: 4,
        isim: "Selin Y.",
        puan: 5,
        kaynak: "Voleybolcu",
        rozet: "Doğrulanmış",
        tur: "normal",
        metin: "Mikasa voleybol topumun soyulan ve kalkan deri panellerini pürüzsüz yapıştırdı. Topun ağırlık dengesi ve yumuşaklığı hiç bozulmadı, çok teşekkürler Top Tamiri!",
        etiket: "🏐 Voleybol Deri Panel Onarımı"
      }
    ],
    sss: [
      { soru: "Tamir işlemi ne kadar sürer?", cevap: "Sibop değişimi ve basınç testi gibi basit işlemler genellikle aynı gün yapılır. Dikiş ve panel onarımları, hasarın durumuna göre 1–3 iş günü içinde tamamlanır." },
      { soru: "Hangi top markalarını tamir ediyorsunuz?", cevap: "Adidas, Nike, Puma, Select, Molten, Mikasa, Wilson, Spalding, Delta ve diğer tüm markaların futbol, basketbol ve voleybol toplarını onarıyoruz." },
      { soru: "Fiyat nasıl belirlenir?", cevap: "Hasarın durumuna (patlak, sibop, dikiş veya deri değişimi) göre işlem öncesi şeffaf fiyat bilgisi verilir. Onayınız olmadan tamire başlanmaz." },
      { soru: "Dükkâna gelmeden önce bilgi alabilir miyim?", cevap: "Topunuzun fotoğrafını WhatsApp hattımıza göndererek hasar durumu ve tahmini teslim süresi hakkında anında ön bilgi alabilirsiniz." }
    ]
  };

  function saatleriCoz(v) {
    if (!v || !Array.isArray(v)) return "Kapalı";
    return v[0] + " – " + v[1];
  }

  function saatAyraci(metin) {
    if (!metin || metin.toLowerCase().includes("kapal")) return null;
    const m = metin.match(/(\d{1,2}:\d{2})\s*[–\-]\s*(\d{1,2}:\d{2})/);
    return m ? [m[1], m[2]] : null;
  }

  // En güncel TS.ayar ve TS.CALISMA nesnesinden form alanlarını her zaman canlı doldur
  function cmsVerileriniSenkronizeEt() {
    if (window.TS && window.TS.ayar) {
      cmsData.ayar = { ...cmsData.ayar, ...window.TS.ayar };
    }
    if (window.TS && window.TS.CALISMA && window.TS.CALISMA.gunler) {
      cmsData.calismaGunler = window.TS.CALISMA.gunler;
    }
    if (window.TS && window.TS.hizmetler && window.TS.hizmetler.length) {
      cmsData.hizmetler = JSON.parse(JSON.stringify(window.TS.hizmetler));
    }
    if (window.TS && window.TS.paketler && window.TS.paketler.length) {
      cmsData.paketler = JSON.parse(JSON.stringify(window.TS.paketler));
    }
    if (window.TS && window.TS.yorumlar && window.TS.yorumlar.length) {
      cmsData.yorumlar = JSON.parse(JSON.stringify(window.TS.yorumlar));
    }
  }

  function cmsVerileriniYukle() {
    cmsVerileriniSenkronizeEt();

    // 1. Genel Ayarlar Formu
    if (inpWaNumara) inpWaNumara.value = cmsData.ayar.WA_NUMARA || "";
    if (inpFormEndpoint) inpFormEndpoint.value = cmsData.ayar.FORM_ENDPOINT || "";
    if (inpAdresSorgu) inpAdresSorgu.value = cmsData.ayar.ADRES_SORGU || "";
    if (inpAdresMetin) inpAdresMetin.value = cmsData.ayar.ADRES_METIN || "";
    if (inpHaritaLink) inpHaritaLink.value = cmsData.ayar.HARITA_LINK || "";
    if (inpTurnstileKey) inpTurnstileKey.value = cmsData.ayar.TURNSTILE_SITE_KEY || "";

    const gunler = cmsData.calismaGunler || {};
    if (inpHaftaIci) inpHaftaIci.value  = saatleriCoz(gunler[1] || gunler[2]);
    if (inpCumartesi) inpCumartesi.value = saatleriCoz(gunler[6]);
    if (inpPazar) inpPazar.value     = saatleriCoz(gunler[0]);

    // 2. Hizmetler Listesi
    if (!hizmetlerListesi) hizmetlerListesi = document.getElementById("hizmetlerListesi");
    const hDizi = (cmsData.hizmetler && cmsData.hizmetler.length) ? cmsData.hizmetler : ((window.TS && window.TS.hizmetler) || []);
    if (hizmetlerListesi && hDizi.length) {
      hizmetlerListesi.innerHTML = hDizi.map((h, i) => `
        <div class="cms-kart" data-index="${i}">
          <div class="cms-kart-header">
            <div class="cms-kart-baslik">${i + 1}. ${h.ad || ""}</div>
            <span class="cms-kart-badge">${(h.kategori || "").toUpperCase()}</span>
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
    }

    // 3. Paketler Listesi
    if (!paketlerListesi) paketlerListesi = document.getElementById("paketlerListesi");
    const pDizi = (cmsData.paketler && cmsData.paketler.length) ? cmsData.paketler : ((window.TS && window.TS.paketler) || []);
    if (paketlerListesi && pDizi.length) {
      paketlerListesi.innerHTML = pDizi.map((p, i) => `
        <div class="cms-kart" data-index="${i}">
          <div class="cms-kart-header">
            <div class="cms-kart-baslik">${p.ikon || "🎁"} Paket ${p.no || (i + 1)}: ${p.ad || ""}</div>
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
    }

    // 4. SSS Listesi
    sssCiz();

    // 5. Yorumlar Listesi
    yorumlarCiz();
  }

  function yorumlarCiz() {
    if (!yorumlarListesi) yorumlarListesi = document.getElementById("yorumlarListesi");
    if (!yorumlarListesi) return;
    const yDizi = (cmsData.yorumlar && cmsData.yorumlar.length) ? cmsData.yorumlar : ((window.TS && window.TS.yorumlar) || []);
    yorumlarListesi.innerHTML = yDizi.map((y, i) => `
      <div class="cms-kart" data-index="${i}">
        <div class="cms-kart-header">
          <div class="cms-kart-baslik">⭐ Yorum ${i + 1}: ${esc ? esc(y.isim || "Müşteri") : (y.isim || "Müşteri")}</div>
          <button class="btn-action temizle-btn btn-yorum-sil" data-index="${i}">🗑️ Sil</button>
        </div>
        <div class="cms-grid">
          <div class="cms-form-grup">
            <label>Müşteri / Kulüp Adı</label>
            <input type="text" class="yorum-isim" value="${esc ? esc(y.isim || "") : (y.isim || "")}" />
          </div>
          <div class="cms-form-grup">
            <label>Yıldız Puanı (1 - 5)</label>
            <select class="yorum-puan">
              <option value="5" ${y.puan === 5 ? "selected" : ""}>⭐⭐⭐⭐⭐ (5 Yıldız)</option>
              <option value="4" ${y.puan === 4 ? "selected" : ""}>⭐⭐⭐⭐ (4 Yıldız)</option>
              <option value="3" ${y.puan === 3 ? "selected" : ""}>⭐⭐⭐ (3 Yıldız)</option>
              <option value="2" ${y.puan === 2 ? "selected" : ""}>⭐⭐ (2 Yıldız)</option>
              <option value="1" ${y.puan === 1 ? "selected" : ""}>⭐ (1 Yıldız)</option>
            </select>
          </div>
        </div>
        <div class="cms-grid">
          <div class="cms-form-grup">
            <label>Kaynak / Unvan (Örn: Google Haritalar, Kulüp Antrenörü)</label>
            <input type="text" class="yorum-kaynak" value="${esc ? esc(y.kaynak || "") : (y.kaynak || "")}" />
          </div>
          <div class="cms-form-grup">
            <label>Rozet (Örn: Doğrulanmış, Kulüp)</label>
            <input type="text" class="yorum-rozet" value="${esc ? esc(y.rozet || "Doğrulanmış") : (y.rozet || "Doğrulanmış")}" />
          </div>
          <div class="cms-form-grup">
            <label>Müşteri Türü</label>
            <select class="yorum-tur">
              <option value="normal" ${y.tur !== "kulup" ? "selected" : ""}>Bireysel Müşteri</option>
              <option value="kulup" ${y.tur === "kulup" ? "selected" : ""}>Kulüp / Takım</option>
            </select>
          </div>
          <div class="cms-form-grup">
            <label>İşlem Etiketi (Örn: 🏀 Basketbol Sibop Onarımı)</label>
            <input type="text" class="yorum-etiket" value="${esc ? esc(y.etiket || "") : (y.etiket || "")}" />
          </div>
        </div>
        <div class="cms-form-grup">
          <label>Müşteri Yorum Metni</label>
          <textarea class="yorum-metin" rows="3">${esc ? esc(y.metin || "") : (y.metin || "")}</textarea>
        </div>
      </div>
    `).join("");

    yorumlarListesi.querySelectorAll(".btn-yorum-sil").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        cmsData.yorumlar.splice(idx, 1);
        yorumlarCiz();
      });
    });
  }

  function sssCiz() {
    if (!sssListesi) sssListesi = document.getElementById("sssListesi");
    if (!sssListesi) return;
    if (!Array.isArray(cmsData.sss) || !cmsData.sss.length) {
      cmsData.sss = [
        { soru: "Tamir işlemi ne kadar sürer?", cevap: "Sibop değişimi ve basınç testi gibi basit işlemler genellikle aynı gün yapılır. Dikiş ve panel onarımları, hasarın durumuna göre 1–3 iş günü içinde tamamlanır." },
        { soru: "Hangi top markalarını tamir ediyorsunuz?", cevap: "Adidas, Nike, Puma, Select, Molten, Mikasa, Wilson, Spalding, Delta ve diğer tüm markaların futbol, basketbol ve voleybol toplarını onarıyoruz." },
        { soru: "Fiyat nasıl belirlenir?", cevap: "Hasarın durumuna (patlak, sibop, dikiş veya deri değişimi) göre işlem öncesi şeffaf fiyat bilgisi verilir. Onayınız olmadan tamire başlanmaz." },
        { soru: "Dükkâna gelmeden önce bilgi alabilir miyim?", cevap: "Topunuzun fotoğrafını WhatsApp hattımıza göndererek hasar durumu ve tahmini teslim süresi hakkında anında ön bilgi alabilirsiniz." }
      ];
    }
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
    if (inpAdresMetin) cmsData.ayar.ADRES_METIN = inpAdresMetin.value.trim();
    cmsData.ayar.HARITA_LINK      = inpHaritaLink.value.trim();
    if (inpTurnstileKey) cmsData.ayar.TURNSTILE_SITE_KEY = inpTurnstileKey.value.trim();

    // Çalışma saatleri
    const hSaat = saatAyraci(inpHaftaIci.value.trim()) || ["10:00", "18:00"];
    const cSaat = saatAyraci(inpCumartesi.value.trim());
    const pSaat = saatAyraci(inpPazar.value.trim());

    cmsData.calismaGunler = {
      1: hSaat, 2: hSaat, 3: hSaat, 4: hSaat, 5: hSaat,
      6: cSaat,
      0: pSaat
    };

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

    // Yorumlar
    if (yorumlarListesi) {
      const yKartlar = yorumlarListesi.querySelectorAll(".cms-kart");
      const yeniYorumlar = [];
      yKartlar.forEach((k, idx) => {
        const isim = k.querySelector(".yorum-isim").value.trim();
        const puan = parseInt(k.querySelector(".yorum-puan").value, 10) || 5;
        const kaynak = k.querySelector(".yorum-kaynak").value.trim();
        const rozet = k.querySelector(".yorum-rozet").value.trim();
        const tur = k.querySelector(".yorum-tur").value;
        const etiket = k.querySelector(".yorum-etiket").value.trim();
        const metin = k.querySelector(".yorum-metin").value.trim();
        if (isim && metin) {
          yeniYorumlar.push({ id: idx + 1, isim, puan, kaynak, rozet, tur, metin, etiket });
        }
      });
      cmsData.yorumlar = yeniYorumlar;
    }

    localStorage.setItem(CMS_KEY, JSON.stringify(cmsData));
  }

  // ================= CANLIYA YAYINLA (Seçenek A: GitHub API) =================
  async function canliyaYayinlaHandler() {
    taslakKaydet();
    const onay = await onayIste("Tüm CMS düzenlemeleriniz GitHub repository'nize işlenecek ve Cloudflare Pages otomatik olarak canlıya aktaracaktır. Onaylıyor musunuz?");
    if (!onay) return;

    btnCanliyaYayinla.disabled = true;
    btnCanliyaYayinla.textContent = "⏳ Canlıya Aktarılıyor...";

    try {
      toast("Değişiklikler canlıya aktarılıyor, lütfen bekleyin...", "basari");

      // ayarlar.js içeriğini üret
      const yeniAyarlarJs = `/* ============================================================
   AYARLAR VE VERİ — Top Tamiri (CMS Tarafından Otomatik Üretildi)
   ============================================================ */
(function (TS) {
  "use strict";

  const ayar = ${JSON.stringify(cmsData.ayar, null, 2)};

  const CALISMA = {
    saatDilimi: "Europe/Istanbul",
    gunler: ${JSON.stringify(cmsData.calismaGunler || {}, null, 6)},
  };

  const KATEGORI_GORSEL = {
    futbol:      "images/ucl-ball.png",
    basketbol:   "images/delta-basketball.png",
    voleybol:    "images/mikasa-ball.png",
    profesyonel: "images/ucl-ball.png",
  };
  const KATEGORI_EMOJI = { futbol: "⚽", basketbol: "🏀", voleybol: "🏐", profesyonel: "🏅" };
  const KATEGORI_KISA = {
    futbol:      "Futbol",
    basketbol:   "Basketbol",
    voleybol:    "Voleybol",
    profesyonel: "Profesyonel Maç Topu",
  };
  const HASAR_IKON = {
    "Dikiş Patlağı":  "🧵",
    "Hava Kaçırma":   "💨",
    "Deri Soyulması": "🩹",
  };

  const hizmetler = ${JSON.stringify(cmsData.hizmetler, null, 2)};
  const paketler = ${JSON.stringify(cmsData.paketler, null, 2)};
  const yorumlar = ${JSON.stringify(cmsData.yorumlar || [], null, 2)};

  Object.assign(TS, { ayar, CALISMA, KATEGORI_GORSEL, KATEGORI_EMOJI, KATEGORI_KISA, HASAR_IKON, hizmetler, paketler, yorumlar });
})(window.TS = window.TS || {});
`;

      // GitHub API anahtarını local storage veya kullanıcı oturumundan al/sor
      let token = localStorage.getItem("sz_gh_token");
      if (!token) {
        token = prompt("Lütfen GitHub Personal Access Token (repo yetkili) giriniz:");
        if (token) {
          localStorage.setItem("sz_gh_token", token.trim());
        } else {
          throw new Error("GitHub erişim token'ı olmadan canlıya yükleme yapılamaz.");
        }
      }
      const apiUrl = "https://api.github.com/repos/erdoforever/tiryakispor/contents/js/ayarlar.js";
      const headers = {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      };

      // 1. Mevcut SHA'yı al
      const getRes = await fetch(apiUrl, { headers });
      if (!getRes.ok) throw new Error("GitHub bağlantı hatası (" + getRes.status + ")");
      const getJson = await getRes.json();
      const currentSha = getJson.sha;

      // 2. Base64 encode
      const utf8Bytes = new TextEncoder().encode(yeniAyarlarJs);
      let binStr = "";
      utf8Bytes.forEach(b => { binStr += String.fromCharCode(b); });
      const b64Content = btoa(binStr);

      // 3. GitHub API'ye PUT isteği
      const putRes = await fetch(apiUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: "CMS: Canli icerik guncellemesi (ayarlar.js)",
          content: b64Content,
          sha: currentSha,
          branch: "main"
        })
      });

      if (!putRes.ok) {
        const errData = await putRes.json().catch(() => ({}));
        throw new Error(errData.message || "Yükleme başarısız (" + putRes.status + ")");
      }

      btnCanliyaYayinla.disabled = false;
      btnCanliyaYayinla.textContent = "🚀 Değişiklikleri Canlıya Al";
      toast("Harika! Değişiklikler GitHub'a gönderildi, 1-2 dakika içinde Cloudflare Pages sitenizi günceller.", "basari");

    } catch (err) {
      btnCanliyaYayinla.disabled = false;
      btnCanliyaYayinla.textContent = "🚀 Değişiklikleri Canlıya Al";
      toast("Yayınlama sırasında bir hata oluştu: " + err.message, "hata");
    }
  }

})();
