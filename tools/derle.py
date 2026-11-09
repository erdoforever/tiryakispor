#!/usr/bin/env python3
"""TiryakiSPOR derleme aracı.  Kullanım:  python3 tools/derle.py

Üretir (dist/ klasörü):
  dist/artifact/index.html       tek dosyalık yayın sayfası (CSS ve yerel JS satır içine gömülür)
  dist/artifact/admin.html       tek dosyalık admin sayfası (aynı şekilde satır içi; yayında ayrı dosya yüklemesine bağlı kalmaz)
  dist/artifact/dosyalar.json    yayın aracına verilecek ek dosyalar (admin.html + görseller)
  dist/tiryakispor-site.zip      klasör olarak çalışan tam site (çift tıklayıp açılır)
"""
import json, pathlib, re, zipfile

KOK = pathlib.Path(__file__).resolve().parent.parent
DIST = KOK / "dist"
GORSELLER = sorted(p.relative_to(KOK).as_posix() for p in (KOK / "images").glob("*.png"))
ZIP_DOSYALARI = ["index.html", "admin.html", "css/style.css", "css/admin.css", *sorted(
    p.relative_to(KOK).as_posix() for p in (KOK / "js").glob("*.js")), *GORSELLER]


def artifact_sayfasi():
    html = (KOK / "index.html").read_text(encoding="utf-8")
    css = (KOK / "css/style.css").read_text(encoding="utf-8")
    yerel_js = re.findall(r'<script src="(js/[^"]+)"></script>', html)       # index.html'deki sırayla
    js = "\n\n".join((KOK / f).read_text(encoding="utf-8") for f in yerel_js)
    assert "</script" not in js.lower(), "JS içinde </script geçemez"

    govde = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
    govde = re.sub(r'\s*<script src="js/[^"]+"></script>', "", govde)           # yerel JS satır içi gömülecek
    aciklama = re.search(r'<meta name="description"[^>]*>', html).group(0)
    yazi_tipleri = "\n".join(re.findall(r'<link rel="preconnect"[^>]*>|<link href="https://fonts[^>]*>', html))

    # Yayın aracı <html> ve <body> etiketlerini kendisi ekler (lang vermez); ad sabit ve kısa tutulur (yayın başlığı).
    # lang="tr" olmazsa CSS'teki "text-transform: uppercase" Türkçe i'yi "I" yapar (İÇİN → IÇIN); bu yüzden en başta verilir.
    return f"""<title>TiryakiSPOR Top Tamiri</title>
<script>document.documentElement.lang = "tr";</script>
{aciklama}
{yazi_tipleri}
<style>
:root {{ color-scheme: dark; }}
body {{ font-size: 16px; }}
{css}
</style>
{govde}
<script>
{js}
</script>
"""


def admin_sayfasi():
    """admin.html'deki yerel css/js bağlantılarını satır içine gömer (tam bir HTML belgesi olarak kalır)."""
    html = (KOK / "admin.html").read_text(encoding="utf-8")
    css = (KOK / "css/admin.css").read_text(encoding="utf-8")
    html, n = re.subn(r'<link rel="stylesheet" href="css/admin\.css">', lambda m: f"<style>\n{css}\n</style>", html)
    assert n == 1, "admin.html içinde css/admin.css bağlantısı bulunamadı"
    yollar = re.findall(r'<script src="(js/[^"]+)"></script>', html)
    assert yollar, "admin.html içinde yerel script yok"
    js = "\n\n".join((KOK / f).read_text(encoding="utf-8") for f in yollar)
    assert "</script" not in js.lower(), "JS içinde </script geçemez"
    sayac = iter(range(len(yollar)))
    html = re.sub(r'[ \t]*<script src="js/[^"]+"></script>\n?',
                  lambda m: f"  <script>\n{js}\n  </script>\n" if next(sayac) == 0 else "", html)
    assert 'src="js/' not in html and 'href="css/' not in html, "admin.html içinde yerel bağlantı kaldı"
    return html


def main():
    (DIST / "artifact").mkdir(parents=True, exist_ok=True)
    sayfa = artifact_sayfasi()
    (DIST / "artifact/index.html").write_text(sayfa, encoding="utf-8")
    admin = admin_sayfasi()
    (DIST / "artifact/admin.html").write_text(admin, encoding="utf-8")
    ek = {"admin.html": f"{DIST}/artifact/admin.html", **{yol: f"{KOK}/{yol}" for yol in GORSELLER}}
    (DIST / "artifact/dosyalar.json").write_text(json.dumps(ek, ensure_ascii=False, indent=1), encoding="utf-8")

    zip_yolu = DIST / "tiryakispor-site.zip"
    with zipfile.ZipFile(zip_yolu, "w", zipfile.ZIP_DEFLATED) as z:
        for yol in ZIP_DOSYALARI:
            z.write(KOK / yol, "tiryakispor/" + yol)
    print(f"artifact/index.html  {len(sayfa):>7} bayt")
    print(f"artifact/admin.html  {len(admin):>7} bayt")
    print(f"tiryakispor-site.zip {zip_yolu.stat().st_size:>7} bayt  ({len(ZIP_DOSYALARI)} dosya)")


if __name__ == "__main__":
    main()
