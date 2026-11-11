/* ============================================================
   İLETİŞİM FORMU
   - FORM_ENDPOINT doluysa (Formspree vb.) mesaj servise gönderilir.
   - Boşsa hazır mesaj WhatsApp'ta açılır; açılmazsa panelde gerçek bir "WhatsApp'ta Gönder" bağlantısı çıkar.
   - Her durumda mesaj bu tarayıcıda da saklanır (admin paneli için yedek).
   ============================================================ */
(function (TS) {
  "use strict";
  const { $, oku, yaz, telGecerli, toast, ayar } = TS;

  function iletisimFormBagla() {
    const form = $("iletisimForm"), basari = $("formBasari"), yeni = $("yeniMesaj");
    if (!form) return;
    const gonder = form.querySelector("button[type=submit]");
    const { FORM_ENDPOINT, WA_NUMARA, TURNSTILE_SITE_KEY } = ayar;

    // Cloudflare Turnstile Dinamik Entegrasyonu
    let turnstileToken = "";
    if (TURNSTILE_SITE_KEY) {
      const kutu = $("turnstileKutu");
      if (kutu) {
        kutu.hidden = false;
        if (!document.getElementById("turnstileScript")) {
          const s = document.createElement("script");
          s.id = "turnstileScript";
          s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
          s.async = true;
          s.defer = true;
          s.onload = () => {
            if (window.turnstile) {
              window.turnstile.render(kutu, {
                sitekey: TURNSTILE_SITE_KEY,
                callback: (token) => { turnstileToken = token; },
                theme: "dark"
              });
            }
          };
          document.head.appendChild(s);
        }
      }
    }

    // Bu tarayıcıda kayıt (admin paneli için yedek)
    function yerelKaydet(ad, tel, mesaj) {
      const liste = oku("sz_mesajlar", []);
      liste.push({ id: Date.now().toString(), ad, tel, mesaj, tarih: new Date().toISOString(), okundu: false });
      yaz("sz_mesajlar", liste);
    }

    // Form servisine gönder; başarısızsa false döner (düğme eski haline getirilir)
    async function servisteGonder(ad, tel, mesaj) {
      gonder.disabled = true;
      const eski = gonder.textContent;
      gonder.textContent = "Gönderiliyor...";
      try {
        const yanit = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ ad, telefon: tel, mesaj }),
        });
        if (!yanit.ok) throw new Error("http " + yanit.status);
        return true;
      } catch {
        return false;
      } finally {
        gonder.disabled = false;
        gonder.textContent = eski;
      }
    }

    // Form servisi yokken mesajın kaybolmaması için WhatsApp'a hazır mesaj olarak aç
    function whatsappHazirla(ad, tel, mesaj) {
      const metin = `Merhaba TiryakiSPOR, ben ${ad}.\n${mesaj}\n\nTelefonum: ${tel}`;
      const url = `https://wa.me/${WA_NUMARA}?text=${encodeURIComponent(metin)}`;
      try { window.open(url, "_blank", "noopener"); } catch { /* bazı ortamlar pencere açtırmaz */ }
      $("waGonderLink").href = url;                      // pencere açılmazsa kullanılacak gerçek bağlantı
      $("waGonderLink").style.display = "";
      $("basariBaslik").textContent = "Mesajınız hazır!";
      $("basariMetin").textContent = "Mesajı WhatsApp'ta göndermeniz yeterli. WhatsApp açılmadıysa aşağıdaki düğmeyi kullanın.";
    }
    function servisBasariMetni() {
      $("waGonderLink").style.display = "none";
      $("basariBaslik").textContent = "Mesajınız İletildi!";
      $("basariMetin").textContent = "En kısa sürede sizinle iletişime geçeceğiz.";
    }

    form.addEventListener("submit", async e => {
      e.preventDefault();

      // Bot Koruması (Honeypot): Gizli alan doldurulmuşsa bot olduğunu anla ve işlemi sessizce yut
      const tuzak = $("formWebsite");
      if (tuzak && tuzak.value.trim() !== "") {
        console.warn("Bot tespit edildi ve engellendi.");
        return;
      }

      // Hız Sınırı (Rate-Limiting): 30 saniye içinde mükerrer gönderimleri engelle
      const SON_GONDERIM_KEY = "sz_son_form_zamani";
      const sonGonderim = parseInt(sessionStorage.getItem(SON_GONDERIM_KEY) || "0", 10);
      const simdiMs = Date.now();
      const beklemeSuresi = 30000; // 30 saniye
      if (sonGonderim && (simdiMs - sonGonderim) < beklemeSuresi) {
        const kalanSn = Math.ceil((beklemeSuresi - (simdiMs - sonGonderim)) / 1000);
        return toast(`⏳ Lütfen yeni bir mesaj göndermeden önce ${kalanSn} saniye bekleyin.`, 4000);
      }

      const ad = $("musAd").value.trim();
      const tel = $("musTel").value.trim();
      const mesaj = $("musMesaj").value.trim();

      if (!ad || !tel || !mesaj) return toast("⚠️ Lütfen tüm alanları doldurun!");
      if (!telGecerli(tel)) return toast("⚠️ Geçerli bir telefon numarası girin (05XX XXX XX XX).");

      // Turnstile anahtarı tanımlıysa token kontrolü
      if (TURNSTILE_SITE_KEY && !turnstileToken) {
        return toast("⚠️ Lütfen güvenlik doğrulamasını tamamlayın.");
      }

      // Gönderim zamanını kaydet
      sessionStorage.setItem(SON_GONDERIM_KEY, String(simdiMs));
      yerelKaydet(ad, tel, mesaj);

      if (FORM_ENDPOINT) {
        if (!await servisteGonder(ad, tel, mesaj)) {
          return toast("⚠️ Mesaj gönderilemedi. Lütfen WhatsApp'tan yazın.", 4000);
        }
        servisBasariMetni();
      } else {
        whatsappHazirla(ad, tel, mesaj);
      }

      form.style.display = "none";
      basari.style.display = "block";
      toast(FORM_ENDPOINT ? "✅ Mesajınız gönderildi!" : "✅ Mesajınız hazır, WhatsApp'ta göndermeyi unutmayın!", 4000);
    });

    yeni.addEventListener("click", () => {
      form.reset();
      form.style.display = "block";
      basari.style.display = "none";
    });
  }

  TS.form = { bagla: iletisimFormBagla };
})(window.TS = window.TS || {});
