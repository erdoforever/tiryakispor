/* ============================================================
   AYARLAR VE VERİ — TiryakiSPOR (CMS Tarafından Otomatik Üretildi)
   ============================================================ */
(function (TS) {
  "use strict";

  const ayar = {
  "WA_NUMARA": "905314315560",
  "FORM_ENDPOINT": "",
  "ADRES_SORGU": "Kızılay Mahallesi, İzmir 1 Caddesi, Sümer 1 Sokak, Menekşe Pasajı, No: 5, İç Kapı No: 46, Çankaya / Ankara",
  "HARITA_LINK": "",
  "calismaSaatleri": "Hafta içi 10:00 – 18:00 Cumartesi 10:00 - 16:00 | Pazar Kapalı",
  "ADRES_METIN": "İzmir 1 Cad. Sümer 1 Sok. Menekşe Pasajı No: 5 D: 46 Çankaya / Ankara"
};

  const CALISMA = {
    saatDilimi: "Europe/Istanbul",
    gunler: {
      1: ["10:00", "18:00"], 2: ["10:00", "18:00"], 3: ["10:00", "18:00"], 4: ["10:00", "18:00"], 5: ["10:00", "18:00"],
      6: null, 0: null,
    },
  };

  const KATEGORI_GORSEL = {
    futbol:      "images/ucl-ball.png",
    basketbol:   "images/delta-basketball.png",
    voleybol:    "images/mikasa-ball.png",
    profesyonel: "images/ucl-ball.png",
  };
  const KATEGORI_EMOJI = { futbol: "⚽", basketbol: "🏀", voleybol: "🏐", profesyonel: "🏅" };
  const KATEGORI_KISA = {
    futbol:      "Futbol",
    basketbol:   "Basketbol",
    voleybol:    "Voleybol",
    profesyonel: "Profesyonel Maç Topu",
  };
  const HASAR_IKON = {
    "Dikiş Patlağı":  "🧵",
    "Hava Kaçırma":   "💨",
    "Deri Soyulması": "🩹",
  };

  const hizmetler = [
  {
    "id": 1,
    "kategori": "futbol",
    "ad": "Futbol Topu Panel Dikişi",
    "aciklama": "Açılmış veya kopmuş panel dikişlerinin el dikişiyle yeniden yapılması.",
    "hasarlar": [
      "Dikiş Patlağı"
    ],
    "markalar": [
      "Adidas",
      "Nike",
      "Puma",
      "Select",
      "Diğer"
    ],
    "sure": "1–2 gün"
  },
  {
    "id": 2,
    "kategori": "futbol",
    "ad": "Futbol Topu İç Lastik Değişimi",
    "aciklama": "Delinen veya esneyen iç lastiğin yenisiyle değiştirilmesi.",
    "hasarlar": [
      "Hava Kaçırma"
    ],
    "markalar": [
      "Adidas",
      "Nike",
      "Puma",
      "Select",
      "Diğer"
    ],
    "sure": "1 gün"
  },
  {
    "id": 3,
    "kategori": "futbol",
    "ad": "Futbol Topu Sibop Değişimi",
    "aciklama": "Hava kaçıran veya iğne girmeyen sibobun yenilenmesi.",
    "hasarlar": [
      "Hava Kaçırma"
    ],
    "markalar": [
      "Adidas",
      "Nike",
      "Puma",
      "Select",
      "Diğer"
    ],
    "sure": "Aynı gün"
  },
  {
    "id": 4,
    "kategori": "futbol",
    "ad": "Futbol Topu Yüzey Yenileme",
    "aciklama": "Soyulan ve kabaran dış yüzey katmanlarının onarılması.",
    "hasarlar": [
      "Deri Soyulması"
    ],
    "markalar": [
      "Adidas",
      "Nike",
      "Puma",
      "Select",
      "Diğer"
    ],
    "sure": "2–3 gün"
  },
  {
    "id": 5,
    "kategori": "basketbol",
    "ad": "Basketbol Topu Sızdırmazlık Onarımı",
    "aciklama": "Yavaş yavaş hava kaçıran basketbol topunun kaçak noktasının kapatılması.",
    "hasarlar": [
      "Hava Kaçırma"
    ],
    "markalar": [
      "Molten",
      "Spalding",
      "Wilson",
      "Delta",
      "Nike",
      "Diğer"
    ],
    "sure": "1 gün"
  },
  {
    "id": 6,
    "kategori": "basketbol",
    "ad": "Basketbol Topu Grip / Deri Yenileme",
    "aciklama": "Aşınan, kayganlaşan veya soyulan yüzeyin tutuşunun geri kazandırılması.",
    "hasarlar": [
      "Deri Soyulması"
    ],
    "markalar": [
      "Molten",
      "Spalding",
      "Wilson",
      "Delta",
      "Nike",
      "Diğer"
    ],
    "sure": "2 gün"
  },
  {
    "id": 7,
    "kategori": "basketbol",
    "ad": "Basketbol Topu Kanal Onarımı",
    "aciklama": "Açılan kanal (dikiş hattı) birleşimlerinin yeniden sabitlenmesi.",
    "hasarlar": [
      "Dikiş Patlağı"
    ],
    "markalar": [
      "Molten",
      "Spalding",
      "Wilson",
      "Delta",
      "Nike",
      "Diğer"
    ],
    "sure": "1–2 gün"
  },
  {
    "id": 8,
    "kategori": "voleybol",
    "ad": "Voleybol Topu Panel Değişimi",
    "aciklama": "Yırtılan veya soyulan panelin sökülüp yenisiyle değiştirilmesi.",
    "hasarlar": [
      "Deri Soyulması",
      "Dikiş Patlağı"
    ],
    "markalar": [
      "Mikasa",
      "Molten",
      "Diğer"
    ],
    "sure": "2–3 gün"
  },
  {
    "id": 9,
    "kategori": "voleybol",
    "ad": "Voleybol Topu İç Lastik Değişimi",
    "aciklama": "Hava tutmayan voleybol topunun iç lastiğinin yenilenmesi.",
    "hasarlar": [
      "Hava Kaçırma"
    ],
    "markalar": [
      "Mikasa",
      "Molten",
      "Diğer"
    ],
    "sure": "1 gün"
  },
  {
    "id": 10,
    "kategori": "profesyonel",
    "ad": "Maç Topu Komple Revizyon",
    "aciklama": "Dikiş, iç lastik, yüzey ve basınç kontrolünü kapsayan tam bakım.",
    "hasarlar": [
      "Dikiş Patlağı",
      "Hava Kaçırma",
      "Deri Soyulması"
    ],
    "markalar": [
      "Adidas",
      "Nike",
      "Molten",
      "Mikasa",
      "Wilson",
      "Select"
    ],
    "sure": "3–4 gün"
  },
  {
    "id": 11,
    "kategori": "profesyonel",
    "ad": "Termo-Bonded Panel Onarımı",
    "aciklama": "Dikişsiz, ısıl yapıştırmalı maç toplarında ayrılan panellerin onarımı.",
    "hasarlar": [
      "Deri Soyulması",
      "Dikiş Patlağı"
    ],
    "markalar": [
      "Adidas",
      "Nike",
      "Puma"
    ],
    "sure": "2–3 gün"
  },
  {
    "id": 12,
    "kategori": "profesyonel",
    "ad": "Basınç ve Sızdırmazlık Testi",
    "aciklama": "Maç standardına göre basınç ayarı ve su altı kaçak testi.",
    "hasarlar": [
      "Hava Kaçırma"
    ],
    "markalar": "hepsi",
    "sure": "Aynı gün"
  }
];
  const paketler = [
  {
    "no": "01",
    "ikon": "🧵",
    "etiket": "EN ÇOK TERCİH EDİLEN",
    "ad": "Panel Dikiş Onarımı",
    "aciklama": "Açılan veya patlayan panel dikişleri, topun orijinal formunu bozmadan el dikişiyle onarılır.",
    "ozellikler": [
      "El dikişi ile sağlam onarım",
      "Dayanıklı, su itici iplik",
      "Futbol · Voleybol · Basketbol"
    ]
  },
  {
    "no": "02",
    "ikon": "🔧",
    "etiket": null,
    "ad": "İç Lastik / Sibop Değişimi",
    "aciklama": "Hava kaçıran topların iç lastiği (mesane) veya sibobu yenilenir, top ilk günkü sertliğine kavuşur.",
    "ozellikler": [
      "Kaçak noktası tespiti",
      "Yeni iç lastik veya sibop",
      "Değişim sonrası hava testi"
    ]
  },
  {
    "no": "03",
    "ikon": "📏",
    "etiket": null,
    "ad": "Profesyonel Basınç ve Sızdırmazlık Testi",
    "aciklama": "Topun iç basıncı resmi maç değerlerine göre ayarlanır ve gizli hava kaçakları test edilir.",
    "ozellikler": [
      "Hassas manometre ölçümü",
      "Su altı sızdırmazlık testi",
      "Maç standardına ayar"
    ]
  }
];

  Object.assign(TS, { ayar, CALISMA, KATEGORI_GORSEL, KATEGORI_EMOJI, KATEGORI_KISA, HASAR_IKON, hizmetler, paketler });
})(window.TS = window.TS || {});
