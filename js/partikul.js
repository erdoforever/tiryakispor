/* ============================================================
   TiryakiSPOR — Admin 3D Pure Luxury "TS" Monogram & Constellation System
   Three.js tabanlı, saf ve zarif "TS" (TiryakiSPOR) monogramı,
   kristalize yıldız kümesi, geniş açılı kadraj ve warp zoom geçişi
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

  // Geniş açılı kamera mesafesi (Masaüstü ve mobil için ferah, asil kadraj)
  function hesaplaKameraZ() {
    return window.innerWidth < 768 ? 640 : 520;
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

  // Işıltılı Yuvarlak Parçacık Dokusu (Pürüzsüz yıldız ışığı)
  function parcaDokusuOlustur() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    const rad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    rad.addColorStop(0, "rgba(255, 255, 255, 1)");
    rad.addColorStop(0.20, "rgba(255, 255, 255, 0.90)");
    rad.addColorStop(0.55, "rgba(255, 255, 255, 0.28)");
    rad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  const particleTexture = parcaDokusuOlustur();

  // ---- SAF VE LÜKS "TS" MONOGRAM GRUBU ----
  const tsGroup = new THREE.Group();
  scene.add(tsGroup);

  let tsGeometry = null;
  let tsPointsMesh = null;
  let lineSegmentsMesh = null;
  let lineMaterial = null;
  let tsBasePos = null;
  let tsCount = 0;

  function safTsMonogramUret() {
    // 1. Ekran Dışı Canvas: Saf, Klas ve İnce Detaylı "TS" Monogramı
    const oc = document.createElement("canvas");
    const W = 680;
    const H = 500;
    oc.width = W;
    oc.height = H;
    const ctx = oc.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    // Tipografi: İtalik, asil, sportif lüks harfler
    ctx.font = "italic 900 215px 'Barlow Condensed', 'Inter', -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // "T" ve "S" Harflerinin İç İçe Geçen (Interlocking) Lüks Yerleşimi
    // T Harfi (Sol tarafta, dik ve asil)
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("T", 258, 250);

    // S Harfi (Sağ tarafta, T'nin sağ kanadıyla zarifçe kesişerek iç içe geçen)
    ctx.fillText("S", 392, 250);

    // Kontur Vurguları (Harflerin keskin elmas hatları için)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 4;
    ctx.strokeText("T", 258, 250);
    ctx.strokeText("S", 392, 250);

    // 2. Poisson-Disk Tarzı Boşluklu Örnekleme (Scribble/çizgi karmaşasını tamamen önler)
    const imgData = ctx.getImageData(0, 0, W, H).data;
    const minDist = 8.6; // Yıldızlar arası minimum mesafe
    const cellSize = minDist;
    const cols = Math.ceil(W / cellSize);
    const rows = Math.ceil(H / cellSize);
    const grid = new Int32Array(cols * rows).fill(-1);

    const hamNoktalar = [];
    const skala = 0.70; // Geniş açıda ferah, altın oranlı boyutlandırma
    const merkezX = 325;
    const merkezY = 250;

    for (let y = 110; y < 390; y += 3) {
      for (let x = 140; x < 520; x += 3) {
        const idx = (y * W + x) * 4;
        const parlaklik = (imgData[idx] + imgData[idx + 1] + imgData[idx + 2]) / 3;

        if (parlaklik > 120) {
          // Doğal organik yıldız konumu için hafif titreşim
          const jx = x + (Math.random() - 0.5) * 2.2;
          const jy = y + (Math.random() - 0.5) * 2.2;

          const gx = Math.floor(jx / cellSize);
          const gy = Math.floor(jy / cellSize);

          // 9 komşu hücre kontrolü
          let cakisma = false;
          for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
              const cx = gx + ox;
              const cy = gy + oy;
              if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
                const pIdx = grid[cy * cols + cx];
                if (pIdx !== -1) {
                  const ex = hamNoktalar[pIdx * 3];
                  const ey = hamNoktalar[pIdx * 3 + 1];
                  // 2D mesafeye dönüştür
                  const realEx = ex / skala + merkezX;
                  const realEy = -ey / skala + merkezY;
                  const d2 = (realEx - jx) * (realEx - jx) + (realEy - jy) * (realEy - jy);
                  if (d2 < minDist * minDist) {
                    cakisma = true;
                    break;
                  }
                }
              }
            }
            if (cakisma) break;
          }

          if (!cakisma) {
            const posX = (jx - merkezX) * skala;
            const posY = -(jy - merkezY) * skala;
            // Kristal 3D derinlik kalınlığı
            const posZ = (Math.random() - 0.5) * 24 + Math.cos(posX * 0.02) * 10;

            const pNum = hamNoktalar.length / 3;
            hamNoktalar.push(posX, posY, posZ);
            grid[gy * cols + gx] = pNum;
          }
        }
      }
    }

    tsCount = hamNoktalar.length / 3;
    tsBasePos = new Float32Array(hamNoktalar);
    const tsCurPos = new Float32Array(hamNoktalar);

    // Önceki mesh'leri temizle
    if (tsPointsMesh) tsGroup.remove(tsPointsMesh);
    if (lineSegmentsMesh) tsGroup.remove(lineSegmentsMesh);

    // 3. Parçacık BufferGeometry
    tsGeometry = new THREE.BufferGeometry();
    tsGeometry.setAttribute("position", new THREE.BufferAttribute(tsCurPos, 3));

    const tsMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 3.5,
      map: particleTexture,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    tsPointsMesh = new THREE.Points(tsGeometry, tsMaterial);
    tsGroup.add(tsPointsMesh);

    // 4. Kristal Triangulation Constellation Çizgileri
    // Yalnızca doğal komşu yıldızları bağlar; temiz, geometrik elmas kafesi oluşturur
    const cizgiNoktalari = [];
    const minMesafeKare = 6.0 * 6.0;
    const maxMesafeKare = 15.5 * 15.5;

    for (let i = 0; i < tsCount; i++) {
      const x1 = tsBasePos[i * 3];
      const y1 = tsBasePos[i * 3 + 1];
      const z1 = tsBasePos[i * 3 + 2];
      let baglanti = 0;

      for (let j = i + 1; j < tsCount; j++) {
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

  // İlk Monogram Üretimi
  safTsMonogramUret();

  // Web Fontları yüklendiğinde kusursuz tipografi için tazele
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      safTsMonogramUret();
    }).catch(() => {});
  }

  // ---- DERİNLİK UZAY YILDIZLARI (COSMIC DUST) ----
  const TOZ_SAYISI = 450;
  const tozGeometri = new THREE.BufferGeometry();
  const tozPozisyonlar = new Float32Array(TOZ_SAYISI * 3);

  for (let i = 0; i < TOZ_SAYISI; i++) {
    tozPozisyonlar[i * 3]     = (Math.random() - 0.5) * 1500;
    tozPozisyonlar[i * 3 + 1] = (Math.random() - 0.5) * 1100;
    tozPozisyonlar[i * 3 + 2] = (Math.random() - 0.5) * 1300 - 100;
  }
  tozGeometri.setAttribute("position", new THREE.BufferAttribute(tozPozisyonlar, 3));

  const tozMateryal = new THREE.PointsMaterial({
    color: 0xEDF2F7,
    size: 2.6,
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

    // Kamera Pozisyonu: Geniş açı varsayilanKameraZ'den (520-640) z = 48'e (içinden geçiş)
    camera.position.z = THREE.MathUtils.lerp(varsayilanKameraZ, 48, zoomCurrent);
    camera.position.x = mouseX * 24 * (1 - zoomCurrent * 0.90);
    camera.position.y = -mouseY * 18 * (1 - zoomCurrent * 0.90);
    camera.lookAt(0, 0, 0);

    // TS Monogram Grubu 3D Açısal Eğim & Canlı Nefes Salınımı
    const etkiKatsayisi = (1 - zoomCurrent * 0.94);
    tsGroup.rotation.y = mouseX * 0.36 * etkiKatsayisi;
    tsGroup.rotation.x = -mouseY * 0.26 * etkiKatsayisi;
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
