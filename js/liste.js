/* ============================================================
   LİSTE — hizmet kartları, paketler, filtreler ve arama
   ============================================================ */
(function (TS) {
  "use strict";
  const { $, esc, ayar, hizmetler, paketler, KATEGORI_GORSEL, KATEGORI_EMOJI, KATEGORI_KISA, HASAR_IKON } = TS;

  // ---- DURUM (deste modülü de okur) ----
  const durum = TS.durum = { kategori: "tumu", marka: "tumu", hasar: "tumu", arama: "" };

  // Seçili hizmet + (varsa) filtrede seçilen marka/hasar ile hazır WhatsApp mesajı
  function waLink(hizmetAd) {
    let mesaj = `Merhaba TiryakiSPOR, "${hizmetAd}" hizmeti hakkında bilgi almak istiyorum.`;
    if (durum.marka !== "tumu" && durum.marka !== "Diğer") mesaj += ` Top markası: ${durum.marka}.`;
    if (durum.hasar !== "tumu") mesaj += ` Hasar durumu: ${durum.hasar}.`;
    return `https://wa.me/${ayar.WA_NUMARA}?text=${encodeURIComponent(mesaj)}`;
  }

  // ---- PAKETLER (bir kez çizilir; filtre değişince yalnızca link güncellenir) ----
  function paketleriDoldur() {
    $("paketGrid").innerHTML = paketler.map(p => `
    <article class="paket-kart belir ${p.etiket ? "vurgulu" : ""}">
      <span class="paket-no">${p.no}</span>
      ${p.etiket ? `<span class="paket-etiket">${p.etiket}</span>` : ""}
      <div class="paket-ikon">${p.ikon}</div>
      <h3>${p.ad}</h3>
      <p>${p.aciklama}</p>
      <ul class="paket-ozellik">
        ${p.ozellikler.map(o => `<li>${o}</li>`).join("")}
      </ul>
      <div class="paket-alt">
        <a class="tamir-btn" data-paket="${esc(p.ad)}" href="${waLink(p.ad)}" target="_blank" rel="noopener">🔧 Bilgi Al</a>
      </div>
    </article>
  `).join("");
    TS.gorunurlukGozle(document.querySelectorAll(".paket-kart"));
  }
  function paketLinkleriniGuncelle() {
    document.querySelectorAll("[data-paket]").forEach(a => { a.href = waLink(a.dataset.paket); });
  }

  // ---- SAYILAR (kategori kartları + hero) ----
  function sayilariYaz() {
    document.querySelectorAll("[data-sayi]").forEach(el => {
      const k = el.dataset.sayi;
      el.textContent = k === "tumu" ? hizmetler.length : hizmetler.filter(h => h.kategori === k).length;
    });
    const markalar = new Set(hizmetler.flatMap(h => h.markalar === "hepsi" ? [] : h.markalar));
    markalar.delete("Diğer");
    document.querySelectorAll("[data-marka-sayi]").forEach(el => { el.textContent = markalar.size; });
  }

  // ---- HİZMET KARTI HTML ----
  // Görsel yüklenemezse emoji gösterilir (aşağıdaki "error" dinleyicisi; satır içi onerror yok)
  function hizmetKartHTML(h) {
    const markaMetni = h.markalar === "hepsi" ? "Tüm markalar" : h.markalar.join(" · ");
    return `
    <article class="hizmet-kart">
      <div class="hk-ust">
        <span class="hk-kategori">${KATEGORI_KISA[h.kategori]}</span>
        <span class="hk-sure">⏱ ${h.sure}</span>
        <img class="hk-img scroll-rotate-ball" src="${KATEGORI_GORSEL[h.kategori]}" alt="${esc(h.ad)}" loading="lazy"
             data-kategori="${h.kategori}" />
      </div>
      <div class="hk-govde">
        <h3>${h.ad}</h3>
        <p class="hk-aciklama">${h.aciklama}</p>
        <div class="hk-chipler">
          ${h.hasarlar.map(x => `<span class="hk-hasar">${HASAR_IKON[x]} ${x}</span>`).join("")}
        </div>
        <div class="hk-markalar"><b>Uyumlu:</b> ${markaMetni}</div>
        <div class="hk-alt">
          <a class="tamir-btn" href="${waLink(h.ad)}" target="_blank" rel="noopener">🔧 Bilgi Al</a>
        </div>
      </div>
    </article>
  `;
  }
  $("hizmetGrid").addEventListener("error", (e) => {
    const img = e.target;
    if (!img || img.tagName !== "IMG" || !img.dataset.kategori) return;
    img.replaceWith(Object.assign(document.createElement("span"),
      { className: "hk-emoji", textContent: KATEGORI_EMOJI[img.dataset.kategori] }));
  }, true);   // "error" olayı kabarcıklanmaz; yakalama aşamasında dinlenir

  // ---- FİLTRELE ----
  const kucuk = (s) => s.toLocaleLowerCase("tr");
  function filtrelenenHizmetler() {
    return hizmetler.filter(h => {
      const kategoriUygun = durum.kategori === "tumu" || h.kategori === durum.kategori;
      const markaUygun = durum.marka === "tumu" || h.markalar === "hepsi" || h.markalar.includes(durum.marka);
      const hasarUygun = durum.hasar === "tumu" || h.hasarlar.includes(durum.hasar);
      const aramaUygun = durum.arama === "" ||
        kucuk(h.ad).includes(durum.arama) ||
        kucuk(h.aciklama).includes(durum.arama) ||
        kucuk(KATEGORI_KISA[h.kategori]).includes(durum.arama) ||
        h.hasarlar.some(x => kucuk(x).includes(durum.arama));
      return kategoriUygun && markaUygun && hasarUygun && aramaUygun;
    });
  }

  // ---- HİZMET GRİDİNİ GÜNCELLE ----
  function hizmetleriGoster() {
    const grid = $("hizmetGrid"), bos = $("bosMesaj"), sayisi = $("urunSayisi");
    const liste = filtrelenenHizmetler();

    if (liste.length === 0) {
      grid.innerHTML = "";
      bos.style.display = "block";
      sayisi.textContent = "// 0 HİZMET BULUNDU";
      $("bosWaBtn").href = waLink("Özel tamir");
    } else {
      bos.style.display = "none";
      grid.innerHTML = liste.map(hizmetKartHTML).join("");
      sayisi.textContent = `// ${liste.length} HİZMET BULUNDU`;
      TS.kaydirma.topDonmeleriniGuncelle();
    }
    TS.deste.kur();
    paketLinkleriniGuncelle();
  }

  // ---- KATEGORİ (ONARIM TÜRÜ) SEÇİMİ ----
  function kategoriSec(kategori) {
    durum.kategori = kategori;
    document.querySelectorAll(".kategori-kart").forEach(k =>
      k.classList.toggle("aktif", k.dataset.kategori === kategori));
    $("onarimSelect").value = kategori;
    hizmetleriGoster();
  }
  function listeyeGit() { $("urunler").scrollIntoView({ behavior: "smooth" }); }

  document.querySelectorAll(".kategori-kart").forEach(kart => {
    kart.addEventListener("click", () => {
      // SSS kartı filtre değil, SSS bölümüne götürür
      if (kart.dataset.kategori === "sss") { $("sss").scrollIntoView({ behavior: "smooth" }); return; }
      kategoriSec(kart.dataset.kategori);
      listeyeGit();
    });
  });
  // Footer vb. yerlerdeki kategori linkleri
  document.querySelectorAll("[data-nav-kategori]").forEach(a =>
    a.addEventListener("click", e => { e.preventDefault(); kategoriSec(a.dataset.navKategori); listeyeGit(); }));

  $("onarimSelect").addEventListener("change", e => kategoriSec(e.target.value));

  // ---- MARKA / HASAR ----
  $("markaSelect").addEventListener("change", e => { durum.marka = e.target.value; hizmetleriGoster(); });

  function hasarSec(hasar) {
    durum.hasar = hasar;
    document.querySelectorAll(".hasar-chip").forEach(c => c.classList.toggle("aktif", c.dataset.hasar === hasar));
    hizmetleriGoster();
  }
  document.querySelectorAll(".hasar-chip").forEach(chip =>
    chip.addEventListener("click", () => hasarSec(chip.dataset.hasar)));

  // ---- ARAMA (üstteki ve listedeki kutu birlikte çalışır) ----
  const aramaKutulari = [$("searchInput"), $("searchInput2")].filter(Boolean);
  aramaKutulari.forEach(kutu => {
    kutu.addEventListener("input", e => {
      durum.arama = e.target.value.toLocaleLowerCase("tr").trim();
      aramaKutulari.forEach(k => { if (k !== e.target) k.value = e.target.value; });
      hizmetleriGoster();
      // Üstteki kutudan yazıldıysa ve liste ekranda değilse, listeye kaydır
      if (e.target.id === "searchInput") {
        const r = $("urunler").getBoundingClientRect();
        if (r.top > window.innerHeight * 0.6 || r.bottom < 0) listeyeGit();
      }
    });
  });

  // ---- FİLTRE TEMİZLE ----
  function filtreTemizle() {
    durum.marka = "tumu"; durum.arama = ""; durum.hasar = "tumu";
    $("markaSelect").value = "tumu";
    aramaKutulari.forEach(k => { k.value = ""; });
    document.querySelectorAll(".hasar-chip").forEach(c => c.classList.toggle("aktif", c.dataset.hasar === "tumu"));
    kategoriSec("tumu"); // hizmetleri de yeniden çizer
  }
  $("filtreTemizle").addEventListener("click", filtreTemizle);
  $("filtreTemizle2").addEventListener("click", filtreTemizle);

  TS.liste = { sayilariYaz, paketleriDoldur, hizmetleriGoster };
})(window.TS = window.TS || {});
