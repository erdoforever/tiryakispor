/* ============================================================
   HİZMET YIĞINI (DESTE) — kartlar deste gibi üst üste durur, üzerine gelince dağıtılır
   Kurallar: yalnızca fare olan geniş ekranlarda ve filtre/arama yokken deste kapalı başlar.
   Telefonda ya da filtre seçiliyken kartlar hep açıktır.
   ============================================================ */
(function (TS) {
  "use strict";
  const { $, azHareket, durum } = TS;

  const yiginEl = $("hizmetYigin"), yiginGrid = $("hizmetGrid");
  const YIGIN_KATMAN = 5;     // desteden görünen katman sayısı
  const YIGIN_ADIM   = 9;     // her katmanın aşağı kayma payı (px)
  const YIGIN_IPUCU  = 58;    // ipucu yazısı için boşluk (px)
  const YIGIN_ACI    = 1.8;   // yelpaze açısı (derece / katman)
  const yiginFare = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 769px)");
  const yigin = { etkin: false, acik: true, iceride: false, kilit: 0, zaman: 0, bitis: 0, yenidenAc: 0, zZaman: [] };

  const yiginKartlar = () => [...yiginGrid.children];
  const filtreVar = () =>
    durum.kategori !== "tumu" || durum.marka !== "tumu" || durum.hasar !== "tumu" || durum.arama !== "";

  // ---- KONUM ----
  // Kapalı deste alanı: bir kart + katman payları + ipucu. (Grid'e hiç yükseklik verilmez.)
  function yiginKapaliYukseklik() {
    const k = yiginGrid.firstElementChild;
    return k ? k.offsetHeight + YIGIN_KATMAN * YIGIN_ADIM + YIGIN_IPUCU : 0;
  }
  // Her kartın deste konumu: grid'in ortası, üst kenar; arkadakiler hafif kaymış ve yelpaze gibi dönmüş
  function yiginKapaliPozisyon() {
    const orta = yiginGrid.clientWidth / 2;
    yiginKartlar().forEach((k, i) => {
      const kat = Math.min(i, YIGIN_KATMAN), yon = kat % 2 ? 1 : -1;
      k.style.setProperty("--dx", `${orta - (k.offsetLeft + k.offsetWidth / 2) + yon * kat * 6}px`);
      k.style.setProperty("--dy", `${kat * YIGIN_ADIM - k.offsetTop}px`);
      k.style.setProperty("--rot", `${yon * kat * YIGIN_ACI}deg`);
      k.style.zIndex = 30 - i;
    });
  }
  function yiginAcikPozisyon() {
    yiginKartlar().forEach(k => ["--dx", "--dy", "--rot"].forEach(v => k.style.removeProperty(v)));
  }
  function yiginSinif(acik) {
    yiginEl.classList.toggle("yigin-acik", acik);
    yiginEl.classList.toggle("yigin-kapali", !acik);
  }
  // Kapalıyken içerideki linkler sekme sırasına girmesin; deste bir düğme gibi davransın
  function yiginErisim() {
    const acikGibi = yigin.acik || !yigin.etkin;
    yiginKartlar().forEach(k => k.querySelectorAll("a").forEach(a => { a.tabIndex = acikGibi ? 0 : -1; }));
    if (yigin.etkin && !yigin.acik) {
      yiginEl.setAttribute("role", "button");
      yiginEl.tabIndex = 0;
      yiginEl.setAttribute("aria-expanded", "false");
      yiginEl.setAttribute("aria-label", `${yiginKartlar().length} hizmeti göster`);
    } else {
      ["role", "tabindex", "aria-expanded", "aria-label"].forEach(a => yiginEl.removeAttribute(a));
    }
  }

  // ---- DAĞITMA EFEKTİ (Web Animations API) ----
  const YIGIN_AC_TOPLAM = 1800;     // tüm kartların dağıtılma süresi (ms)
  const YIGIN_AC_KART   = 1000;     // tek kartın uçuş süresi (ms)
  const YIGIN_KP_TOPLAM = 1300;     // toplanma süresi (ms)
  const YIGIN_KP_KART   = 800;
  // Çok sayıda kart varken (12 hizmet gibi) hepsi aynı anda uçarsa düşük güçlü cihazlarda kasma olabilir.
  // Yalnızca ilk YIGIN_GORKEMLI kart "uçuşlu" (Web Animations API) açılır/kapanır; geri kalanı
  // .hizmet-kart'ın zaten var olan, çok daha ucuz olan düz CSS transform geçişiyle (0.3s) yerine gider.
  const YIGIN_GORKEMLI = 6;

  const yiginVar = (k, ad) => parseFloat(k.style.getPropertyValue(ad)) || 0;
  const yiginTr = (x, y, r, sc = 1) => `translate(${x}px, ${y}px) rotate(${r}deg) scale(${sc})`;

  // Fırlat: desteden kalkar, havada bir tur döner, yerine hafif sekerek oturur
  // Not: kareler yalnızca transform kullanır (box-shadow animasyonu kasmaya yol açtığı için kaldırıldı —
  // transform/opacity GPU'da birleştirilir, box-shadow her karede yeniden boyama gerektirir).
  function yiginFirlatKare(b, i) {
    const yon = i % 2 === 0 ? 1 : -1;
    return [
      { offset: 0,    transform: yiginTr(b.dx, b.dy, b.rot, 1) },
      { offset: 0.42, transform: yiginTr(b.dx * 0.38, b.dy * 0.38 - 80, yon * 190, 1.1) },
      { offset: 0.76, transform: yiginTr(0, 12, yon * 352, 1.02) },
      { offset: 0.9,  transform: yiginTr(0, -5, yon * 362, 1) },
      { offset: 1,    transform: yiginTr(0, 0, yon * 360, 1) },
    ];
  }
  // Topla: aynı hareketin tersi
  function yiginToplaKare(b, i) {
    const yon = i % 2 === 0 ? 1 : -1;
    return [
      { offset: 0,    transform: yiginTr(0, 0, 0, 1) },
      { offset: 0.24, transform: yiginTr(0, -5, yon * -8, 1) },
      { offset: 0.58, transform: yiginTr(b.dx * 0.62, b.dy * 0.62 - 80, yon * -170, 1.1) },
      { offset: 1,    transform: yiginTr(b.dx, b.dy, b.rot - yon * 360, 1) },
    ];
  }
  const yiginIptal = () => {
    (yigin.zZaman || []).forEach(clearTimeout); yigin.zZaman = [];
    yiginKartlar().forEach(k => k.getAnimations().forEach(a => a.cancel()));
  };
  // Uçan kart başlarken en üste çıkar (inenlerin üstünden geçer), bitince katmanını geri alır
  function yiginKatman(k, anim, bas, ucus, son) {
    yigin.zZaman.push(setTimeout(() => { k.style.zIndex = ucus; }, bas));
    anim.addEventListener("finish", () => { k.style.zIndex = son; });
  }

  // ---- AÇ / KAPAT / KUR ----
  function yiginAc() {
    if (!yigin.etkin || yigin.acik) return;
    clearTimeout(yigin.bitis); clearTimeout(yigin.yenidenAc);
    yigin.acik = true;
    const kartlar = yiginKartlar(), n = kartlar.length;
    const bas = kartlar.map(k => ({ dx: yiginVar(k, "--dx"), dy: yiginVar(k, "--dy"), rot: yiginVar(k, "--rot") }));
    const adim = n > 1 ? (YIGIN_AC_TOPLAM - YIGIN_AC_KART) / (n - 1) : 0;

    yiginIptal();
    yiginEl.style.transitionDelay = "0s";
    yiginEl.style.height = yiginKapaliYukseklik() + "px";
    void yiginEl.offsetHeight;
    yiginEl.style.height = yiginGrid.offsetHeight + "px";   // alan hemen açılır, kartlar uçarak gelir
    yiginAcikPozisyon();
    yiginSinif(true);
    yiginErisim();

    kartlar.forEach((k, i) => {
      k.style.zIndex = 30 - i;                              // bekleyenler deste sırasında kalır (en üstte ilk kart)
      if (azHareket || i >= YIGIN_GORKEMLI) { k.style.zIndex = ""; return; }
      const anim = k.animate(yiginFirlatKare(bas[i], i), {
        duration: YIGIN_AC_KART, delay: i * adim, easing: "cubic-bezier(0.3, 0.1, 0.3, 1)", fill: "backwards",
      });
      yiginKatman(k, anim, i * adim, 100 + i, "");
    });
    yigin.bitis = setTimeout(() => {
      if (!yigin.acik) return;
      yiginEl.style.height = "";
      kartlar.forEach(k => { k.style.zIndex = ""; });
    }, azHareket ? 0 : YIGIN_AC_TOPLAM + 120);
  }

  function yiginKapat() {
    if (!yigin.etkin || !yigin.acik) return;
    clearTimeout(yigin.bitis); clearTimeout(yigin.yenidenAc);
    yigin.acik = false;
    const toplam = azHareket ? 0 : YIGIN_KP_TOPLAM;
    yigin.kilit = performance.now() + toplam;
    const kartlar = yiginKartlar(), n = kartlar.length;
    const adim = n > 1 ? (YIGIN_KP_TOPLAM - YIGIN_KP_KART) / (n - 1) : 0;

    yiginIptal();
    yiginEl.style.height = yiginGrid.offsetHeight + "px";   // açık yüksekliği px olarak sabitle
    void yiginEl.offsetHeight;
    yiginKapaliPozisyon();                                  // son (deste) konum + z-sırası
    kartlar.forEach((k, i) => {
      if (azHareket || i >= YIGIN_GORKEMLI) return;
      const b = { dx: yiginVar(k, "--dx"), dy: yiginVar(k, "--dy"), rot: yiginVar(k, "--rot") };
      const bekle = (n - 1 - i) * adim;                     // sondaki kart önce toplanır
      const anim = k.animate(yiginToplaKare(b, i), {
        duration: YIGIN_KP_KART, delay: bekle, easing: "cubic-bezier(0.3, 0.1, 0.3, 1)", fill: "backwards",
      });
      yiginKatman(k, anim, bekle, 100 + (n - 1 - i), 30 - i);
    });
    yiginEl.style.transitionDelay = Math.max(0, toplam - 380) + "ms";   // kartlar toplanınca alan küçülür
    yiginEl.style.height = yiginKapaliYukseklik() + "px";
    yiginSinif(false);
    yiginErisim();
    // Toplanırken fare tekrar deste üstüne geldiyse, toplanma bitince yeniden dağıt
    yigin.yenidenAc = setTimeout(() => { if (!yigin.acik && yigin.iceride) yiginAc(); }, toplam + 40);
  }

  // Liste her çizildiğinde (ve filtre/ekran değişince) desteyi yeniden kur
  function yiginKur() {
    clearTimeout(yigin.bitis); clearTimeout(yigin.yenidenAc);
    yiginIptal();
    const n = yiginKartlar().length;
    yigin.etkin = n >= 2 && yiginFare.matches && !filtreVar();
    yiginEl.querySelectorAll("[data-n]").forEach(e => { e.textContent = n; });
    yiginEl.classList.add("yigin-hazirlik");               // geçişsiz, anında yerleştir
    yiginEl.style.transitionDelay = "0s";
    yiginKartlar().forEach(k => k.style.setProperty("--d", "0s"));
    if (!yigin.etkin) {
      yigin.acik = true;
      yiginAcikPozisyon();
      yiginKartlar().forEach(k => { k.style.zIndex = ""; });
      yiginEl.style.height = "";
      yiginSinif(true);
    } else {
      yigin.acik = false;
      yiginKapaliPozisyon();
      yiginEl.style.height = yiginKapaliYukseklik() + "px";
      yiginSinif(false);
    }
    yiginErisim();
    void yiginEl.offsetHeight;
    yiginEl.classList.remove("yigin-hazirlik");
  }

  // ---- OLAYLAR ----
  // Fare: desteye gelince aç; alandan çıkınca (kısa gecikmeyle) topla
  function yiginKapatDene() {
    if (!yigin.acik || yigin.iceride) return;
    // Kullanıcı açık listenin içinde aşağıda geziniyorsa kapatma: sayfa zıplamasın
    if (yiginEl.getBoundingClientRect().top < 0) return;
    clearTimeout(yigin.zaman);
    yigin.zaman = setTimeout(() => { if (!yigin.iceride) yiginKapat(); }, 180);
  }
  yiginEl.addEventListener("pointerover", e => {
    if (e.pointerType === "touch" || yigin.acik) return;
    if (e.target.closest(".hizmet-kart") && performance.now() > yigin.kilit) yiginAc();
  });
  yiginEl.addEventListener("pointerenter", () => { yigin.iceride = true; clearTimeout(yigin.zaman); });
  yiginEl.addEventListener("pointerleave", e => {
    yigin.iceride = false;
    if (e.pointerType !== "touch") yiginKapatDene();
  });
  TS.kaydirmaEkle(() => { if (yigin.acik && !yigin.iceride) yiginKapatDene(); });

  // Klavye / tıklama (hem fareli hem hibrit cihazlar için yedek)
  yiginEl.addEventListener("click", e => {
    if (!yigin.acik && yigin.etkin && e.target.closest(".hizmet-kart")) { e.preventDefault(); yiginAc(); }
  });
  yiginEl.addEventListener("keydown", e => {
    if (!yigin.acik && yigin.etkin && e.target === yiginEl && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault(); yiginAc();
    }
  });
  // Esc: açık deste nerede olursa olsun (odak kartlara kayabilir) toplanır
  TS.escEkle(() => {
    if (yigin.etkin && yigin.acik) { yigin.iceride = false; yiginKapat(); }
  });

  // Fare takılıp çıkarsa / ekran yönü değişirse deste yeniden kurulur
  if (yiginFare.addEventListener) yiginFare.addEventListener("change", yiginKur);

  // Ekran boyutu ya da yazı tipi yüklenince kart ölçüleri değişir: kapalı desteyi yeniden hizala
  if ("ResizeObserver" in window) {
    let bekliyor = false;
    new ResizeObserver(() => {
      if (!yigin.etkin || yigin.acik || bekliyor) return;
      bekliyor = true;
      requestAnimationFrame(() => {
        bekliyor = false;
        if (!yigin.etkin || yigin.acik) return;
        yiginEl.classList.add("yigin-hazirlik");
        yiginKapaliPozisyon();
        yiginEl.style.height = yiginKapaliYukseklik() + "px";
        void yiginEl.offsetHeight;
        yiginEl.classList.remove("yigin-hazirlik");
      });
    }).observe(yiginGrid);
  }

  TS.deste = { kur: yiginKur };
})(window.TS = window.TS || {});
