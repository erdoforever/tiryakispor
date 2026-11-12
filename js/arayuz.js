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

  // ---- MENÜ & OVAL KAYAN KAPSÜL (APPLE iOS ULTRA GLASS) ----
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
    if (!kayanKapsul || !hedefLink || !navLinks || window.innerWidth <= 768) {
      if (kayanKapsul) kayanKapsul.style.opacity = "0";
      return;
    }
    // offsetParent karmaşasını önlemek için getBoundingClientRect ile kesin piksel hesabı
    const navRect = navLinks.getBoundingClientRect();
    const linkRect = hedefLink.getBoundingClientRect();
    const sol = linkRect.left - navRect.left;
    const genislik = linkRect.width;
    if (genislik === 0) return;

    kayanKapsul.style.transition = animasyonlu && !TS.azHareket
      ? "transform 0.42s cubic-bezier(0.16, 1, 0.3, 1), width 0.42s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease"
      : "none";
    kayanKapsul.style.transform = `translate3d(${sol}px, 0, 0)`;
    kayanKapsul.style.width = `${genislik}px`;
    kayanKapsul.style.opacity = "1";

    navA.forEach((a) => a.classList.toggle("aktif", a === hedefLink));
    seciliLink = hedefLink;
  }

  // Tıklama kilidi: Kullanıcı tıkladığında bar hemen kayar ve sayfa hedefe inene kadar scroll-spy ezmez
  let tiklamaKilidi = false;
  let tiklamaZamanlayici = null;

  navA.forEach((a) => {
    a.addEventListener("click", () => {
      kapsulGuncelle(a, true);
      tiklamaKilidi = true;
      clearTimeout(tiklamaZamanlayici);
      tiklamaZamanlayici = setTimeout(() => {
        tiklamaKilidi = false;
      }, 1000);
    });
  });

  // Pencere yeniden boyutlandırıldığında konumu anında düzelt
  window.addEventListener("resize", () => {
    if (seciliLink) kapsulGuncelle(seciliLink, false);
  }, { passive: true });

  // Sayfa kaydırıldıkça hangi bölümde olduğumuzu viewport'a göre tespit eden akıllı scroll-spy
  const bolumEslesmeleri = navA.map((a) => {
    const id = (a.getAttribute("href") || "").replace("#", "");
    return { a, el: id ? $(id) : null };
  }).filter((b) => b.el);

  let scrollSpyBekliyor = false;
  function scrollSpyGuncelle() {
    scrollSpyBekliyor = false;
    if (tiklamaKilidi || window.innerWidth <= 768 || !bolumEslesmeleri.length) return;
    
    let suanki = null;
    for (let i = bolumEslesmeleri.length - 1; i >= 0; i--) {
      const b = bolumEslesmeleri[i];
      const r = b.el.getBoundingClientRect();
      if (r.top <= 200 && r.bottom >= 120) {
        suanki = b.a;
        break;
      }
    }
    // En tepedeyken (hero alanı) Hizmetler'i seçili tut
    if (!suanki && window.scrollY < 400 && bolumEslesmeleri.length) {
      suanki = bolumEslesmeleri[0].a;
    }
    if (suanki && suanki !== seciliLink) {
      kapsulGuncelle(suanki, true);
    }
  }

  window.addEventListener("scroll", () => {
    if (!scrollSpyBekliyor && !tiklamaKilidi) {
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
    setTimeout(() => kapsulGuncelle(seciliLink, false), 500);
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

  // ---- ELEGANT PENCERE / SEKME MOTORU (APPLE TARZI DUAL EXPERIENCE) ----
  const sekmeBar = $("sekmeBar");
  const sekmeKapsul = $("sekmeKayanKapsul");
  const sekmeBtnler = sekmeBar ? [...sekmeBar.querySelectorAll(".sekme-btn")] : [];
  const paneller = [...document.querySelectorAll(".pencere-panel")];

  function sekmeKapsulGuncelle(btn, animasyonlu = true) {
    if (!sekmeKapsul || !btn || !sekmeBar || window.innerWidth <= 768) {
      if (sekmeKapsul) sekmeKapsul.style.opacity = "0";
      return;
    }
    const barRect = btn.parentElement.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const sol = btnRect.left - barRect.left;
    const genislik = btnRect.width;
    if (genislik === 0) return;

    sekmeKapsul.style.transition = animasyonlu && !TS.azHareket
      ? "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), width 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease"
      : "none";
    sekmeKapsul.style.transform = `translate3d(${sol}px, 0, 0)`;
    sekmeKapsul.style.width = `${genislik}px`;
    sekmeKapsul.style.opacity = "1";
  }

  function sekmeAc(hedefAd, kaydir = true) {
    const seciliBtn = sekmeBtnler.find((b) => b.getAttribute("data-sekme") === hedefAd) || sekmeBtnler[0];
    if (!seciliBtn) return;

    sekmeBtnler.forEach((b) => {
      const aktif = b === seciliBtn;
      b.classList.toggle("aktif", aktif);
      b.setAttribute("aria-selected", aktif ? "true" : "false");
    });

    sekmeKapsulGuncelle(seciliBtn, true);

    paneller.forEach((p) => {
      const eslesiyor = p.getAttribute("data-sekme-panel") === hedefAd;
      p.classList.toggle("aktif", eslesiyor);
      if (eslesiyor) {
        gorunurlukGozle(p.querySelectorAll(".kategori-kart, .sss-item"));
      }
    });

    // Katalog açıldığında hizmet destesini tazele
    if (hedefAd === "katalog" && TS.deste && TS.deste.kur) {
      setTimeout(() => TS.deste.kur(), 60);
    }

    // Üst navbar linkini de eşzamanla
    const eslesenNavA = navA.find((a) => a.getAttribute("data-sekme-hedef") === hedefAd);
    if (eslesenNavA) kapsulGuncelle(eslesenNavA, true);

    // Kullanıcı Hero bölümündeyse veya sekme barının üzerindeyse sekme çubuğuna yumuşakça odakla
    if (kaydir && sekmeBar) {
      const r = sekmeBar.getBoundingClientRect();
      if (r.top < 65 || window.scrollY < 400) {
        const hedefY = window.scrollY + r.top - 72;
        window.scrollTo({ top: Math.max(0, hedefY), behavior: TS.azHareket ? "auto" : "smooth" });
      }
    }
  }

  sekmeBtnler.forEach((btn) => {
    btn.addEventListener("click", () => {
      const hedef = btn.getAttribute("data-sekme");
      sekmeAc(hedef, true);
    });
  });

  // Sayfadaki tüm data-sekme-hedef bağlantıları (navbar, hero, footer)
  document.querySelectorAll("[data-sekme-hedef]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const hedef = el.getAttribute("data-sekme-hedef");
      sekmeAc(hedef, true);
    });
  });

  // URL hash kontrolü (#galeri, #paketler, #katalog, #iletisim)
  function hashSekmeKontrol() {
    const h = (window.location.hash || "").replace("#", "");
    if (h && ["galeri", "paketler", "katalog", "iletisim"].includes(h)) {
      sekmeAc(h, false);
    }
  }
  hashSekmeKontrol();
  window.addEventListener("hashchange", hashSekmeKontrol);

  window.addEventListener("resize", () => {
    const aktifBtn = sekmeBtnler.find((b) => b.classList.contains("aktif"));
    if (aktifBtn) sekmeKapsulGuncelle(aktifBtn, false);
  }, { passive: true });

  if (sekmeBtnler[0]) {
    setTimeout(() => sekmeKapsulGuncelle(sekmeBtnler[0], false), 200);
  }

  Object.assign(TS, { toast, escEkle, gorunurlukGozle, sekmeAc });
})(window.TS = window.TS || {});
