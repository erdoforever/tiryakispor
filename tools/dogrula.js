#!/usr/bin/env node
/* TiryakiSPOR tutarlılık denetimi (bağımlılık gerektirmez).  Kullanım: node tools/dogrula.js
   Sitede aynı bilgi birden fazla yerde durduğu için (numara, marka listesi, id'ler) burada karşılaştırılır. */
const fs = require("fs"), path = require("path"), vm = require("vm");
const KOK = path.resolve(__dirname, "..");
const oku = (f) => fs.readFileSync(path.join(KOK, f), "utf8");
const hatalar = [], uyarilar = [];
const hata = (m) => hatalar.push(m), uyari = (m) => uyarilar.push(m);

const html = oku("index.html"), admin = oku("admin.html"), css = oku("css/style.css");
const jsDosyalari = fs.readdirSync(path.join(KOK, "js")).filter((f) => f.endsWith(".js"));

// 1) Veri: ayarlar.js'i sanal pencerede çalıştır
const pencere = {}; vm.runInNewContext(oku("js/ayarlar.js"), { window: pencere });
const { ayar, hizmetler, paketler, KATEGORI_GORSEL, KATEGORI_KISA, HASAR_IKON } = pencere.TS;

// 2) WhatsApp / telefon numarası her yerde aynı mı?
const numara = ayar.WA_NUMARA;
for (const m of html.matchAll(/wa\.me\/(\d+)/g)) if (m[1] !== numara) hata(`index.html: wa.me/${m[1]} ≠ ayarlar.js WA_NUMARA (${numara})`);
for (const m of html.matchAll(/tel:\+?(\d+)/g)) if (m[1] !== numara) hata(`index.html: tel:${m[1]} ≠ WA_NUMARA`);
const gorunen = "0" + numara.slice(2).replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4");
if (!html.includes(gorunen)) uyari(`index.html: görünen telefon metni "${gorunen}" bulunamadı`);

// 2b) Çalışma saatleri verisi, saat kartındaki yedek yazı, yol tarifi bağlantıları
const { CALISMA } = pencere.TS;
try { new Intl.DateTimeFormat("en-US", { timeZone: CALISMA.saatDilimi }); } catch { hata(`CALISMA.saatDilimi geçersiz: "${CALISMA.saatDilimi}"`); }
const dk = (s) => { const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(s)); return m ? m[1] * 60 + +m[2] : null; };
for (const [gun, v] of Object.entries(CALISMA.gunler)) {
  if (!/^[0-6]$/.test(gun)) { hata(`CALISMA.gunler: "${gun}" geçerli bir gün numarası değil (0 Pazar … 6 Cumartesi)`); continue; }
  if (v === null) continue;
  if (!Array.isArray(v) || v.length !== 2 || dk(v[0]) === null || dk(v[1]) === null) hata(`CALISMA.gunler[${gun}]: ["09:00", "18:00"] biçiminde olmalı`);
  else if (dk(v[0]) >= dk(v[1])) hata(`CALISMA.gunler[${gun}]: açılış kapanıştan önce olmalı (gece yarısını aşan vardiya desteklenmez)`);
}
const haftaIci = [1, 2, 3, 4, 5].map((g) => (CALISMA.gunler[g] || []).join(" – "));
if (haftaIci.every((s) => s && s === haftaIci[0]) && !html.includes(`Hafta içi ${haftaIci[0]}`))
  uyari(`index.html: saat kartındaki yedek yazı "Hafta içi ${haftaIci[0]}" ile eşleşmiyor (JS çalışmazsa bu yazı görünür)`);
const beklenenHarita = ayar.HARITA_LINK || "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(ayar.ADRES_SORGU);
const yolLinkleri = [...html.matchAll(/<a\b[^>]*\bdata-yol-tarifi\b[^>]*>/g)].map((m) => (m[0].match(/href="([^"]*)"/) || [])[1] || "");
if (!yolLinkleri.length) hata("index.html: data-yol-tarifi bağlantısı yok");
for (const h of yolLinkleri) if (h.replace(/&amp;/g, "&") !== beklenenHarita) hata(`index.html: yol tarifi yedek adresi ayarlar.js ile uyuşmuyor\n      var: ${h}\n      olmalı: ${beklenenHarita}`);

// 3) Marka ve onarım türü seçenekleri (HTML) ↔ hizmet verisi
const secenekler = (id) => [...(html.match(new RegExp(`id="${id}"[\\s\\S]*?</select>`))[0]).matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
const htmlMarkalar = secenekler("markaSelect").filter((v) => v !== "tumu");
const veriMarkalar = new Set(hizmetler.flatMap((h) => (h.markalar === "hepsi" ? [] : h.markalar)));
for (const m of veriMarkalar) if (!htmlMarkalar.includes(m)) hata(`Marka "${m}" hizmet verisinde var, markaSelect seçeneklerinde yok`);
for (const m of htmlMarkalar) if (!veriMarkalar.has(m)) hata(`Marka "${m}" markaSelect'te var, hiçbir hizmette kullanılmıyor`);
const htmlKategoriler = secenekler("onarimSelect").filter((v) => v !== "tumu");
for (const k of Object.keys(KATEGORI_KISA)) if (!htmlKategoriler.includes(k)) hata(`Kategori "${k}" onarimSelect'te yok`);
for (const k of htmlKategoriler) if (!(k in KATEGORI_KISA)) hata(`onarimSelect "${k}" kategorisi veride yok`);
const htmlHasar = [...html.matchAll(/data-hasar="([^"]+)"/g)].map((m) => m[1]).filter((v) => v !== "tumu");
for (const h of Object.keys(HASAR_IKON)) if (!htmlHasar.includes(h)) hata(`Hasar "${h}" filtre düğmelerinde yok`);
for (const h of hizmetler) {
  if (!(h.kategori in KATEGORI_GORSEL)) hata(`Hizmet ${h.id}: kategori "${h.kategori}" görseli yok`);
  for (const x of h.hasarlar) if (!(x in HASAR_IKON)) hata(`Hizmet ${h.id}: hasar "${x}" ikonu yok`);
}
if (new Set(hizmetler.map((h) => h.id)).size !== hizmetler.length) hata("hizmetler: tekrar eden id");
if (!paketler.length) hata("paket listesi boş");

// 4) Dosyalar: HTML'in çağırdığı her dosya var mı, js/ klasöründeki her dosya bir sayfada kullanılıyor mu?
const temizleUrl = (u) => u.split("?")[0];
const kaynaklar = (s) => [...s.matchAll(/(?:src|href)="((?:js|css|images)\/[^"]+)"/g)].map((m) => m[1]);
for (const f of [...kaynaklar(html), ...kaynaklar(admin), ...Object.values(KATEGORI_GORSEL)]) if (!fs.existsSync(path.join(KOK, temizleUrl(f)))) hata(`Dosya yok: ${f}`);
const kullanilan = new Set([...kaynaklar(html), ...kaynaklar(admin)].map(temizleUrl));
for (const f of jsDosyalari) if (!kullanilan.has("js/" + f)) uyari(`js/${f} hiçbir sayfada çağrılmıyor`);

// 5) JS'in aradığı id'ler HTML'de var mı?
const idler = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const adminIdler = new Set([...admin.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
// Dinamik oluşturulan veya isteğe bağlı script id'leri
const dinamikIdler = new Set(["turnstileScript"]);
for (const f of jsDosyalari) {
  const kod = oku("js/" + f), hedef = f === "admin.js" ? adminIdler : idler;
  for (const m of kod.matchAll(/(?:\$|getElementById)\("([\w-]+)"\)/g)) {
    if (!hedef.has(m[1]) && !dinamikIdler.has(m[1])) hata(`js/${f}: #${m[1]} sayfada yok`);
  }
}
for (const m of html.matchAll(/\sid="([^"]+)"/g)) if ([...html.matchAll(new RegExp(`\\sid="${m[1]}"`, "g"))].length > 1) hata(`index.html: tekrar eden id "${m[1]}"`);

// 6) CSS: kullanılan değişkenler tanımlı mı, tanımlı olup kullanılmayan var mı?
const tanimli = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const kullanilanDeg = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));
const jsDegisken = new Set(["--dx", "--dy", "--rot", "--d", "--dur", "--dolgu"]);          // JS/CSS içinde yerel atanan değişkenler
for (const v of kullanilanDeg) if (!tanimli.has(v) && !jsDegisken.has(v)) hata(`CSS: ${v} kullanılıyor ama tanımlı değil`);
for (const v of tanimli) if (!kullanilanDeg.has(v) && !jsDegisken.has(v)) uyari(`CSS: ${v} tanımlı ama kullanılmıyor`);

// 7) Unutulmuş hata ayıklama kodu
const yorumsuz = (k) => k.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");   // yorum satırlarındaki örnekler sayılmaz
for (const f of jsDosyalari) if (/console\.(log|debug)|debugger/.test(yorumsuz(oku("js/" + f)))) hata(`js/${f}: console.log/debugger kalmış`);

console.log(`Kontrol edilen: ${hizmetler.length} hizmet, ${paketler.length} paket, ${jsDosyalari.length} JS dosyası, ${tanimli.size} CSS değişkeni`);
uyarilar.forEach((m) => console.log("  UYARI", m));
hatalar.forEach((m) => console.log("  HATA ", m));
console.log(hatalar.length ? `\n${hatalar.length} hata bulundu.` : "\nTüm tutarlılık kontrolleri geçti.");
process.exit(hatalar.length ? 1 : 0);
