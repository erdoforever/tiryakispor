/* ============================================================
   TiryakiSPOR — Admin 3D Pure Black Interactive "TS" Point Particle System
   Simsiyah arka plan, sadece noktalardan oluşan "T" ve "S" gövdeleri,
   fare üzerine gelince o noktayı belirginleştiren (büyüten ve parlatan)
   interaktif 3D hover sistemi ve warp zoom oturum terminali
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
  const girisEkrani   = document.getElementById("girisEkrani");

  const azHareket = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Geniş açılı kamera mesafesi (Ferah, tam kadraj)
  function hesaplaKameraZ() {
    return window.innerWidth < 768 ? 580 : 460;
  }

  // Sahne, Kamera, Renderer (Simsiyah Zemin)
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
    renderer.setClearColor(0x000000, 1); // Simsiyah arka plan
  } catch (err) {
    console.warn("WebGL başlatılamadı:", err);
    return;
  }

  // Pin-Point Kristal Yıldız Dokusu (Saf Parlak Beyaz Kristal Yıldız Işığı)
  function parcaDokusuOlustur() {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext("2d");
    const rad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    rad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    rad.addColorStop(0.25, "rgba(255, 255, 255, 0.90)");
    rad.addColorStop(0.60, "rgba(255, 255, 255, 0.25)");
    rad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  }
  const particleTexture = parcaDokusuOlustur();

  // ---- 3D GEOMETRİK "TS" NOKTA GRUBU ----
  const tsGroup = new THREE.Group();
  scene.add(tsGroup);

  let tsGeometry = null;
  let tsPointsMesh = null;
  let tsBasePos = null;
  let tsSizes = null;
  let tsColors = null;
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

  function geometrikTsNoktalariUret() {
    // KESKİN GEOMETRİK "T" VE "S" POLİGONLARI
    const polyT = [
      [-190, 125],
      [-15,  125],
      [-15,   75],
      [-75,   75],
      [-75, -125],
      [-130,-125],
      [-130,  75],
      [-190,  75]
    ];

    const polyS = [
      [20,   125],
      [175,  125],
      [190,  110],
      [190,   30],
      [85,    30],
      [85,   -10],
      [190,  -10],
      [190, -125],
      [35,  -125],
      [20,  -110],
      [20,   -30],
      [125,  -30],
      [125,   10],
      [20,    10]
    ];

    // Nokta Örnekleme (T ve S sadece noktalardan oluşur)
    const tIc = poligonIciOrnekle(polyT, 1500);
    const tKenar = poligonCevresiOrnekle(polyT, 3.0);

    const sIc = poligonIciOrnekle(polyS, 1700);
    const sKenar = poligonCevresiOrnekle(polyS, 3.0);

    const ham2D = [...tIc, ...tKenar, ...sIc, ...sKenar];
    tsCount = ham2D.length / 2;

    const tumNoktalar3D = new Float32Array(tsCount * 3);
    tsSizes = new Float32Array(tsCount);
    tsColors = new Float32Array(tsCount * 3);

    for (let i = 0; i < tsCount; i++) {
      const x = ham2D[i * 2];
      const y = ham2D[i * 2 + 1];
      const z = (Math.random() - 0.5) * 16 + Math.cos(x * 0.015) * 6;

      tumNoktalar3D[i * 3]     = x;
      tumNoktalar3D[i * 3 + 1] = y;
      tumNoktalar3D[i * 3 + 2] = z;

      tsSizes[i] = 2.8; // Varsayılan nokta boyutu
      // Saf Kristal Beyaz (#FFFFFF)
      tsColors[i * 3]     = 1.0;
      tsColors[i * 3 + 1] = 1.0;
      tsColors[i * 3 + 2] = 1.0;
    }

    tsBasePos = new Float32Array(tumNoktalar3D);
    const curPos = new Float32Array(tumNoktalar3D);

    if (tsPointsMesh) tsGroup.remove(tsPointsMesh);

    // Her parçacığın boyut ve rengini ayrı yöneten ShaderMaterial
    tsGeometry = new THREE.BufferGeometry();
    tsGeometry.setAttribute("position", new THREE.BufferAttribute(curPos, 3));
    tsGeometry.setAttribute("aSize", new THREE.BufferAttribute(tsSizes, 1));
    tsGeometry.setAttribute("aColor", new THREE.BufferAttribute(tsColors, 3));

    const tsShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: particleTexture }
      },
      vertexShader: [
        "attribute float aSize;",
        "attribute vec3 aColor;",
        "varying vec3 vColor;",
        "void main() {",
        "  vColor = aColor;",
        "  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);",
        "  gl_PointSize = aSize * (380.0 / -mvPosition.z);",
        "  gl_Position = projectionMatrix * mvPosition;",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform sampler2D pointTexture;",
        "varying vec3 vColor;",
        "void main() {",
        "  vec4 tex = texture2D(pointTexture, gl_PointCoord);",
        "  gl_FragColor = vec4(vColor, tex.a) * tex;",
        "}"
      ].join("\n"),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    tsPointsMesh = new THREE.Points(tsGeometry, tsShaderMaterial);
    tsGroup.add(tsPointsMesh);
  }

  // İlk Nokta Üretimi
  geometrikTsNoktalariUret();

  // ---- DERİNLİK UZAY YILDIZLARI (COSMIC DUST) ----
  const TOZ_SAYISI = 400;
  const tozGeometri = new THREE.BufferGeometry();
  const tozPozisyonlar = new Float32Array(TOZ_SAYISI * 3);

  for (let i = 0; i < TOZ_SAYISI; i++) {
    tozPozisyonlar[i * 3]     = (Math.random() - 0.5) * 1600;
    tozPozisyonlar[i * 3 + 1] = (Math.random() - 0.5) * 1200;
    tozPozisyonlar[i * 3 + 2] = (Math.random() - 0.5) * 1400 - 100;
  }
  tozGeometri.setAttribute("position", new THREE.BufferAttribute(tozPozisyonlar, 3));

  const tozMateryal = new THREE.PointsMaterial({
    color: 0x8A92A0,
    size: 2.0,
    map: particleTexture,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const tozParticles = new THREE.Points(tozGeometri, tozMateryal);
  scene.add(tozParticles);

  // ---- ETKİLEŞİMLİ AŞAMALI YAKINLAŞMA (PROGRESSIVE SCROLL ZOOM-TO-LOGIN) MOTORU ----
  let isZoomed = azHareket;
  let zoomCurrent = azHareket ? 1 : 0;
  let zoomTarget = azHareket ? 1 : 0;
  let focusTimer = null;
  let focusVerildi = false;

  if (azHareket && girisKutu) {
    girisKutu.classList.add("aktif");
    if (portalKontrol) portalKontrol.classList.add("gizle");
  }

  function setZoomHedef(val) {
    if (azHareket) return;
    zoomTarget = Math.max(0, Math.min(1, val));
    isZoomed = (zoomTarget >= 0.85);

    if (zoomTarget < 0.60) {
      clearTimeout(focusTimer);
      focusVerildi = false;
      if (sifreInput && document.activeElement === sifreInput) {
        sifreInput.blur();
      }
    }
  }

  function zoomGiris() {
    setZoomHedef(1.0);
  }

  function zoomCikis() {
    setZoomHedef(0.0);
  }

  // Tıklama Olayları
  if (enterBtn) enterBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    zoomGiris();
  });

  if (geriBtn) geriBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    zoomCikis();
  });

  window.addEventListener("click", (e) => {
    if (zoomTarget < 0.40) {
      if (!girisKutu || !girisKutu.contains(e.target)) {
        zoomGiris();
      }
    } else {
      if (girisKutu && !girisKutu.contains(e.target)) {
        zoomCikis();
      }
    }
  });

  // Her Scroll Kaydırmada T ve S'ye Aşamalı Yaklaşma Motoru
  window.addEventListener("wheel", (e) => {
    // e.deltaY > 0: İleri/aşağı kaydırma -> T ve S'ye doğru adım adım yaklaşır
    // e.deltaY < 0: Geri/yukarı kaydırma -> Uzaklaşarak 3D TS'ye geri döner
    const delta = e.deltaY;
    let adim = 0;
    if (Math.abs(delta) >= 50) {
      // Standart fare tekerleği tıkı (Notch ~100px) -> Her scroll tıkında %18-20 yaklaş
      adim = Math.sign(delta) * 0.18;
    } else {
      // Hassas Touchpad / Magic Mouse kaydırması
      adim = delta * 0.0028;
    }
    setZoomHedef(zoomTarget + adim);
  }, { passive: true });

  // Dokunmatik Ekranlar (Mobil / Tablet Kaydırma Desteği)
  let touchStartY = 0;
  window.addEventListener("touchstart", (e) => {
    if (e.touches && e.touches.length > 0) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (e.touches && e.touches.length > 0) {
      const curY = e.touches[0].clientY;
      const farkY = touchStartY - curY; // Yukarı kaydırma (ileri scroll gibi)
      if (Math.abs(farkY) > 14) {
        touchStartY = curY;
        const adim = Math.sign(farkY) * 0.15;
        setZoomHedef(zoomTarget + adim);
      }
    }
  }, { passive: true });

  // Klavye Kontrolleri
  window.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && zoomTarget < 0.40 && document.activeElement !== sifreInput) {
      e.preventDefault();
      zoomGiris();
    } else if (e.key === "Escape" && zoomTarget > 0.30) {
      zoomCikis();
    }
  });

  // ---- FARE & PARALLAX & İNTERAKTİF HOVER HESAPLAMASI ----
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;

  // 3D Düzlem Üzerinde Fare Işınlama (Raycasting)
  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2(-999, -999);
  const planeZ0 = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const mouseWorld = new THREE.Vector3();
  const localMouse = new THREE.Vector3(-999, -999, 0);

  function onPointerMove(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    targetX = ((clientX - window.innerWidth / 2) / (window.innerWidth / 2));
    targetY = ((clientY - window.innerHeight / 2) / (window.innerHeight / 2));

    // Normalize Cihaz Koordinatları (-1 to +1)
    mouseNDC.x = (clientX / window.innerWidth) * 2 - 1;
    mouseNDC.y = -(clientY / window.innerHeight) * 2 + 1;
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

  // ---- ANİMASYON DÖNGÜSÜ & NOKTA HOVER PARLAMA MOTORU ----
  let saat = 0;
  const hoverYaricap = 42; // Fare hover etki alanı yarıçapı

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

    // Farenin 3D Düzlemdeki Kesişim Noktası
    raycaster.setFromCamera(mouseNDC, camera);
    if (raycaster.ray.intersectPlane(planeZ0, mouseWorld)) {
      localMouse.copy(mouseWorld);
      tsGroup.worldToLocal(localMouse);
    } else {
      localMouse.set(-999, -999, 0);
    }

    // Parçacık Pozisyonları ve İnteraktif Fare Hover (Noktayı Belirginleştirme)
    if (tsGeometry && tsBasePos) {
      const pos = tsGeometry.attributes.position.array;
      const aSize = tsGeometry.attributes.aSize.array;
      const aColor = tsGeometry.attributes.aColor.array;
      const warp = Math.pow(zoomCurrent, 2.3) * 360;
      const hoverAktif = (zoomCurrent < 0.50); // İlk %50'lik dilimde hover her zaman aktif

      for (let i = 0; i < tsCount; i++) {
        const bx = tsBasePos[i * 3];
        const by = tsBasePos[i * 3 + 1];
        const bz = tsBasePos[i * 3 + 2];

        // Fare mesafesi hesapla
        let hoverEtkisi = 0;
        if (hoverAktif) {
          const mdx = bx - localMouse.x;
          const mdy = by - localMouse.y;
          const mesafe = Math.hypot(mdx, mdy);
          if (mesafe < hoverYaricap) {
            hoverEtkisi = Math.pow(1 - mesafe / hoverYaricap, 1.8);
          }
        }

        // 1. Noktayı Belirginleştir: Hover olunca boyut büyür (2.8 -> 8.2)
        const hedefBoyut = 2.8 + hoverEtkisi * 5.4;
        aSize[i] += (hedefBoyut - aSize[i]) * 0.20;

        // 2. Noktayı Belirginleştir: Saf parlak beyaz (#FFFFFF) ve hover ile süper ışıltı
        const hedefL = 1.0 + hoverEtkisi * 0.45;
        aColor[i * 3]     += (hedefL - aColor[i * 3]) * 0.20;
        aColor[i * 3 + 1] += (hedefL - aColor[i * 3 + 1]) * 0.20;
        aColor[i * 3 + 2] += (hedefL - aColor[i * 3 + 2]) * 0.20;

        // 3. 3D Manyetik Yükselme (Hover olunca kameraya doğru öne süzülür)
        const hoverZ = hoverEtkisi * 16.0;

        // 4. Warp & Titreşim
        const angle = Math.atan2(by, bx);
        const bireyselWarp = warp * (0.80 + ((i * 13) % 10) * 0.04);

        pos[i * 3]     = bx + Math.cos(angle) * bireyselWarp + Math.sin(saat * 1.6 + i) * 0.8;
        pos[i * 3 + 1] = by + Math.sin(angle) * bireyselWarp + Math.cos(saat * 1.6 + i) * 0.8;
        pos[i * 3 + 2] = bz + hoverZ + (zoomCurrent * 105);
      }

      tsGeometry.attributes.position.needsUpdate = true;
      tsGeometry.attributes.aSize.needsUpdate = true;
      tsGeometry.attributes.aColor.needsUpdate = true;
    }

    // Aşamalı UI Senkronizasyonu (Alt Buton & Giriş Kartı)
    if (portalKontrol) {
      const hapOpaklik = Math.max(0, 1 - zoomCurrent * 2.5);
      portalKontrol.style.opacity = hapOpaklik.toFixed(3);
      portalKontrol.style.pointerEvents = (hapOpaklik > 0.15) ? "auto" : "none";
      if (hapOpaklik <= 0.02) {
        portalKontrol.classList.add("gizle");
      } else {
        portalKontrol.classList.remove("gizle");
      }
    }

    if (girisKutu) {
      if (zoomCurrent < 0.38) {
        girisKutu.style.opacity = "0";
        girisKutu.style.pointerEvents = "none";
        girisKutu.style.transform = "scale(0.72) translateY(28px)";
        girisKutu.classList.remove("aktif");
      } else {
        const kartProg = Math.min(1, (zoomCurrent - 0.38) / 0.62);
        girisKutu.style.opacity = kartProg.toFixed(3);
        const curScale = (0.72 + kartProg * 0.28).toFixed(3);
        const curY = ((1 - kartProg) * 28).toFixed(1);
        girisKutu.style.transform = `scale(${curScale}) translateY(${curY}px)`;

        if (kartProg >= 0.88) {
          girisKutu.style.pointerEvents = "auto";
          girisKutu.classList.add("aktif");
          if (zoomTarget >= 0.95 && !focusVerildi && sifreInput) {
            focusVerildi = true;
            clearTimeout(focusTimer);
            focusTimer = setTimeout(() => {
              if (zoomTarget >= 0.95 && sifreInput) {
                sifreInput.focus();
              }
            }, 100);
          }
        } else {
          girisKutu.style.pointerEvents = "none";
          girisKutu.classList.remove("aktif");
          focusVerildi = false;
        }
      }
    }

    // Uzay Yıldızlarının Yavaş Kozmik Dönüşü
    tozParticles.rotation.y = saat * 0.025;
    tozParticles.rotation.x = Math.sin(saat * 0.018) * 0.035;

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
