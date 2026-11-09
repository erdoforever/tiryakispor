#!/usr/bin/env python3
"""TiryakiSPOR yayın paketi — siteyi KENDİ ADRESİNDE (Cloudflare Pages, Netlify vb.) yayınlamak için.

Kullanım:
    python3 tools/yayin.py --adres https://tiryakispor.pages.dev

Üretir:
    dist/yayin/                  yüklenecek klasör (index.html en üstte)
    dist/tiryakispor-yayin.zip   aynı klasörün zip'i (içinde üst klasör yok; index.html zip'in kökünde)

Siteye eklenenler (kaynak dosyalara dokunulmaz, yalnızca yayın kopyasına eklenir):
    favicon (svg, ico, png), iPhone ana ekran simgesi, paylaşım önizlemesi (og-gorsel.png, 1200x630),
    arama motoru verisi (canonical, Open Graph, JSON-LD "LocalBusiness"), robots.txt, sitemap.xml,
    404.html, _headers (güvenlik ve önbellek başlıkları).
Dahil EDİLMEYENLER: admin.html ve js/admin.js (panel yalnızca aynı tarayıcıdaki kayıtları gösterir; herkese açık sitede işe yaramaz),
    tools/, README.md, dist/.

--adres, sitenin yayınlandığı tam adrestir (paylaşım görseli ve canonical mutlak adres ister).
Adres sonradan değişirse (ör. kendi alan adınız) aynı komutu yeni adresle yeniden çalıştırıp klasörü/zip'i yeniden yükleyin.
"""
import argparse, datetime, html, json, pathlib, re, shutil, subprocess, zipfile

KOK = pathlib.Path(__file__).resolve().parent.parent
DIST = KOK / "dist"
CIKTI = DIST / "yayin"
VARSAYILAN_ADRES = "https://tiryakispor.pages.dev"

KOYU = "#0f1923"      # sitenin zemin rengi
TURUNCU = "#FF6B00"   # marka rengi
KEHRIBAR = "#FFB020"
GUN_EN = {1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday", 0: "Sunday"}


def ayarlari_oku():
    """js/ayarlar.js'i Node ile çalıştırıp numara, adres ve çalışma saatlerini JSON olarak alır (tek doğru kaynak orası)."""
    kod = ("const vm=require('vm'),fs=require('fs');const w={};"
           "vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),{window:w});"
           "console.log(JSON.stringify({ayar:w.TS.ayar,calisma:w.TS.CALISMA}))")
    cikti = subprocess.run(["node", "-e", kod, str(KOK / "js/ayarlar.js")], capture_output=True, text=True, check=True).stdout
    return json.loads(cikti)


# ---------- Simgeler ----------
def simge_svg(yuvarlak_kose=True):
    """Koyu zemin + turuncu halka (top) + beyaz "T". Yazı tipi kullanmaz (T çizilmiştir), her yerde aynı görünür."""
    rx = 14 if yuvarlak_kose else 0
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="{rx}" fill="{KOYU}"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="{TURUNCU}" stroke-width="5"/>
  <path d="M21 23h22v6h-8.5v15h-5V29H21z" fill="#ffffff"/>
</svg>
"""


def paylasim_html(ayar):
    """1200x630 paylaşım önizlemesi (WhatsApp, Facebook, X, Telegram bağlantı kartı)."""
    numara = "0" + ayar["WA_NUMARA"][2:]
    numara = f"{numara[:4]} {numara[4:7]} {numara[7:9]} {numara[9:]}"
    return f"""<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html, body {{ width: 1200px; height: 630px; overflow: hidden; }}
  body {{
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; color: #fff;
    background:
      radial-gradient(620px 520px at 82% 50%, rgba(255,107,0,0.26), transparent 70%),
      linear-gradient(135deg, #0a1628 0%, {KOYU} 58%, #0b1220 100%);
    position: relative;
  }}
  .serit {{ position: absolute; left: 0; top: 0; bottom: 0; width: 14px; background: linear-gradient(180deg, {TURUNCU}, {KEHRIBAR}); }}
  .sol {{ position: absolute; left: 86px; top: 0; bottom: 0; width: 650px; display: flex; flex-direction: column; justify-content: center; gap: 26px; }}
  .etiket {{
    align-self: flex-start; padding: 9px 22px; border-radius: 40px;
    background: rgba(255,140,0,0.16); border: 2px solid rgba(255,140,0,0.45);
    color: #FFA500; font-weight: 800; font-size: 24px; letter-spacing: 3px; text-transform: uppercase;
  }}
  .marka {{ font-weight: 900; font-size: 118px; line-height: 0.98; letter-spacing: -3px; }}
  .marka span {{ display: block; color: {TURUNCU}; }}
  .alt {{ font-size: 40px; font-weight: 600; color: #cfd6e0; line-height: 1.3; }}
  .bilgi {{ display: flex; gap: 38px; font-size: 32px; font-weight: 700; color: #ffffff; margin-top: 6px; }}
  .bilgi i {{ font-style: normal; color: {KEHRIBAR}; margin-right: 8px; }}
  .amblem {{ position: absolute; right: 70px; top: 115px; width: 400px; height: 400px; }}
</style></head><body>
  <div class="serit"></div>
  <div class="sol">
    <div class="etiket">Top Tamir &amp; Bakım Servisi</div>
    <div class="marka">Tiryaki<span>SPOR</span></div>
    <div class="alt">Futbol, basketbol ve voleybol toplarının onarımı</div>
    <div class="bilgi"><div><i>●</i>Kızılay / Ankara</div><div><i>●</i>{numara}</div></div>
  </div>
  <svg class="amblem" viewBox="0 0 400 400">
    <circle cx="200" cy="200" r="178" fill="#111c2b" stroke="{TURUNCU}" stroke-width="16"/>
    <path d="M62 150 Q200 238 338 150" fill="none" stroke="#223350" stroke-width="7"/>
    <path d="M62 262 Q200 170 338 262" fill="none" stroke="#223350" stroke-width="7"/>
    <g stroke="{KEHRIBAR}" stroke-width="9" stroke-linecap="round">
      <line x1="92" y1="262" x2="308" y2="138"/>
      <line x1="118" y1="226" x2="136" y2="262"/><line x1="152" y1="206" x2="170" y2="242"/>
      <line x1="186" y1="186" x2="204" y2="222"/><line x1="220" y1="166" x2="238" y2="202"/>
      <line x1="254" y1="147" x2="272" y2="183"/>
    </g>
  </svg>
</body></html>"""


def gorselleri_uret(ayar, cikti):
    """Simgeleri ve paylaşım görselini Chromium (Playwright) ile çizer; ICO için Pillow kullanır."""
    from playwright.sync_api import sync_playwright
    from PIL import Image

    (cikti / "favicon.svg").write_text(simge_svg(True), encoding="utf-8")
    with sync_playwright() as p:
        tarayici = p.chromium.launch()
        def ciz(svg_metni, boyut, hedef):
            svg = svg_metni.replace('width="64" height="64"', f'width="{boyut}" height="{boyut}"')
            sayfa = tarayici.new_page(viewport={"width": boyut, "height": boyut})
            sayfa.set_content(f'<body style="margin:0;background:transparent"><div style="width:{boyut}px;height:{boyut}px">{svg}</div></body>')
            sayfa.screenshot(path=str(hedef), omit_background=True, clip={"x": 0, "y": 0, "width": boyut, "height": boyut})
            sayfa.close()
        ciz(simge_svg(True), 48, cikti / "favicon-48.png")                 # Google arama sonuçları 48 px'in katını ister
        ciz(simge_svg(False), 180, cikti / "apple-touch-icon.png")         # iPhone ana ekranı: köşesiz, opak kare
        sayfa = tarayici.new_page(viewport={"width": 1200, "height": 630})
        sayfa.set_content(paylasim_html(ayar))
        sayfa.wait_for_timeout(300)
        sayfa.screenshot(path=str(cikti / "og-gorsel.png"))
        tarayici.close()
    # favicon.ico: 16/32/48 px
    buyuk = Image.open(cikti / "favicon-48.png").convert("RGBA")
    buyuk.save(cikti / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])


# ---------- Arama motoru verisi ----------
def calisma_saatleri(calisma):
    """CALISMA tablosunu schema.org OpeningHoursSpecification listesine çevirir (aynı saatli günler tek kayıtta)."""
    gruplar = {}
    for gun in [1, 2, 3, 4, 5, 6, 0]:
        v = calisma["gunler"].get(str(gun))
        if v:
            gruplar.setdefault((v[0], v[1]), []).append(GUN_EN[gun])
    return [{"@type": "OpeningHoursSpecification", "dayOfWeek": gunler, "opens": ac, "closes": kapat}
            for (ac, kapat), gunler in gruplar.items()]


def head_ekle(index, adres, ayarlar):
    ayar, calisma = ayarlar["ayar"], ayarlar["calisma"]
    baslik = html.unescape(re.search(r"<title>(.*?)</title>", index, re.S).group(1)).strip()
    aciklama = html.unescape(re.search(r'<meta name="description" content="([^"]*)"', index).group(1)).strip()
    e = lambda s: html.escape(s, quote=True)
    ld = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "TiryakiSPOR",
        "description": aciklama,
        "url": adres + "/",
        "image": adres + "/og-gorsel.png",
        "telephone": "+" + ayar["WA_NUMARA"],
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "İzmir Cad. Menekşe Sok. Menekşe Pasajı, Kızılay",
            "addressLocality": "Çankaya",
            "addressRegion": "Ankara",
            "addressCountry": "TR",
        },
        "openingHoursSpecification": calisma_saatleri(calisma),
    }
    blok = f"""
  <!-- ===== Yayın bilgileri (tools/yayin.py ekledi; kaynak index.html'de yoktur) ===== -->
  <link rel="canonical" href="{e(adres)}/" />
  <meta name="theme-color" content="{KOYU}" />
  <link rel="icon" href="favicon.ico" sizes="48x48" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" sizes="any" />
  <link rel="apple-touch-icon" href="apple-touch-icon.png" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="tr_TR" />
  <meta property="og:site_name" content="TiryakiSPOR" />
  <meta property="og:title" content="{e(baslik)}" />
  <meta property="og:description" content="{e(aciklama)}" />
  <meta property="og:url" content="{e(adres)}/" />
  <meta property="og:image" content="{e(adres)}/og-gorsel.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="TiryakiSPOR — Top Tamir ve Bakım Servisi, Kızılay / Ankara" />
  <meta name="twitter:card" content="summary_large_image" />
  <script type="application/ld+json">
{json.dumps(ld, ensure_ascii=False, indent=2)}
  </script>
"""
    assert index.count("</head>") == 1
    return index.replace("</head>", blok + "</head>")


def sayfa_404():
    return """<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title>Sayfa bulunamadı — TiryakiSPOR</title>
  <link rel="stylesheet" href="/css/style.css" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet" />
  <style>
    .yok { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; text-align: center; padding: 24px; }
    .yok h1 { font-size: clamp(4rem, 18vw, 8rem); font-weight: 900; color: var(--accent); line-height: 1; }
    .yok p { color: var(--text-soft); font-size: 1.05rem; }
  </style>
</head>
<body>
  <main class="yok">
    <a href="/" class="logo">Tiryaki<span>SPOR</span></a>
    <h1>404</h1>
    <p>Aradığınız sayfa bulunamadı.</p>
    <a class="btn btn-primary" href="/">Ana sayfaya dön</a>
  </main>
</body>
</html>
"""


HEADERS = """/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/css/*
  Cache-Control: public, max-age=3600
/js/*
  Cache-Control: public, max-age=3600
/images/*
  Cache-Control: public, max-age=86400
/favicon.svg
  Cache-Control: public, max-age=86400
/og-gorsel.png
  Cache-Control: public, max-age=86400
"""


def main():
    ap = argparse.ArgumentParser(description="TiryakiSPOR yayın paketi")
    ap.add_argument("--adres", default=VARSAYILAN_ADRES, help=f"sitenin tam adresi (varsayılan: {VARSAYILAN_ADRES})")
    args = ap.parse_args()
    adres = args.adres.strip().rstrip("/")
    assert re.fullmatch(r"https://[a-z0-9.-]+(/[\w./-]*)?", adres, re.I), "--adres https:// ile başlayan tam adres olmalı (örn. https://tiryakispor.pages.dev)"

    ayarlar = ayarlari_oku()
    if CIKTI.exists():
        shutil.rmtree(CIKTI)
    CIKTI.mkdir(parents=True)

    # Site dosyaları (admin hariç)
    index = (KOK / "index.html").read_text(encoding="utf-8")
    (CIKTI / "index.html").write_text(head_ekle(index, adres, ayarlar), encoding="utf-8")
    (CIKTI / "css").mkdir()
    shutil.copy(KOK / "css/style.css", CIKTI / "css/style.css")
    (CIKTI / "js").mkdir()
    for js in sorted((KOK / "js").glob("*.js")):
        if js.name != "admin.js":
            shutil.copy(js, CIKTI / "js" / js.name)
    shutil.copytree(KOK / "images", CIKTI / "images")

    # Ek dosyalar
    gorselleri_uret(ayarlar["ayar"], CIKTI)
    (CIKTI / "404.html").write_text(sayfa_404(), encoding="utf-8")
    (CIKTI / "_headers").write_text(HEADERS, encoding="utf-8")
    (CIKTI / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {adres}/sitemap.xml\n", encoding="utf-8")
    bugun = datetime.date.today().isoformat()
    (CIKTI / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"  <url>\n    <loc>{adres}/</loc>\n    <lastmod>{bugun}</lastmod>\n  </url>\n</urlset>\n", encoding="utf-8")

    # Güvenlik: yayında admin kalıntısı olmamalı
    for yol in CIKTI.rglob("*"):
        assert yol.name not in ("admin.html", "admin.js", "admin.css"), f"yayın paketinde admin dosyası var: {yol}"
    assert "admin" not in (CIKTI / "index.html").read_text(encoding="utf-8").lower().replace("administrator", ""), "index.html admin'e bağlantı veriyor"

    # Zip (index.html zip'in kökünde)
    zip_yolu = DIST / "tiryakispor-yayin.zip"
    dosyalar = sorted(p for p in CIKTI.rglob("*") if p.is_file())
    with zipfile.ZipFile(zip_yolu, "w", zipfile.ZIP_DEFLATED) as z:
        for p in dosyalar:
            z.write(p, p.relative_to(CIKTI).as_posix())

    print(f"adres        {adres}")
    print(f"klasör       {CIKTI}  ({len(dosyalar)} dosya)")
    print(f"zip          {zip_yolu}  ({zip_yolu.stat().st_size} bayt)")
    if adres == VARSAYILAN_ADRES:
        print("UYARI: varsayılan (örnek) adres kullanıldı; gerçek adres belli olunca --adres ile yeniden üretin.")


if __name__ == "__main__":
    main()
