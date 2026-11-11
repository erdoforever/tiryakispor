/* ============================================================
   TiryakiSPOR — Admin 3D Interactive Particle System
   Three.js tabanlı, etkileşimli, akıcı 3D parçacık dalgası ve stüdyo derinliği
   ============================================================ */
(function () {
  "use strict";

  // WebGL & Three.js Kontrolü
  if (typeof THREE === "undefined") {
    console.warn("Three.js kütüphanesi yüklenemedi; parçacık sistemi atlanıyor.");
    return;
  }

  const canvas = document.getElementById("adminPartikulCanvas");
  if (!canvas) return;

  const azHareket = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Sahne, Kamera, Renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 3000);
  camera.position.set(0, 150, 420);

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

  // Dinamik Işıltılı Yuvarlak Parçacık Dokusu (Canvas ile üretilir, harici dosya istemez)
  function parcaDokusuOlustur() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    const rad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    rad.addColorStop(0, "rgba(255, 255, 255, 1)");
    rad.addColorStop(0.2, "rgba(255, 255, 255, 0.85)");
    rad.addColorStop(0.55, "rgba(255, 255, 255, 0.25)");
    rad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(c);
    return texture;
  }
  const particleTexture = parcaDokusuOlustur();

  // ---- 1. KATMAN: 3D AKICI DALGA (FLUID WAVE NETWORK) ----
  const ADET_X = 55;
  const ADET_Z = 45;
  const TOPLAM_DALGA = ADET_X * ADET_Z;
  const ARALIK_X = 26;
  const ARALIK_Z = 24;

  const dalgaGeometri = new THREE.BufferGeometry();
  const dalgaPozisyonlar = new Float32Array(TOPLAM_DALGA * 3);
  const dalgaOrijinalY = new Float32Array(TOPLAM_DALGA);

  let pIndex = 0;
  for (let ix = 0; ix < ADET_X; ix++) {
    for (let iz = 0; iz < ADET_Z; iz++) {
      const x = (ix - ADET_X / 2) * ARALIK_X;
      const z = (iz - ADET_Z / 2) * ARALIK_Z - 50;
      const y = Math.sin(ix * 0.25) * 20 + Math.cos(iz * 0.25) * 20 - 80;

      dalgaPozisyonlar[pIndex * 3]     = x;
      dalgaPozisyonlar[pIndex * 3 + 1] = y;
      dalgaPozisyonlar[pIndex * 3 + 2] = z;

      dalgaOrijinalY[pIndex] = y;
      pIndex++;
    }
  }

  dalgaGeometri.setAttribute("position", new THREE.BufferAttribute(dalgaPozisyonlar, 3));

  const dalgaMateryal = new THREE.PointsMaterial({
    color: 0xFFFFFF,
    size: 4.8,
    map: particleTexture,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const dalgaParticles = new THREE.Points(dalgaGeometri, dalgaMateryal);
  scene.add(dalgaParticles);

  // ---- 2. KATMAN: UZAYDA SÜZÜLEN DERİNLİK YILDIZLARI (COSMIC DUST) ----
  const TOZ_SAYISI = 450;
  const tozGeometri = new THREE.BufferGeometry();
  const tozPozisyonlar = new Float32Array(TOZ_SAYISI * 3);

  for (let i = 0; i < TOZ_SAYISI; i++) {
    tozPozisyonlar[i * 3]     = (Math.random() - 0.5) * 1400;
    tozPozisyonlar[i * 3 + 1] = (Math.random() - 0.5) * 900;
    tozPozisyonlar[i * 3 + 2] = (Math.random() - 0.5) * 1000;
  }
  tozGeometri.setAttribute("position", new THREE.BufferAttribute(tozPozisyonlar, 3));

  const tozMateryal = new THREE.PointsMaterial({
    color: 0xE8ECF4,
    size: 3.2,
    map: particleTexture,
    transparent: true,
    opacity: 0.40,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const tozParticles = new THREE.Points(tozGeometri, tozMateryal);
  scene.add(tozParticles);

  // ---- MOUSE & TOUCH ETKİLEŞİMİ (PARALLAX & DAMPING) ----
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  function onPointerMove(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    targetX = (clientX - window.innerWidth / 2) * 0.45;
    targetY = (clientY - window.innerHeight / 2) * 0.35;
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

  // Animasyon Döngüsü
  let saat = 0;
  function render() {
    if (!animasyonAktif) return;

    saat += azHareket ? 0.005 : 0.024;

    // Kamera Yumuşak Takibi (Lerp)
    mouseX += (targetX - mouseX) * 0.045;
    mouseY += (targetY - mouseY) * 0.045;

    camera.position.x = mouseX * 0.55;
    camera.position.y = 135 - mouseY * 0.45;
    camera.lookAt(0, -20, 0);

    // 1. Dalga Hareketi (Organik Matematiksel Sinüs Akışı)
    const positions = dalgaGeometri.attributes.position.array;
    let idx = 0;
    for (let ix = 0; ix < ADET_X; ix++) {
      for (let iz = 0; iz < ADET_Z; iz++) {
        // İki yönlü dinamik sıvı dalgası
        const dalga = Math.sin(ix * 0.28 + saat) * 26 + Math.cos(iz * 0.24 + saat * 0.8) * 26;
        positions[idx * 3 + 1] = dalgaOrijinalY[idx] + dalga;
        idx++;
      }
    }
    dalgaGeometri.attributes.position.needsUpdate = true;

    // 2. Toz Yıldızlarının Yavaş Rotasyonu
    tozParticles.rotation.y = saat * 0.04;
    tozParticles.rotation.x = Math.sin(saat * 0.03) * 0.06;

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
