/* ============================================================
   RENK VE GÖRÜNÜM TEMASI — (Modern / Minimal + 8 Renk Seçici)
   Sayfaya <html data-renk="..." data-stil="..."> ekler/kaldırır;
   css/style.css bu özniteliklerle renkleri ve efektleri değiştirir.
   Kasıtlı olarak HATIRLANMAZ: her sayfa yüklemesi turuncu + Modern ile başlar.
   ============================================================ */
(function (TS) {
  "use strict";

  function isaretleriGuncelle(renk) {
    const secili = renk || "";
    document.querySelectorAll("#renkMenu [data-renk]").forEach((btn) => {
      btn.setAttribute("aria-current", btn.dataset.renk === secili ? "true" : "false");
    });
  }

  function stilGuncelle(stil) {
    document.querySelectorAll("#renkMenu [data-stil]").forEach((btn) => {
      const aktif = btn.dataset.stil === stil;
      btn.classList.toggle("aktif", aktif);
      btn.setAttribute("aria-selected", aktif ? "true" : "false");
    });
  }

  function uygula(renk) {
    if (renk) document.documentElement.setAttribute("data-renk", renk);
    else document.documentElement.removeAttribute("data-renk");
    isaretleriGuncelle(renk);
  }

  function stilUygula(stil) {
    if (stil === "minimal") document.documentElement.setAttribute("data-stil", "minimal");
    else document.documentElement.removeAttribute("data-stil");
    stilGuncelle(stil);
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
      const stilBtn = e.target.closest("[data-stil]");
      if (stilBtn) {
        stilUygula(stilBtn.dataset.stil);
        return;
      }

      const renkBtn = e.target.closest("[data-renk]");
      if (!renkBtn) return;
      uygula(renkBtn.dataset.renk);
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

  TS.renk = { bagla, uygula, stilUygula };
})(window.TS = window.TS || {});
