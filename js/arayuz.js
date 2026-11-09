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

  // ---- MENÜ ----
  const navLinks = $("navLinks"), hamburger = $("hamburger");
  function menuAyarla(acik) {
    navLinks.classList.toggle("acik", acik);
    hamburger.setAttribute("aria-expanded", acik);
  }
  hamburger.addEventListener("click", () => menuAyarla(!navLinks.classList.contains("acik")));
  navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => menuAyarla(false)));
  escEkle(() => menuAyarla(false));

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
