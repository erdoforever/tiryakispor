// Giriş animasyonu için hazırlık: prefers-reduced-motion değilse giris-bekle sınıfı eklenir
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.documentElement.classList.add("giris-bekle");
}
