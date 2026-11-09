/* ============================================================
   RENK TEMASI — arama kutusunun yanındaki küçük açılır menü (Turuncu / Beyaz / Mor)
   Sayfaya <html data-renk="beyaz|mor"> ekler/kaldırır; css/style.css bu öznitelikle
   --accent / --accent2 / --amber (ve rgb eşleniklerini) değiştirir.
   Kasıtlı olarak HATIRLANMAZ: hiçbir yerde kaydedilmez, her sayfa yüklemesi turuncu ile başlar.
   ============================================================ */
(function (TS) {
  "use strict";

  function isaretleriGuncelle(renk) {
    const secili = renk || "";
    document.querySelectorAll("#renkMenu [data-renk]").forEach((btn) => {
      btn.setAttribute("aria-current", btn.dataset.renk === secili ? "true" : "false");
    });
  }

  function uygula(renk) {
    if (renk) document.documentElement.setAttribute("data-renk", renk);
    else document.documentElement.removeAttribute("data-renk");
    isaretleriGuncelle(renk);
  }

  function menuAc(menu, dugme, ac) {
    menu.hidden = !ac;
    dugme.setAttribute("aria-expanded", ac ? "true" : "false");
  }

  function bagla() {
    const dugme = document.getElementById("renkDugme");
    const menu = document.getElementById("renkMenu");
    if (!dugme || !menu) return;

    dugme.addEventListener("click", (e) => {
      e.stopPropagation();
      menuAc(menu, dugme, menu.hidden);
    });

    menu.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-renk]");
      if (!btn) return;
      uygula(btn.dataset.renk);
      menuAc(menu, dugme, false);
      dugme.focus();
    });

    document.addEventListener("click", (e) => {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== dugme) menuAc(menu, dugme, false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) { menuAc(menu, dugme, false); dugme.focus(); }
    });
  }

  TS.renk = { bagla, uygula };
})(window.TS = window.TS || {});
