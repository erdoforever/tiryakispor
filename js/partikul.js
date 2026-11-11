/* ============================================================
   TiryakiSPOR — Admin 3D Interactive TS Particle Constellation System
   Three.js tabanlı, "TS" monogramlı yıldız kümesi, derinlik ağı
   ve yakınlaşınca (zoom-in) açılan Liquid Glass oturum terminali
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

  // Sahne, Kamera, Renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 3000);
  camera.position.set(0, 0, 390);

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

  // Dinamik Işıltılı Yuvarlak Parçacık Dokusu (Canvas ile üretilir)
  function parcaDokusuOlustur() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    const rad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    rad.addColorStop(0, "rgba(255, 255, 255, 1)");
    rad.addColorStop(0.22, "rgba(255, 255, 255, 0.88)");
    rad.addColorStop(0.55, "rgba(255, 255, 255, 0.28)");
    rad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  const particleTexture = parcaDokusuOlustur();

  // ---- "TS" MONOGRAM & GEOMETRİK KRİSTAL KÜME (CONSTELLATION) ----
  const tsGroup = new THREE.Group();
  scene.add(tsGroup);

  let tsGeometry = null;
  let tsPointsMesh = null;
  let lineSegmentsMesh = null;
  let lineMaterial = null;
  let tsBasePos = null;
  let tsCount = 0;

  function tsEmblemiUret() {
    // 1. Ekran dışı 2D Canvas'a Köşeli Geometrik Çerçeve + "TS" Çizimi
    const oc = document.createElement("canvas");
    const W = 500;
    const H = 380;
    oc.width = W;
    oc.height = H;
    const octx = oc.getContext("2d");

    octx.fillStyle = "#000000";
    octx.fillRect(0, 0, W, H);

    // Sol Açılı Geometrik Kanat
    octx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    octx.lineWidth = 6;
    octx.beginPath();
    octx.moveTo(45, 42);
    octx.lineTo(215, 42);
    octx.lineTo(200, 155);
    octx.lineTo(175, 155);
    octx.lineTo(215, 335);
    octx.lineTo(45, 42);
    octx.stroke();

    // Sağ Açılı Geometrik Kanat
    octx.beginPath();
    octx.moveTo(455, 42);
    octx.lineTo(285, 42);
    octx.lineTo(300, 155);
    octx.lineTo(325, 155);
    octx.lineTo(285, 335);
    octx.lineTo(455, 42);
    octx.stroke();

    // Orta Zikzak Yıldırım Bölmesi (Referans görseldeki dinamik kırık çizgi)
    octx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    octx.lineWidth = 3;
    octx.beginPath();
    octx.moveTo(250, 42);
    octx.lineTo(242, 120);
    octx.lineTo(258, 175);
    octx.lineTo(244, 235);
    octx.lineTo(250, 335);
    octx.stroke();

    // Merkez Güçlü "TS" Monogramı
    octx.fillStyle = "#FFFFFF";
    octx.font = "900 150px 'Barlow Condensed', 'Inter', -apple-system, sans-serif";
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillText("TS", 250, 185);

    // 2. Pikselleri 3D Koordinatlara Tara
    const imgData = octx.getImageData(0, 0, W, H).data;
    const hamNoktalar = [];
    const step = 5;

    for (let y = 30; y < H - 30; y += step) {
      for (let x = 35; x < W - 35; x += step) {
        const idx = (y * W + x) * 4;
        const parlaklik = (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3;
        if (parlaklik > 105) {
          const posX = (x - W / 2) * 1.32;
          const posY = -(y - H / 2) * 1.32;
          // Çift katmanlı kristal derinlik
          const posZ = (Math.random() - 0.5) * 42 + Math.cos(posX * 0.015) * 14;
          hamNoktalar.push(posX, posY, posZ);
        }
      }
    }

    tsCount = hamNoktalar.length / 3;
    tsBasePos = new Float32Array(hamNoktalar);
    const tsCurPos = new Float32Array(hamNoktalar);

    // Önceki varsa temizle
    if (tsPointsMesh) tsGroup.remove(tsPointsMesh);
    if (lineSegmentsMesh) tsGroup.remove(lineSegmentsMesh);

    // Parçacık Noktaları Mesh
    tsGeometry = new THREE.BufferGeometry();
    tsGeometry.setAttribute("position", new THREE.BufferAttribute(tsCurPos, 3));

    const tsMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 4.2,
      map: particleTexture,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    tsPointsMesh = new THREE.Points(tsGeometry, tsMaterial);
    tsGroup.add(tsPointsMesh);

    // 3. Constellation (Yıldız Kümesi) Bağlantı Çizgileri (LineSegments)
    const cizgiNoktalari = [];
    const maxMesafe = 19;
    const maxMesafeKare = maxMesafe * maxMesafe;

    // Performans için nokta örneklemesi
    for (let i = 0; i < tsCount; i += 2) {
      const x1 = tsBasePos[i * 3];
      const y1 = tsBasePos[i * 3 + 1];
      const z1 = tsBasePos[i * 3 + 2];
      let baglantiSayisi = 0;

      for (let j = i + 1; j < tsCount; j += 2) {
        if (baglantiSayisi >= 3) break;
        const x2 = tsBasePos[j * 3];
        const y2 = tsBasePos[j * 3 + 1];
        const z2 = tsBasePos[j * 3 + 2];

        const dx = x1 - x2;
        const dy = y1 - y2;
        const dz = z1 - z2;
        const d2 = dx * dx + dy * dy + dz * dz;

        if (d2 < maxMesafeKare && d2 > 16) {
          cizgiNoktalari.push(x1, y1, z1);
          cizgiNoktalari.push(x2, y2, z2);
          baglantiSayisi++;
        }
      }
    }

    if (cizgiNoktalari.length > 0) {
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(cizgiNoktalari), 3));
      lineMaterial = new THREE.LineBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      lineSegmentsMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
      tsGroup.add(lineSegmentsMesh);
    }
  }

  // İlk üretim
  tsEmblemiUret();

  // Web fontları yüklendiğinde "TS" harflerinin tam hizalı yenilenmesi
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      tsEmblemiUret();
    }).catch(() => {});
  }

  // ---- DERİNLİK UZAY TOZLARI (COSMIC STARFIELD) ----
  const TOZ_SAYISI = 480;
  const tozGeometri = new THREE.BufferGeometry();
  const tozPozisyonlar = new Float32Array(TOZ_SAYISI * 3);

  for (let i = 0; i < TOZ_SAYISI; i++) {
    tozPozisyonlar[i * 3]     = (Math.random() - 0.5) * 1500;
    tozPozisyonlar[i * 3 + 1] = (Math.random() - 0.5) * 1000;
    tozPozisyonlar[i * 3 + 2] = (Math.random() - 0.5) * 1200 - 100;
  }
  tozGeometri.setAttribute("position", new THREE.BufferAttribute(tozPozisyonlar, 3));

  const tozMateryal = new THREE.PointsMaterial({
    color: 0xDCE4EC,
    size: 2.8,
    map: particleTexture,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const tozParticles = new THREE.Points(tozGeometri, tozMateryal);
  scene.add(tozParticles);

  // ---- ETKİLEŞİMLİ YAKINLAŞMA (ZOOM-IN TO LOGIN) DURUM MOTORU ----
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

  // Fare Tekerleği (Scroll ile Yakınlaşma / Uzaklaşma)
  window.addEventListener("wheel", (e) => {
    if (e.deltaY > 16 && !isZoomed) {
      zoomGiris();
    } else if (e.deltaY < -16 && isZoomed && document.activeElement !== sifreInput) {
      zoomCikis();
    }
  }, { passive: true });

  // Klavye Kontrolleri (Enter = Yakınlaş, Esc = Geri Dön)
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

  // Ekran Boyutu Değişimi
  function onWindowResize() {
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

  // ---- ANİMASYON & YAKINLAŞMA DÖNGÜSÜ ----
  let saat = 0;
  function render() {
    if (!animasyonAktif) return;

    saat += azHareket ? 0.006 : 0.022;

    // Yumuşak Mouse Takibi
    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;

    // Yumuşak Yakınlaşma (Lerp)
    zoomCurrent += (zoomTarget - zoomCurrent) * 0.058;

    // Kamera Pozisyonu: z = 390'dan (amblem bakışı) z = 48'e (içinden geçiş)
    camera.position.z = THREE.MathUtils.lerp(390, 48, zoomCurrent);
    camera.position.x = mouseX * 28 * (1 - zoomCurrent * 0.88);
    camera.position.y = -mouseY * 22 * (1 - zoomCurrent * 0.88);
    camera.lookAt(0, 0, 0);

    // TS Grubu 3D Açısal Eğim & Salınım
    const etkiKatsayisi = (1 - zoomCurrent * 0.92);
    tsGroup.rotation.y = mouseX * 0.42 * etkiKatsayisi;
    tsGroup.rotation.x = -mouseY * 0.32 * etkiKatsayisi;
    tsGroup.position.y = Math.sin(saat * 1.3) * 6 * etkiKatsayisi;

    // Parçacıkların Yakınlaşma Sırasında Dışa Doğru Patlama (Hyper-Speed Warp) Efekti
    if (tsGeometry && tsBasePos) {
      const pos = tsGeometry.attributes.position.array;
      const warp = Math.pow(zoomCurrent, 2.1) * 310;

      for (let i = 0; i < tsCount; i++) {
        const bx = tsBasePos[i * 3];
        const by = tsBasePos[i * 3 + 1];
        const bz = tsBasePos[i * 3 + 2];

        const angle = Math.atan2(by, bx);
        const bireyselWarp = warp * (0.82 + ((i * 11) % 10) * 0.04);

        // İnce organik titreşim + radyal warp
        pos[i * 3]     = bx + Math.cos(angle) * bireyselWarp + Math.sin(saat * 1.8 + i) * 1.1;
        pos[i * 3 + 1] = by + Math.sin(angle) * bireyselWarp + Math.cos(saat * 1.8 + i) * 1.1;
        pos[i * 3 + 2] = bz + (zoomCurrent * 95);
      }
      tsGeometry.attributes.position.needsUpdate = true;
    }

    // Constellation Çizgileri: Yakınlaştıkça zarifçe dağılarak kaybolur
    if (lineMaterial) {
      lineMaterial.opacity = Math.max(0, (1 - zoomCurrent * 1.65) * 0.28);
    }

    // Uzay Tozlarının Ağır Dönüşü
    tozParticles.rotation.y = saat * 0.035;
    tozParticles.rotation.x = Math.sin(saat * 0.025) * 0.05;

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
