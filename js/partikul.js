/* ============================================================
   TiryakiSPOR — Admin 3D Cyber-Geometric "TS" Constellation Particle System
   Referans görseldeki birebir stil: Keskin geometrik "T" ve "S" gövdeleri,
   içini dolduran binlerce parlak yıldız parçacığı, ince örümcek ağı kafesi (LineSegments)
   ve ortadaki kırık yıldırım yarığı
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

  // Geniş açılı kamera mesafesi (Referans görseldeki ferah, tam kadraj)
  function hesaplaKameraZ() {
    return window.innerWidth < 768 ? 580 : 460;
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

  // Pin-Point Keskin Yıldız Dokusu (Referans görseldeki minik kristal parıltı)
  function parcaDokusuOlustur() {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext("2d");
    const rad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    rad.addColorStop(0, "rgba(255, 255, 255, 1)");
    rad.addColorStop(0.25, "rgba(255, 255, 255, 0.85)");
    rad.addColorStop(0.60, "rgba(255, 255, 255, 0.20)");
    rad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  }
  const particleTexture = parcaDokusuOlustur();

  // ---- 3D GEOMETRİK "TS" GRUBU ----
  const tsGroup = new THREE.Group();
  scene.add(tsGroup);

  let tsGeometry = null;
  let tsPointsMesh = null;
  let lineSegmentsMesh = null;
  let lineMaterial = null;
  let lightningMesh = null;
  let tsBasePos = null;
  let tsCount = 0;

  // Poligon İçi Nokta Kontrolü (Ray-Casting Algoritması)
  function noktaPoligondaMi(x, y, vs) {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function poligonSinirlari(vs) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < vs.length; i++) {
      const x = vs[i][0], y = vs[i][1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { minX, maxX, minY, maxY };
  }

  // Poligon İçine Yoğun Düzgün Yıldız Örnekleme (Rejection Sampling)
  function poligonIciOrnekle(vs, hedefSayi) {
    const b = poligonSinirlari(vs);
    const pts = [];
    const maxDeneme = hedefSayi * 40;
    let deneme = 0;

    while (pts.length < hedefSayi * 2 && deneme < maxDeneme) {
      deneme++;
      const x = b.minX + Math.random() * (b.maxX - b.minX);
      const y = b.minY + Math.random() * (b.maxY - b.minY);
      if (noktaPoligondaMi(x, y, vs)) {
        pts.push(x, y);
      }
    }
    return pts;
  }

  // Poligon Çevresi Boyunca Keskin Sınır Yıldızları
  function poligonCevresiOrnekle(vs, adimMesafe) {
    const edgePts = [];
    for (let i = 0; i < vs.length; i++) {
      const p1 = vs[i];
      const p2 = vs[(i + 1) % vs.length];
      const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const adimSayisi = Math.ceil(dist / adimMesafe);
      for (let s = 0; s < adimSayisi; s++) {
        const t = s / adimSayisi;
        const x = p1[0] + (p2[0] - p1[0]) * t;
        const y = p1[1] + (p2[1] - p1[1]) * t;
        edgePts.push(x, y);
      }
    }
    return edgePts;
  }

  function geometrikTsUret() {
    // 1. KESKİN GEOMETRİK "T" VE "S" POLİGONLARI (Referans görseldeki açılı silüet)
    // Sol Parça: Keskin Geometrik "T"
    const polyT = [
      [-190, 125], // Sol üst
      [-15,  125], // Sağ üst (orta yarık tarafı)
      [-15,   75], // Sağ üst alt kesim
      [-75,   75], // T gövdesine dönüş
      [-75, -125], // T sütun alt sağ
      [-130,-125], // T sütun alt sol
      [-130,  75], // T sütun sol üst
      [-190,  75]  // Sol alt kesim
    ];

    // Sağ Parça: Keskin Geometrik "S" (Referans görseldeki açılı lightning / sporty dilimler)
    const polyS = [
      [20,   125], // Sol üst (orta yarık tarafı)
      [175,  125], // Sağ üst
      [190,  110], // Sağ üst pah
      [190,   30], // Sağ üst iniş
      [85,    30], // Orta raf sol giriş
      [85,   -10], // Orta raf iniş
      [190,  -10], // Orta raf sağ dönüş
      [190, -125], // Sağ alt iniş
      [35,  -125], // Sol alt
      [20,  -110], // Sol alt pah
      [20,   -30], // Sol alt çıkış
      [125,  -30], // Orta alt raf sağ
      [125,   10], // Orta alt raf çıkış
      [20,    10]  // Sol orta raf dönüş
    ];

    // 2. Binlerce Nokta Örnekleme (İç dolgu + Keskin dış sınır)
    const tIc = poligonIciOrnekle(polyT, 1400);
    const tKenar = poligonCevresiOrnekle(polyT, 3.2);

    const sIc = poligonIciOrnekle(polyS, 1600);
    const sKenar = poligonCevresiOrnekle(polyS, 3.2);

    const ham2D = [...tIc, ...tKenar, ...sIc, ...sKenar];
    tsCount = ham2D.length / 2;

    const tumNoktalar3D = new Float32Array(tsCount * 3);
    for (let i = 0; i < tsCount; i++) {
      const x = ham2D[i * 2];
      const y = ham2D[i * 2 + 1];
      // Hafif 3D derinlik ve yüzey kavisi
      const z = (Math.random() - 0.5) * 16 + Math.cos(x * 0.015) * 6;

      tumNoktalar3D[i * 3]     = x;
      tumNoktalar3D[i * 3 + 1] = y;
      tumNoktalar3D[i * 3 + 2] = z;
    }

    tsBasePos = new Float32Array(tumNoktalar3D);
    const curPos = new Float32Array(tumNoktalar3D);

    // Önceki nesneleri temizle
    if (tsPointsMesh) tsGroup.remove(tsPointsMesh);
    if (lineSegmentsMesh) tsGroup.remove(lineSegmentsMesh);
    if (lightningMesh) tsGroup.remove(lightningMesh);

    // 3. Parçacık BufferGeometry
    tsGeometry = new THREE.BufferGeometry();
    tsGeometry.setAttribute("position", new THREE.BufferAttribute(curPos, 3));

    const tsMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 2.3,
      map: particleTexture,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    tsPointsMesh = new THREE.Points(tsGeometry, tsMaterial);
    tsGroup.add(tsPointsMesh);

    // 4. Yıldız Kümesi Ağı (Constellation Line Segments)
    // Hızlı Spatial Binning ile referanstaki gibi ince kristalize üçgenler ağı
    const cellSize = 13;
    const cellMap = new Map();
    for (let i = 0; i < tsCount; i++) {
      const x = tsBasePos[i * 3];
      const y = tsBasePos[i * 3 + 1];
      const cx = Math.floor(x / cellSize);
      const cy = Math.floor(y / cellSize);
      const key = (cx << 16) ^ cy;
      if (!cellMap.has(key)) cellMap.set(key, []);
      cellMap.get(key).push(i);
    }

    const cizgiNoktalari = [];
    const minD2 = 4.0 * 4.0;
    const maxD2 = 12.5 * 12.5;

    for (let i = 0; i < tsCount; i++) {
      const x1 = tsBasePos[i * 3];
      const y1 = tsBasePos[i * 3 + 1];
      const z1 = tsBasePos[i * 3 + 2];
      const cx = Math.floor(x1 / cellSize);
      const cy = Math.floor(y1 / cellSize);
      let baglanti = 0;

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const key = ((cx + ox) << 16) ^ (cy + oy);
          const bucket = cellMap.get(key);
          if (bucket) {
            for (let b = 0; b < bucket.length; b++) {
              const j = bucket[b];
              if (j > i) {
                const x2 = tsBasePos[j * 3];
                const y2 = tsBasePos[j * 3 + 1];
                const z2 = tsBasePos[j * 3 + 2];
                const d2 = (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2) + (z1 - z2) * (z1 - z2);
                if (d2 >= minD2 && d2 <= maxD2) {
                  cizgiNoktalari.push(x1, y1, z1);
                  cizgiNoktalari.push(x2, y2, z2);
                  baglanti++;
                  if (baglanti >= 3) break;
                }
              }
            }
          }
          if (baglanti >= 3) break;
        }
        if (baglanti >= 3) break;
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

    // 5. Orta Zikzak Yıldırım Çatlağı (Referans görseldeki morumsu/gümüş merkez yarık)
    const yarıkNoktalar = [
      2,  135,  0,
      -3,  95,  2,
       4,  50, -1,
      -2,   5,  3,
       5, -45, -2,
      -4, -90,  1,
       2,-135,  0
    ];
    const lightGeom = new THREE.BufferGeometry();
    lightGeom.setAttribute("position", new THREE.BufferAttribute(new Float32Array(yarıkNoktalar), 3));
    const lightMat = new THREE.LineBasicMaterial({
      color: 0x9D9FC9,
      transparent: true,
      opacity: 0.50,
      blending: THREE.AdditiveBlending
    });
    lightningMesh = new THREE.Line(lightGeom, lightMat);
    tsGroup.add(lightningMesh);
  }

  // İlk Geometrik Üretim
  geometrikTsUret();

  // ---- DERİNLİK UZAY YILDIZLARI (COSMIC DUST) ----
  const TOZ_SAYISI = 450;
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
    size: 2.2,
    map: particleTexture,
    transparent: true,
    opacity: 0.40,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const tozParticles = new THREE.Points(tozGeometri, tozMateryal);
  scene.add(tozParticles);

  // ---- ETKİLEŞİMLİ YAKINLAŞMA (ZOOM-TO-LOGIN) MOTORU ----
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

    saat += azHareket ? 0.005 : 0.018;

    // Yumuşak Mouse Takibi
    mouseX += (targetX - mouseX) * 0.05;
    mouseY += (targetY - mouseY) * 0.05;

    // Yumuşak Yakınlaşma (Lerp)
    zoomCurrent += (zoomTarget - zoomCurrent) * 0.058;

    // Kamera Pozisyonu: Geniş açı varsayilanKameraZ'den z = 48'e
    camera.position.z = THREE.MathUtils.lerp(varsayilanKameraZ, 48, zoomCurrent);
    camera.position.x = mouseX * 24 * (1 - zoomCurrent * 0.90);
    camera.position.y = -mouseY * 18 * (1 - zoomCurrent * 0.90);
    camera.lookAt(0, 0, 0);

    // TS Grubu 3D Açısal Eğim & Canlı Nefes Salınımı
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
        pos[i * 3]     = bx + Math.cos(angle) * bireyselWarp + Math.sin(saat * 1.6 + i) * 0.9;
        pos[i * 3 + 1] = by + Math.sin(angle) * bireyselWarp + Math.cos(saat * 1.6 + i) * 0.9;
        pos[i * 3 + 2] = bz + (zoomCurrent * 105);
      }
      tsGeometry.attributes.position.needsUpdate = true;
    }

    // Constellation Çizgileri: Yakınlaştıkça zarifçe eriyerek kaybolur
    if (lineMaterial) {
      lineMaterial.opacity = Math.max(0, (1 - zoomCurrent * 1.6) * 0.32);
    }
    if (lightningMesh) {
      lightningMesh.material.opacity = Math.max(0, (1 - zoomCurrent * 1.6) * 0.50);
    }

    // Uzay Yıldızlarının Yavaş Kozmik Dönüşü
    tozParticles.rotation.y = saat * 0.025;
    tozParticles.rotation.x = Math.sin(saat * 0.018) * 0.035;

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
