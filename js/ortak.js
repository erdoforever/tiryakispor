/* ============================================================
   ORTAK YARDIMCILAR — ana site ve admin.html birlikte kullanır
   Ortak ad alanı: window.TS (TiryakiSPOR). Her dosya kendi IIFE'si içinde çalışır.
   ============================================================ */
(function (TS) {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // HTML'e basılacak metinleri güvenli hale getirir
  const esc = (s) => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Depolama kapalı olsa bile site çalışsın
  function oku(anahtar, varsayilan) {
    try { return JSON.parse(localStorage.getItem(anahtar)) ?? varsayilan; }
    catch { return varsayilan; }
  }
  function yaz(anahtar, deger) {
    try { localStorage.setItem(anahtar, JSON.stringify(deger)); } catch { /* depolama kapalı */ }
  }

  // "0531 431 55 60" -> "905314315560" (başındaki 0 atılır, 90 eklenir)
  function waTel(tel) {
    let d = String(tel).replace(/\D/g, "");
    if (d.startsWith("90") && d.length === 12) return d;
    if (d.startsWith("0")) d = d.slice(1);
    return "90" + d;
  }
  const telGecerli = (tel) => /^90[1-9]\d{9}$/.test(waTel(tel));

  // Kullanıcı "hareketi azalt" tercihini açtıysa animasyonlar kapalı (sayfa açılırken bir kez okunur)
  const azHareket = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  Object.assign(TS, { $, esc, oku, yaz, waTel, telGecerli, azHareket });
})(window.TS = window.TS || {});
