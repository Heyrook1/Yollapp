# External Dependencies — pilot açılışını bloke eden dış hesaplar

Bunların hiçbiri kodla çözülemez; hesap açılması ve kimlik bilgisi girilmesi gerekir.
Her biri için kod tarafı **hazır** (tipli arayüz + dürüst "kullanılamaz" durumu).

---

## 1. Ödeme sağlayıcısı — ⛔ BLOKE

**Neden gerekli:** Gerçek para tahsil edilemiyor. Şu an "Ödemeyi tamamla" butonu
gönderiyi `PAID` yapıyor ama **hiçbir tahsilat olmuyor**. Kullanıcıya bu açıkça
"Test ödemesi — gerçek kart çekilmez" olarak gösteriliyor.

**Kod tarafı hazır:** `apps/web/src/lib/providers/payments.ts` — `PaymentProvider`
arayüzü (intent, doğrulama, iade, webhook imzası). `none` adaptörü çağrıldığında
açıkça hata döner; sessizce "başarılı" dönmez.

**Yapılması gereken:**
1. KKTC'de çalışan bir sağlayıcı seç (iyzico, PayTR veya yerel banka sanal POS).
2. Ticari hesap + sözleşme (tüzel kişilik gerekir).
3. `PAYMENTS_PROVIDER` ve `PAYMENTS_WEBHOOK_SECRET` ortam değişkenlerini gir.
4. Adaptörü yaz, webhook imza doğrulamasını bağla.
5. `payments` bayrağını aç.

**Kural:** Webhook imzası doğrulanmadan hiçbir gönderi `PAID` yapılmamalı.

---

## 2. SMS / OTP sağlayıcısı — ⛔ BLOKE

**Neden gerekli:** Telefon+OTP girişi ve teslimat bildirimleri gönderilemiyor.
Tasarım referansı telefon-öncelikli akış gösteriyor ama backend yok.

**Kod tarafı hazır:** `apps/web/src/lib/providers/notifications.ts` — tipli şablonlar
ve `delivered:false` + sebep dönüşü. Sahte OTP mantığı **yazılmadı**.

**Yapılması gereken:**
1. SMS sağlayıcısı hesabı (Netgsm, Twilio vb.) + KKTC gönderim izni.
2. Supabase → Authentication → Phone provider yapılandırması.
3. `SMS_PROVIDER`, `SMS_API_KEY` gir.
4. `phone_auth` ve `notifications` bayraklarını aç.

**Şu an:** Giriş e-posta + şifre ile **çalışıyor** (gerçek backend, mock değil).

---

## 3. Harita / konum sağlayıcısı — ⛔ BLOKE

**Neden gerekli:** Canlı kurye konumu ve rota yok. `MapCanvas` bilinçli olarak
stilize placeholder; takip sayfası "Canlı harita takibi henüz aktif değil" diyor.
Statik veri asla "canlı" diye sunulmuyor.

**Yapılması gereken:** Google Maps / Mapbox hesabı, `MAPS_PROVIDER` + `MAPS_API_KEY`,
adaptör implementasyonu, kurye konum yayınlama (arka plan izni gerektirir).

---

## 4. Hata izleme — ⛔ BLOKE

**Neden gerekli:** Production hatası görünmüyor. `/api/health` var ama alarm hedefi yok.

**Yapılması gereken:** Sentry projesi, `SENTRY_DSN`, uptime izleme `/api/health`'e bağlanmalı.

---

## 5. Payout (kurye para çekme) — ⛔ BLOKE

**Neden gerekli:** Kurye kazancı defterde doğru birikiyor ama **bankaya gönderilemiyor**.
`payouts` bayrağı kapalı, UI'da "Para çek — yakında" (disabled) gösteriliyor.

**Yapılması gereken:** Toplu havale/IBAN transfer anlaşması. Şema (`Payout`, idempotency,
audit) hazır; yalnızca sağlayıcı entegrasyonu eksik.

---

## 6. Hukuki metinler — ⛔ BLOKE (hukukçu gerekir)

`Consent` tablosu ve tipleri hazır (KVKK, gizlilik, konum, belge işleme). Metinlerin
kendisi **yazılmadı** — KKTC mevzuatına göre hukuk danışmanı hazırlamalı.
Bu bir mühendislik kararı değildir; uydurulmadı.

---

## 7. ESLint — ⚠️ paket onayı bekliyor

Repoda ESLint hiç kurulmamış. `CLAUDE.md §2` yeni paket eklemeden önce sormamı
istiyor, bu yüzden eklenmedi. CI'da lint adımı yok.
