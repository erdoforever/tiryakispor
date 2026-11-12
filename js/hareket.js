/* ============================================================
   HAREKET (GSAP) — TiryakiSPOR
   1) Açılış (giriş) animasyonu: tek sefer, yumuşak belirme
   2) Hero → Kategoriler katman geçişi: hero sabit kalır, bölüm üstüne biner
   Gereken: gsap + ScrollTrigger (index.html'de cdnjs'ten yüklenir).
   Yüklenemezse / "hareketi azalt" açıksa her şey animasyonsuz, tam görünür çalışır.
   ============================================================ */
(() => {
  "use strict";

  const kok = document.documentElement;
  const q = (s) => document.querySelector(s);
  const azHareket = window.TS ? window.TS.azHareket : window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Gizleme sınıfını kaldır = hero öğeleri CSS'te görünür hale gelir
  const gorunurYap = () => kok.classList.remove("giris-bekle");

  // Hareket azaltılmışsa: hiçbir şey animasyonlanmaz
  if (azHareket) {
    gorunurYap();
    return;
  }

  // Bazı ortamlar (ör. Claude uygulamasındaki önizleme) dış script'leri satır içi script'lerden SONRA
  // yükleyebilir; bu yüzden GSAP gelene kadar kısa aralıklarla bekleyip sonra başlıyoruz.
  const gsapHazir = () => typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
  function gsapBekle(devam) {
    if (gsapHazir()) return devam();
    const bitis = Date.now() + 8000;                       // 8 sn içinde gelmezse animasyonsuz devam
    const zamanlayici = setInterval(() => {
      if (gsapHazir()) { clearInterval(zamanlayici); devam(); }
      else if (Date.now() > bitis) { clearInterval(zamanlayici); gorunurYap(); }
    }, 40);
  }

  function basla() {
  gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------------
     1) AÇILIŞ ANİMASYONU  (Sayfa açılışında akıcı, tek parça Fade-In)
     Tek tek eleman hesaplamak yerine bütünsel ve pürüzsüz görünüm sağlar.
     ------------------------------------------------------------ */
  function girisAnimasyonu() {
    const hedefler = [q("#navbar"), q("#hero")].filter(Boolean);
    gorunurYap();
    gsap.fromTo(
      hedefler,
      { opacity: 0 },
      {
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
        clearProps: "opacity",
      }
    );
  }

  // En kısa sürede yumuşak fade-in ile başlat
  requestAnimationFrame(() => {
    girisAnimasyonu();
  });

  // Yazı tipleri ve görseller oturunca ölçüleri bir kez güncelle (görünür sıçrama olmasın)
  const yenile = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(yenile);
  window.addEventListener("load", yenile, { once: true });
  } // basla()

  gsapBekle(basla);
})();
