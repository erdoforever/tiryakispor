/* ============================================================
   TiryakiSPOR — Admin 3D Elite TS Monogram & Constellation Particle System
   Three.js tabanlı, lüks kulüp arması formunda "TS" yıldız kümesi,
   geniş açılı sinematik kamera ve warp-speed login geçişi
   ============================================================ */
(function () {
  "use strict";

  // WebGL & Three.js Kontrolü
  if (typeof THREE === "undefined") {
    console.warn("Three.js kütüphanesi yüklenemedi; 3D parçacık sistemi atlanıyor.");
    return;
  }

  const canvas = document.getElementById("adminPartikulCanvas");
  if (!canvas) return;

  const portalKontrol = document.getElementById("tsPortalKontrol");
  const enterBtn      = document.getElementById("tsEnterBtn");
  const geriBtn       = document.getElementById("tsGeriBtn");
  const girisKutu     = document.getElementById("girisKutu");
  const sifreInput    = document.getElementById("sifreInput");

  const azHareket = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Geniş açı başlangıç kamera mesafesi (Mobil ve Masaüstü için ferah, geniş kadraj)
  function hesaplaKameraZ() {
    return window.innerWidth < 768 ? 680 : 540;
  }

  // Sahne, Kamera, Renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 3000);
  let varsayilanKameraZ = hesaplaKameraZ();
  camera.position.set(0, 0, varsayilanKameraZ);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
  } catch (err) {
    console.warn("WebGL başlatılamadı:", err);
    return;
  }

  // Dinamik Işıltılı Yuvarlak Parçacık Dokusu (Canvas ile pürüzsüz yıldız dokusu)
  function parcaDokusuOlustur() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    const rad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    rad.addColorStop(0, "rgba(255, 255, 255, 1)");
    rad.addColorStop(0.20, "rgba(255, 255, 255, 0.90)");
    rad.addColorStop(0.52, "rgba(255, 255, 255, 0.28)");
    rad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  const particleTexture = parcaDokusuOlustur();

  // ---- ELİT "TS" LOGOSU & KULÜP ARMASI PARÇACIK GRUBU ----
  const tsGroup = new THREE.Group();
  scene.add(tsGroup);

  let tsGeometry = null;
  let tsPointsMesh = null;
  let lineSegmentsMesh = null;
  let lineMaterial = null;
  let tsBasePos = null;
  let tsCount = 0;

  // 5 Köşeli Yıldız Çizim Yardımcısı (Taç/Şampiyonluk Yıldızları)
  function cizYildiz(ctx, cx, cy, disR, icR) {
    ctx.beginPath();
    let rot = (Math.PI / 2) * 3;
    const adim = Math.PI / 5;
    ctx.moveTo(cx, cy - disR);
    for (let i = 0; i < 5; i++) {
      let x = cx + Math.cos(rot) * disR;
      let y = cy + Math.sin(rot) * disR;
      ctx.lineTo(x, y);
      rot += adim;
      x = cx + Math.cos(rot) * icR;
      y = cy + Math.sin(rot) * icR;
      ctx.lineTo(x, y);
      rot += adim;
    }
    ctx.lineTo(cx, cy - disR);
    ctx.closePath();
    ctx.fill();
  }

  function elitTsLogosuUret() {
    // 1. Ekran dışı 2D Canvas üzerinde Lüks Spor Arması ve "TS" Monogramı
    const oc = document.createElement("canvas");
    const W = 600;
    const H = 600;
    oc.width = W;
    oc.height = H;
    const ctx = oc.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    // A) ÜST ŞAMPİYONLUK YILDIZLARI (Elit Prestij Vurgusu)
    ctx.fillStyle = "#FFFFFF";
    cizYildiz(ctx, 300, 62, 14, 6);   // Merkez büyük yıldız
    cizYildiz(ctx, 254, 76, 10, 4.5); // Sol yıldız
    cizYildiz(ctx, 346, 76, 10, 4.5); // Sağ yıldız

    // B) DIŞ LÜKS KALKAN (HERALDIC SHIELD CREST)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    // Üst kenar & beveled omuzlar
    ctx.moveTo(300, 96);
    ctx.lineTo(395, 112);
    ctx.lineTo(465, 180);
    ctx.lineTo(455, 310);
    // Alt süzülen kavisli uç
    ctx.quadraticCurveTo(440, 420, 300, 505);
    ctx.quadraticCurveTo(160, 420, 145, 310);
    ctx.lineTo(135, 180);
    ctx.lineTo(205, 112);
    ctx.closePath();
    ctx.stroke();

    // C) İÇ İNCE KALKAN KONTURU (Çift Çerçeve Derinliği)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(300, 112);
    ctx.lineTo(385, 126);
    ctx.lineTo(448, 186);
    ctx.lineTo(438, 305);
    ctx.quadraticCurveTo(425, 405, 300, 485);
    ctx.quadraticCurveTo(175, 405, 162, 305);
    ctx.lineTo(152, 186);
    ctx.lineTo(215, 126);
    ctx.closePath();
    ctx.stroke();

    // D) MERKEZDE ÖZEL MONOGRAM: KESKİN VE GÜÇLÜ "T" HARFİ
    ctx.fillStyle = "#FFFFFF";
    // T Üst Tacı (Açılı sportif serbest kesim)
    ctx.beginPath();
    ctx.moveTo(195, 205);
    ctx.lineTo(215, 160);
    ctx.lineTo(385, 160);
    ctx.lineTo(405, 205);
    ctx.lineTo(365, 205);
    ctx.lineTo(355, 185);
    ctx.lineTo(245, 185);
    ctx.lineTo(235, 205);
    ctx.closePath();
    ctx.fill();

    // T Dikey Gövdesi (Merkez Sütun)
    ctx.beginPath();
    ctx.moveTo(280, 185);
    ctx.lineTo(320, 185);
    ctx.lineTo(320, 435);
    ctx.lineTo(300, 455);
    ctx.lineTo(280, 435);
    ctx.closePath();
    ctx.fill();

    // E) "T" İLE İÇ İÇE GEÇEN AKICI LÜKS "S" HARFİ (INTERLOCKING SPORT S)
    // S Üst Kıvrımı
    ctx.beginPath();
    ctx.moveTo(395, 220);
    ctx.lineTo(345, 220);
    ctx.lineTo(330, 245);
    ctx.lineTo(375, 260);
    ctx.quadraticCurveTo(395, 275, 385, 310);
    ctx.lineTo(345, 350); // Çapraz geçiş
    ctx.lineTo(315, 350);
    ctx.lineTo(355, 310);
    ctx.lineTo(340, 290);
    ctx.lineTo(260, 265);
    ctx.quadraticCurveTo(230, 245, 245, 220);
    ctx.lineTo(290, 195);
    ctx.lineTo(310, 215);
    ctx.lineTo(275, 230);
    ctx.lineTo(290, 245);
    ctx.lineTo(375, 220);
    ctx.closePath();
    ctx.fill();

    // S Alt Kıvrımı
    ctx.beginPath();
    ctx.moveTo(350, 345);
    ctx.lineTo(380, 375);
    ctx.quadraticCurveTo(390, 410, 355, 435);
    ctx.lineTo(240, 435);
    ctx.lineTo(215, 395);
    ctx.lineTo(255, 395);
    ctx.lineTo(265, 412);
    ctx.lineTo(340, 412);
    ctx.lineTo(350, 390);
    ctx.lineTo(320, 365);
    ctx.lineTo(250, 335);
    ctx.quadraticCurveTo(230, 315, 240, 285);
    ctx.lineTo(265, 285);
    ctx.lineTo(255, 310);
    ctx.lineTo(315, 345);
    ctx.closePath();
    ctx.fill();

    // F) ALT KANAT ŞERİTLERİ (Aerodinamik Lüks Hız Çizgileri)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 3.5;
    // Sol şeritler
    ctx.beginPath();
    ctx.moveTo(175, 335);
    ctx.lineTo(225, 445);
    ctx.moveTo(160, 285);
    ctx.lineTo(195, 375);
    ctx.stroke();

    // Sağ şeritler
    ctx.beginPath();
    ctx.moveTo(425, 335);
    ctx.lineTo(375, 445);
    ctx.moveTo(440, 285);
    ctx.lineTo(405, 375);
    ctx.stroke();

    // 2. Pikselleri 3D Koordinatlara Tara (Ölçek: 0.65 ile tam odaklı, ferah geniş açı)
    const imgData = ctx.getImageData(0, 0, W, H).data;
    const hamNoktalar = [];
    const step = 4;
    const skala = 0.64; // Geniş açı için orantılı kompakt boyutlandırma

    for (let y = 30; y < H - 30; y += step) {
      for (let x = 30; x < W - 30; x += step) {
        const idx = (y * W + x) * 4;
        const parlaklik = (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3;
        if (parlaklik > 115) {
          const posX = (x - W / 2) * skala;
          const posY = -(y - H / 2) * skala;
          // Volumetrik 3D mücevher/kristal kalınlığı
          const merkezMesafe = Math.hypot(posX, posY);
          const posZ = (Math.random() - 0.5) * 28 + Math.cos(merkezMesafe * 0.02) * 14;
          hamNoktalar.push(posX, posY, posZ);
        }
      }
    }

    tsCount = hamNoktalar.length / 3;
    tsBasePos = new Float32Array(hamNoktalar);
    const tsCurPos = new Float32Array(hamNoktalar);

    // Önceki mesh'leri temizle
    if (tsPointsMesh) tsGroup.remove(tsPointsMesh);
    if (lineSegmentsMesh) tsGroup.remove(lineSegmentsMesh);

    // 3. Parçacık Noktaları BufferGeometry
    tsGeometry = new THREE.BufferGeometry();
    tsGeometry.setAttribute("position", new THREE.BufferAttribute(tsCurPos, 3));

    const tsMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 3.6,
      map: particleTexture,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    tsPointsMesh = new THREE.Points(tsGeometry, tsMaterial);
    tsGroup.add(tsPointsMesh);

    // 4. Yıldız Kümesi (Constellation) Ağ Çizgileri
    // Yalnızca YAKIN yapısal komşuları bağlar (boşluklarda örümcek ağı oluşmasını önler)
    const cizgiNoktalari = [];
    const minMesafeKare = 5 * 5;
    const maxMesafeKare = 13.5 * 13.5;

    for (let i = 0; i < tsCount; i += 2) {
      const x1 = tsBasePos[i * 3];
      const y1 = tsBasePos[i * 3 + 1];
      const z1 = tsBasePos[i * 3 + 2];
      let baglanti = 0;

      for (let j = i + 1; j < tsCount; j += 2) {
        if (baglanti >= 3) break;
        const x2 = tsBasePos[j * 3];
        const y2 = tsBasePos[j * 3 + 1];
        const z2 = tsBasePos[j * 3 + 2];

        const dx = x1 - x2;
        const dy = y1 - y2;
        const dz = z1 - z2;
        const d2 = dx * dx + dy * dy + dz * dz;

        if (d2 <= maxMesafeKare && d2 >= minMesafeKare) {
          cizgiNoktalari.push(x1, y1, z1);
          cizgiNoktalari.push(x2, y2, z2);
          baglanti++;
        }
      }
    }

    if (cizgiNoktalari.length > 0) {
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(cizgiNoktalari), 3));
      lineMaterial = new THREE.LineBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      lineSegmentsMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
      tsGroup.add(lineSegmentsMesh);
    }
  }

  // İlk Logoyu Oluştur
  elitTsLogosuUret();

  // Web Fontları yüklendiğinde yenile
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      elitTsLogosuUret();
    }).catch(() => {});
  }

  // ---- DERİNLİK UZAY YILDIZLARI (COSMIC DUST) ----
  const TOZ_SAYISI = 520;
  const tozGeometri = new THREE.BufferGeometry();
  const tozPozisyonlar = new Float32Array(TOZ_SAYISI * 3);

  for (let i = 0; i < TOZ_SAYISI; i++) {
    tozPozisyonlar[i * 3]     = (Math.random() - 0.5) * 1600;
    tozPozisyonlar[i * 3 + 1] = (Math.random() - 0.5) * 1200;
    tozPozisyonlar[i * 3 + 2] = (Math.random() - 0.5) * 1400 - 100;
  }
  tozGeometri.setAttribute("position", new THREE.BufferAttribute(tozPozisyonlar, 3));

  const tozMateryal = new THREE.PointsMaterial({
    color: 0xEDF2F7,
    size: 2.5,
    map: particleTexture,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const tozParticles = new THREE.Points(tozGeometri, tozMateryal);
  scene.add(tozParticles);

  // ---- ETKİLEŞİMLİ YAKINLAŞMA (ZOOM-TO-LOGIN) DURUM MOTORU ----
  let isZoomed = azHareket;
  let zoomCurrent = azHareket ? 1 : 0;
  let zoomTarget = azHareket ? 1 : 0;

  if (azHareket && girisKutu) {
    girisKutu.classList.add("aktif");
    if (portalKontrol) portalKontrol.classList.add("gizle");
  }

  function zoomGiris() {
    if (isZoomed) return;
    isZoomed = true;
    zoomTarget = 1;
    if (portalKontrol) portalKontrol.classList.add("gizle");
    if (girisKutu) girisKutu.classList.add("aktif");
    setTimeout(() => {
      if (sifreInput) sifreInput.focus();
    }, 400);
  }

  function zoomCikis() {
    if (!isZoomed) return;
    isZoomed = false;
    zoomTarget = 0;
    if (girisKutu) girisKutu.classList.remove("aktif");
    if (portalKontrol) portalKontrol.classList.remove("gizle");
  }

  // Tıklama Olayları
  if (enterBtn) enterBtn.addEventListener("click", zoomGiris);
  if (geriBtn) geriBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    zoomCikis();
  });

  canvas.addEventListener("click", () => {
    if (!isZoomed) zoomGiris();
  });

  // Fare Tekerleği (Scroll)
  window.addEventListener("wheel", (e) => {
    if (e.deltaY > 16 && !isZoomed) {
      zoomGiris();
    } else if (e.deltaY < -16 && isZoomed && document.activeElement !== sifreInput) {
      zoomCikis();
    }
  }, { passive: true });

  // Klavye Kontrolleri
  window.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && !isZoomed) {
      e.preventDefault();
      zoomGiris();
    } else if (e.key === "Escape" && isZoomed) {
      zoomCikis();
    }
  });

  // ---- FARE & PARALLAX DAMPING ----
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  function onPointerMove(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    targetX = ((clientX - window.innerWidth / 2) / (window.innerWidth / 2));
    targetY = ((clientY - window.innerHeight / 2) / (window.innerHeight / 2));
  }
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("touchmove", onPointerMove, { passive: true });

  // Ekran Boyutu Değişimi & Dinamik Geniş Açı
  function onWindowResize() {
    varsayilanKameraZ = hesaplaKameraZ();
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onWindowResize);

  // Sekme Arkaya Atılınca CPU Tasarrufu
  let animasyonAktif = true;
  document.addEventListener("visibilitychange", () => {
    animasyonAktif = !document.hidden;
    if (animasyonAktif) requestAnimationFrame(render);
  });

  // ---- ANİMASYON DÖNGÜSÜ ----
  let saat = 0;
  function render() {
    if (!animasyonAktif) return;

    saat += azHareket ? 0.005 : 0.020;

    // Yumuşak Mouse Takibi
    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;

    // Yumuşak Yakınlaşma (Lerp)
    zoomCurrent += (zoomTarget - zoomCurrent) * 0.058;

    // Kamera Pozisyonu: Geniş açı varsayilanKameraZ'den (540-680) z = 48'e (içinden geçiş)
    camera.position.z = THREE.MathUtils.lerp(varsayilanKameraZ, 48, zoomCurrent);
    camera.position.x = mouseX * 26 * (1 - zoomCurrent * 0.90);
    camera.position.y = -mouseY * 20 * (1 - zoomCurrent * 0.90);
    camera.lookAt(0, 0, 0);

    // TS Grubu 3D Açısal Eğim & Canlı Nefes Salınımı
    const etkiKatsayisi = (1 - zoomCurrent * 0.94);
    tsGroup.rotation.y = mouseX * 0.38 * etkiKatsayisi;
    tsGroup.rotation.x = -mouseY * 0.28 * etkiKatsayisi;
    tsGroup.position.y = Math.sin(saat * 1.2) * 5 * etkiKatsayisi;

    // Parçacıkların Yakınlaşırken Dışa Doğru Patlama (Hyper-Speed Warp) Efekti
    if (tsGeometry && tsBasePos) {
      const pos = tsGeometry.attributes.position.array;
      const warp = Math.pow(zoomCurrent, 2.1) * 320;

      for (let i = 0; i < tsCount; i++) {
        const bx = tsBasePos[i * 3];
        const by = tsBasePos[i * 3 + 1];
        const bz = tsBasePos[i * 3 + 2];

        const angle = Math.atan2(by, bx);
        const bireyselWarp = warp * (0.80 + ((i * 13) % 10) * 0.04);

        // İnce organik titreşim + radyal warp patlaması
        pos[i * 3]     = bx + Math.cos(angle) * bireyselWarp + Math.sin(saat * 1.6 + i) * 1.0;
        pos[i * 3 + 1] = by + Math.sin(angle) * bireyselWarp + Math.cos(saat * 1.6 + i) * 1.0;
        pos[i * 3 + 2] = bz + (zoomCurrent * 105);
      }
      tsGeometry.attributes.position.needsUpdate = true;
    }

    // Constellation Çizgileri: Yakınlaştıkça zarifçe eriyerek kaybolur
    if (lineMaterial) {
      lineMaterial.opacity = Math.max(0, (1 - zoomCurrent * 1.6) * 0.32);
    }

    // Uzay Yıldızlarının Yavaş Kozmik Dönüşü
    tozParticles.rotation.y = saat * 0.03;
    tozParticles.rotation.x = Math.sin(saat * 0.02) * 0.04;

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
