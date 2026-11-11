/* ============================================================
   KAYDIRMA — tek scroll dinleyicisi + kaydırmaya bağlı efektler
   - navbar gölgesi, "yukarı çık" düğmesi, hero/kart toplarının dönmesi (rAF ile hafifletilmiş)
   - kategori ikonlarındaki toplar: kaydırmaya bağlı, yumuşak (lerp) dönme
   Diğer modüller (deste.js) kendi işlerini TS.kaydirmaEkle ile bu dinleyiciye ekler.
   ============================================================ */
(function (TS) {
  "use strict";
  const { $, azHareket } = TS;

  // ---- TEK SCROLL DİNLEYİCİSİ ----
  const islevler = [];
  const kaydirmaEkle = (fn) => islevler.push(fn);
  window.addEventListener("scroll", () => { islevler.forEach((fn) => fn()); }, { passive: true });

  // ---- NAVBAR, YUKARI ÇIK, TOP DÖNME EFEKTİ ----
  const navbar = $("navbar"), backToTop = $("backToTop");
  let heroToplar = [], kartToplar = [], scrollBekliyor = false;

  function topDonmeleriniGuncelle() {
    heroToplar = [...document.querySelectorAll(".spin-ball img")];
    kartToplar = [...document.querySelectorAll(".scroll-rotate-ball")];
    scrollGuncelle();
  }
  const dokunmatik = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  function scrollGuncelle() {
    scrollBekliyor = false;
    const y = window.scrollY;
    navbar.classList.toggle("scrolled", y > 50);
    backToTop.classList.toggle("goster", y > 400);
    if (azHareket) return;

    // Yalnızca hero ekrandayken hero toplarını döndür (boşuna CPU/GPU harcamaz)
    if (y < window.innerHeight + 100) {
      heroToplar.forEach((top, i) => {
        const faktor = (i % 2 === 0 ? 1 : -1) * (0.35 + (i % 3) * 0.15);
        top.style.transform = `rotate(${y * faktor}deg)`;
      });
    }

    // Dokunmatik telefonlarda gereksiz kart rotasyonunu kapatarak kaydırma kasmasını tamamen önle
    if (!dokunmatik && kartToplar.length && y > 200 && y < 3500) {
      const derece = (y * 0.45) % 360;
      kartToplar.forEach((top, i) => {
        top.style.transform = `rotate(${(i % 2 === 0 ? 1 : -1) * derece * 0.6}deg)`;
      });
    }
  }
  kaydirmaEkle(() => {
    if (!scrollBekliyor) { scrollBekliyor = true; requestAnimationFrame(scrollGuncelle); }
  });

  backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  // ---- KATEGORİ İKONLARINDAKİ TOPLAR: scroll'a bağlı, yumuşak dönme ----
  // Hedef açı scroll'dan hesaplanır, top ona yumuşakça yetişir (lerp). Sadece ekrandaki toplar işlenir
  // ve scroll durup top hedefe varınca animasyon döngüsü kendiliğinden durur (boşta işlemci yemez).
  const ikonToplar = [...document.querySelectorAll(".kategori-icon img")].map((el, i) => ({
    el, yon: i % 2 === 0 ? 1 : -1, aci: 0, gorunur: false,
  }));
  let ikonDongusu = false;

  function ikonHedef(t) { return window.scrollY * 0.3 * t.yon; }

  function ikonAdim() {
    let devam = false;
    for (const t of ikonToplar) {
      if (!t.gorunur) continue;
      const fark = ikonHedef(t) - t.aci;
      if (Math.abs(fark) < 0.05) { t.aci += fark; }
      else { t.aci += fark * 0.12; devam = true; }
      t.el.style.transform = `rotate(${t.aci.toFixed(2)}deg)`;
    }
    if (devam) requestAnimationFrame(ikonAdim);
    else ikonDongusu = false;
  }
  function ikonDongusunuBaslat() {
    if (azHareket || ikonDongusu) return;
    ikonDongusu = true;
    requestAnimationFrame(ikonAdim);
  }
  if (ikonToplar.length && !azHareket && "IntersectionObserver" in window) {
    const ikonGozlem = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const t = ikonToplar.find((x) => x.el.parentElement === en.target);
        if (!t) return;
        t.gorunur = en.isIntersecting;
        if (t.gorunur) { t.aci = ikonHedef(t); t.el.style.transform = `rotate(${t.aci.toFixed(2)}deg)`; }
      });
    }, { rootMargin: "100px" });
    ikonToplar.forEach((t) => ikonGozlem.observe(t.el.parentElement));
    kaydirmaEkle(ikonDongusunuBaslat);
  }

  TS.kaydirmaEkle = kaydirmaEkle;
  TS.kaydirma = { topDonmeleriniGuncelle };
})(window.TS = window.TS || {});
