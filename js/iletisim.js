/* ============================================================
   İLETİŞİM KISAYOLLARI
   - Çalışma saatleri kartı + "şu an açık / kapalı" rozeti   (veri: ayarlar.js → CALISMA)
   - "Yol tarifi" bağlantıları                                (veri: ayarlar.js → ADRES_SORGU, HARITA_LINK)
   - Telefondaki alt çubuk: form alanına yazarken gizlenir
   index.html'deki saat yazıları ve yol tarifi adresleri yalnızca JS çalışmazsa görünen yedeklerdir.
   ============================================================ */
(function (TS) {
  "use strict";
  const { $, ayar, CALISMA } = TS;

  const GUN_ADI = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const INGILIZCE_GUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const HAFTA = [1, 2, 3, 4, 5, 6, 0];                  // hafta Pazartesi'den başlar

  // ---- YOL TARİFİ VE ADRES METNİ ----
  function yolTarifiBagla() {
    const link = ayar.HARITA_LINK || "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(ayar.ADRES_SORGU);
    document.querySelectorAll("[data-yol-tarifi]").forEach((a) => { a.href = link; });
    const adresEl = document.getElementById("iletisimAdresMetin");
    if (adresEl && ayar.ADRES_METIN) {
      adresEl.innerHTML = ayar.ADRES_METIN.replace(/\n/g, "<br/>");
    }
  }

  // ---- ÇALIŞMA SAATLERİ ----
  const dakika = (s) => { const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s); return m ? (+m[1]) * 60 + (+m[2]) : null; };

  // Tablodaki günün saatleri: { acilis, kapanis (dakika), metin: ["09:00", "18:00"] }; kapalı, tanımsız ya da bozuksa null
  function gunSaati(gun) {
    const v = CALISMA && CALISMA.gunler && CALISMA.gunler[gun];
    if (!Array.isArray(v)) return null;
    const acilis = dakika(v[0]), kapanis = dakika(v[1]);
    return acilis !== null && kapanis !== null && acilis < kapanis ? { acilis, kapanis, metin: [v[0], v[1]] } : null;
  }
  const veriVar = () => !!(CALISMA && CALISMA.gunler && Object.keys(CALISMA.gunler).length);

  // Şu an, çalışma saatlerinin geçerli olduğu saat diliminde (varsayılan Europe/Istanbul): { gun: 0-6, dk: gün içindeki dakika }
  function simdi() {
    const t = new Date();
    try {
      const p = {};
      new Intl.DateTimeFormat("en-US", {
        timeZone: (CALISMA && CALISMA.saatDilimi) || "Europe/Istanbul",
        weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).formatToParts(t).forEach((x) => { p[x.type] = x.value; });
      const gun = INGILIZCE_GUN.indexOf(p.weekday);
      if (gun < 0) throw new Error("gün okunamadı");
      return { gun, dk: (+p.hour % 24) * 60 + (+p.minute) };
    } catch {
      return { gun: t.getDay(), dk: t.getHours() * 60 + t.getMinutes() };   // eski tarayıcı: cihazın kendi saati
    }
  }

  // { durum: "acik" | "yakin" | "kapali", metin }
  // Sayıya ek getirmemek için ("18:00'e" mi "18:00'a" mı?) cümleler "Kapanış 18:00", "Açılış yarın 09:00" biçimindedir.
  function durumHesapla(s) {
    const bugun = gunSaati(s.gun);
    if (bugun && s.dk >= bugun.acilis && s.dk < bugun.kapanis) {
      const kalan = bugun.kapanis - s.dk;
      return kalan <= 60
        ? { durum: "yakin", metin: `Şu an açık · ${kalan} dk sonra kapanır` }
        : { durum: "acik", metin: `Şu an açık · Kapanış ${bugun.metin[1]}` };
    }
    for (let i = 0; i < 8; i++) {                       // sıradaki açılışı bul (bugün dahil, 8. adım = gelecek hafta aynı gün)
      const gun = (s.gun + i) % 7, g = gunSaati(gun);
      if (!g || (i === 0 && s.dk >= g.acilis)) continue;   // bugün zaten kapandıysa sonraki güne bak
      const ne = i === 0 ? "bugün" : i === 1 ? "yarın" : GUN_ADI[gun];
      return { durum: "kapali", metin: `Şu an kapalı · Açılış ${ne} ${g.metin[0]}` };
    }
    return { durum: "kapali", metin: "Şu an kapalı" };
  }

  // Ardışık günlerden aynı saate sahip olanları tek satırda toplar: [{ gunler: [1,2,3,4,5], saat: "09:00 – 18:00" | null }, …]
  function gruplar() {
    const liste = [];
    HAFTA.forEach((gun) => {
      const g = gunSaati(gun), saat = g ? `${g.metin[0]} – ${g.metin[1]}` : null, son = liste[liste.length - 1];
      if (son && son.saat === saat) son.gunler.push(gun);
      else liste.push({ gunler: [gun], saat });
    });
    return liste;
  }
  function gunEtiketi(gunler) {
    const anahtar = gunler.join(",");
    if (gunler.length === 7) return "Her gün";
    if (anahtar === "1,2,3,4,5") return "Hafta içi";
    if (anahtar === "6,0") return "Hafta sonu";
    if (gunler.length === 1) return GUN_ADI[gunler[0]];
    return `${GUN_ADI[gunler[0]]} – ${GUN_ADI[gunler[gunler.length - 1]]}`;
  }

  function kartiYaz(s) {
    const kap = $("saatListe");
    kap.textContent = "";
    gruplar().forEach((g) => {
      const satir = document.createElement("p"), gun = document.createElement("span"), saat = document.createElement("span");
      satir.className = "saat-satir";
      gun.className = "gun"; gun.textContent = gunEtiketi(g.gunler);
      saat.className = g.saat ? "saat" : "saat kapali"; saat.textContent = g.saat || "Kapalı";
      satir.append(gun, " ", saat);               // aradaki boşluk yalnızca metin okuyucular için (flex düzeninde görünmez)
      if (g.gunler.includes(s.gun)) { satir.classList.add("bugun"); satir.setAttribute("aria-current", "date"); }
      kap.append(satir);
    });
  }
  function altbilgiyiYaz() {
    const el = $("altbilgiSaat");
    el.textContent = "";
    gruplar().forEach((g, i) => {
      if (i) el.append(document.createElement("br"));
      el.append(`${i ? "" : "🕐 "}${gunEtiketi(g.gunler)} ${g.saat || "kapalı"}`);
    });
  }
  function rozetiYaz(d) {
    const r = $("acikRozet");
    r.dataset.durum = d.durum;
    r.textContent = d.metin;
    r.hidden = false;
  }

  function saatleriBagla() {
    if (!veriVar()) return;                             // veri yoksa HTML'deki yazı kalır, rozet çıkmaz
    const guncelle = () => { const s = simdi(); kartiYaz(s); rozetiYaz(durumHesapla(s)); };
    guncelle();
    altbilgiyiYaz();
    setInterval(guncelle, 30000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) guncelle(); });
  }

  // ---- TELEFONDAKİ ALT ÇUBUK ----
  // Form alanına yazarken ekran klavyesiyle birlikte çubuk da alanın üstüne binmesin diye gizlenir.
  function altCubukBagla() {
    const cubuk = $("altCubuk");
    const alanMi = (el) => !!(el && el.matches && el.matches("input, textarea, select"));
    let bekleme;
    document.addEventListener("focusin", (e) => {
      if (alanMi(e.target)) { clearTimeout(bekleme); cubuk.classList.add("gizli"); }
    });
    document.addEventListener("focusout", () => {
      clearTimeout(bekleme);
      bekleme = setTimeout(() => { if (!alanMi(document.activeElement)) cubuk.classList.remove("gizli"); }, 80);   // alanlar arası geçişte titremesin
    });
  }

  function bagla() {
    yolTarifiBagla();
    saatleriBagla();
    altCubukBagla();
  }

  TS.iletisim = { bagla };
})(window.TS = window.TS || {});
