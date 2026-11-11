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

  /* ------------------------------------------------------------
     2) KATMAN GEÇİŞİ  (hero sabit, "Kategoriler" bölümü üstüne biner)
     - Hero pinlenir (pinSpacing:false): sayfa kaydırması bölümü doğal olarak
       yukarı taşır, hero altta kalır ve tamamen örtülür.
     - Kaydırmaya bağlı (scrub): yukarı kaydırınca birebir geri açılır.
     - Hero ekrana sığmıyorsa içeriği kesilmesin diye alt kenarından sabitlenir.
     - Telefon/tablet (dar veya dokunmatik): sabitleme yok, basit belirme.
     ------------------------------------------------------------ */
  const mm = gsap.matchMedia();

  // Fare kullanılan cihazlar (masaüstü/laptop, dar pencere ya da yan panel dahil): tam sinematik katman geçişi.
  // Not: genişliğe bakmıyoruz; Claude uygulamasındaki dar önizleme paneli de bu efekti görsün diye.
  mm.add("not ((pointer: coarse) and (hover: none))", () => {
    const hero = q("#hero");
    const icerik = q("#hero .hero-content");
    if (!hero || !icerik || !q("#kategoriler")) return;

    // Hero'nun örtülürken kararması için katman (yalnızca opacity animasyonu)
    const karartma = document.createElement("div");
    karartma.className = "hero-karartma";
    karartma.setAttribute("aria-hidden", "true");
    hero.appendChild(karartma);

    const sigar = () => hero.offsetHeight <= window.innerHeight + 2;

    // Hero tamamen örtüldüğünde gizle: görünmez hero'daki düğmelere Tab ile odaklanılmasın.
    // Aynı anda dönen toplar / parıltı animasyonunu durdurup gereksiz işlemci kullanımını keser.
    const ortuGuncelle = (self) => {
      const ortuldu = self.progress >= 1;
      hero.style.visibility = ortuldu ? "hidden" : "";
      hero.classList.toggle("hero-gizlendi", ortuldu);
    };

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: hero,
        pin: hero,
        pinSpacing: false,                 // bölüm normal akışta üstüne biner, boşluk eklenmez
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,         // yazı tipi/boyut değişince yeniden hesapla
        onUpdate: ortuGuncelle,
        onRefresh: ortuGuncelle,
        start: () => (sigar() ? "top top" : "bottom bottom"),
        end: () => "+=" + (sigar() ? hero.offsetHeight : window.innerHeight),
      },
    });
    tl.to(icerik, { scale: 0.96, yPercent: -4, transformOrigin: "50% 40%" }, 0)
      .to(karartma, { opacity: 0.7 }, 0);

    return () => { karartma.remove(); hero.style.visibility = ""; hero.classList.remove("hero-gizlendi"); };   // koşul bozulursa temizle
  });

  // Telefon / tablet (dokunmatik): sabitleme yok, yumuşak yukarı kayma + belirme
  mm.add("(pointer: coarse) and (hover: none)", () => {
    const baslik = q("#kategoriler .bolum-baslik");
    if (!baslik) return;
    gsap.from(baslik, {
      y: 40, opacity: 0, duration: 0.9, ease: "power3.out", clearProps: "opacity,transform",
      scrollTrigger: { trigger: "#kategoriler", start: "top 85%", once: true },
    });
  });

  // Yazı tipleri ve görseller oturunca ölçüleri bir kez güncelle (görünür sıçrama olmasın)
  const yenile = () => ScrollTrigger.refresh();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(yenile);
  window.addEventListener("load", yenile, { once: true });
  } // basla()

  gsapBekle(basla);
})();
