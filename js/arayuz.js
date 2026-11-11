/* ============================================================
   ARAYÜZ — toast bildirimi, mobil menü, Esc tuşu, "görününce belir" gözlemcisi
   ============================================================ */
(function (TS) {
  "use strict";
  const { $ } = TS;

  // ---- TOAST ----
  let toastZaman;
  function toast(mesaj, sure = 2800) {
    const el = $("toast");
    el.textContent = mesaj;
    el.classList.add("goster");
    clearTimeout(toastZaman);
    toastZaman = setTimeout(() => el.classList.remove("goster"), sure);
  }

  // ---- ESC TUŞU: tek dinleyici; menü ve hizmet destesi işleyicilerini sırayla çağırır ----
  const escIsleyicileri = [];
  const escEkle = (fn) => escIsleyicileri.push(fn);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") escIsleyicileri.forEach((fn) => fn());
  });

  // ---- MENÜ & OVAL KAYAN KAPSÜL ----
  const navLinks = $("navLinks"), hamburger = $("hamburger");
  const kayanKapsul = $("navKayanKapsul");
  const navA = navLinks ? [...navLinks.querySelectorAll("a")] : [];
  let seciliLink = navA[0] || null;

  function menuAyarla(acik) {
    navLinks.classList.toggle("acik", acik);
    hamburger.setAttribute("aria-expanded", acik);
  }
  hamburger.addEventListener("click", () => menuAyarla(!navLinks.classList.contains("acik")));
  navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => menuAyarla(false)));
  escEkle(() => menuAyarla(false));

  function kapsulGuncelle(hedefLink, animasyonlu = true) {
    if (!kayanKapsul || !hedefLink || window.innerWidth <= 768) {
      if (kayanKapsul) kayanKapsul.style.opacity = "0";
      return;
    }
    const sol = hedefLink.offsetLeft;
    const genislik = hedefLink.offsetWidth;
    if (genislik === 0) return;

    kayanKapsul.style.transition = animasyonlu && !TS.azHareket
      ? "transform 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2), width 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2), opacity 0.2s ease"
      : "none";
    kayanKapsul.style.transform = `translateX(${sol}px)`;
    kayanKapsul.style.width = `${genislik}px`;
    kayanKapsul.style.opacity = "1";

    navA.forEach((a) => a.classList.toggle("aktif", a === hedefLink));
    seciliLink = hedefLink;
  }

  // Tıklanınca kayan saydam kapsülü o bağlantıya yumuşakça kaydır
  navA.forEach((a) => {
    a.addEventListener("click", () => {
      kapsulGuncelle(a, true);
    });
  });

  // Pencere yeniden boyutlandırıldığında konumu anında düzelt
  window.addEventListener("resize", () => {
    if (seciliLink) kapsulGuncelle(seciliLink, false);
  }, { passive: true });

  // Sayfa kaydırıldıkça hangi bölümde olduğumuzu tespit edip kapsülü oraya kaydıran scroll-spy
  const bolumEslesmeleri = navA.map((a) => {
    const id = (a.getAttribute("href") || "").replace("#", "");
    return { a, el: id ? $(id) : null };
  }).filter((b) => b.el);

  let scrollSpyBekliyor = false;
  function scrollSpyGuncelle() {
    scrollSpyBekliyor = false;
    if (window.innerWidth <= 768 || !bolumEslesmeleri.length) return;
    const y = window.scrollY + 140;
    let suanki = null;
    for (let i = bolumEslesmeleri.length - 1; i >= 0; i--) {
      const b = bolumEslesmeleri[i];
      if (b.el.offsetTop <= y) {
        suanki = b.a;
        break;
      }
    }
    if (!suanki && window.scrollY < 400 && bolumEslesmeleri.length) {
      suanki = bolumEslesmeleri[0].a;
    }
    if (suanki && suanki !== seciliLink) {
      kapsulGuncelle(suanki, true);
    }
  }

  window.addEventListener("scroll", () => {
    if (!scrollSpyBekliyor) {
      scrollSpyBekliyor = true;
      requestAnimationFrame(scrollSpyGuncelle);
    }
  }, { passive: true });

  // Sayfa açıldığında ilk konuma yerleş
  if (seciliLink) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => kapsulGuncelle(seciliLink, false));
    } else {
      kapsulGuncelle(seciliLink, false);
    }
    setTimeout(() => kapsulGuncelle(seciliLink, false), 150);
  }

  // ---- GÖRÜNÜNCE BELİR (inline stil yerine CSS sınıfı: hover efektlerini bozmaz) ----
  let gozlemci = null;
  function gorunurlukGozle(liste) {
    const elemanlar = [...liste];
    if (!("IntersectionObserver" in window)) { elemanlar.forEach((el) => el.classList.add("gorundu")); return; }
    if (!gozlemci) {
      gozlemci = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add("gorundu"); gozlemci.unobserve(en.target); }
        });
      }, { threshold: 0.1 });
    }
    elemanlar.forEach((el) => { el.classList.add("belir"); gozlemci.observe(el); });
  }

  Object.assign(TS, { toast, escEkle, gorunurlukGozle });
})(window.TS = window.TS || {});
