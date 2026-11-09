/* ============================================================
   BAŞLATMA — modüller yüklendikten sonra sayfayı ilk haline getirir
   Yükleme sırası (index.html): ortak → ayarlar → arayuz → liste → kaydirma → deste → form → iletisim → renk → baslat → hareket
   ============================================================ */
(function (TS) {
  "use strict";

  TS.liste.sayilariYaz();
  TS.liste.paketleriDoldur();
  TS.gorunurlukGozle(document.querySelectorAll(".kategori-kart, .sss-item"));
  TS.liste.hizmetleriGoster();
  TS.kaydirma.topDonmeleriniGuncelle();
  TS.form.bagla();
  TS.iletisim.bagla();
  TS.renk.bagla();
})(window.TS = window.TS || {});
