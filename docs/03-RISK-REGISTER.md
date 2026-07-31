# 03 — Risk Register

Durum: ✅ kapatıldı · ⚠️ azaltıldı · ⛔ açık (dış bağımlılık)

## Finansal

| ID | Risk | Durum | Karşı önlem |
|---|---|---|---|
| F1 | Kazancın değişebilir gönderi kaydından hesaplanması | ✅ | `LedgerEntry` append-only; bakiye = SUM(entries). DB trigger tutar/tip/idempotency güncellemesini engeller, DELETE yasak. |
| F2 | Yuvarlamada kuruş kaybı | ✅ | Tek yuvarlama noktası `packages/core/money.ts`. Test: brüt = net + komisyon (7333 kuruş sınır vakası dahil). |
| F3 | Çift ödeme / tekrarlı defter yazımı | ✅ | `LedgerEntry.idempotencyKey` UNIQUE; `Payout.reference` + `idempotencyKey` UNIQUE. |
| F4 | Hatalı işaretli defter satırı | ✅ | DB CHECK: kazanç>0, komisyon<0; `assertEntrySignValid` aynı kuralı kodda uygular. |
| F5 | Bakiyeden fazla çekim | ✅ | `assertPayoutAllowed` + test. |
| F6 | Fiyatın client'tan gelmesi | ✅ | Zaten sunucuda; `price` alanı gelirse loglanıp yok sayılıyor. |
| F7 | Gerçek tahsilat yapılamaması | ⛔ | Ödeme sağlayıcısı yok. `payments` bayrağı ve dürüst "test ödemesi" etiketi. |

## Güvenlik

| ID | Risk | Durum | Karşı önlem |
|---|---|---|---|
| S1 | İki kuryenin aynı işi alması | ✅ | Atomik koşullu UPDATE (`status=PAID AND courier_id IS NULL`); eşzamanlılık testi mevcut. |
| S2 | Yetkisiz erişim / IDOR | ✅ | Merkezî `lib/authz.ts`; gönderi detayında sahiplik yoksa `null` (kayıt yok gibi davranır). |
| S3 | Kaba kuvvet / uç nokta kötüye kullanımı | ⚠️ | Postgres tabanlı hız sınırı (auth/quote/tracking/incident/payout). Sabit pencere — sınırda 2× geçiş mümkün; Redis'e taşınması P1. |
| S4 | Takip linkinin tahmin edilmesi | ✅ | 256-bit rastgele, DB'de yalnız SHA-256 hash, süreli + iptal edilebilir, sabit zamanlı karşılaştırma. |
| S5 | Takip sayfasından kişisel veri sızması | ✅ | Telefon hiç yok; ad baş harfe, adres bölgeye iner. Testli. |
| S6 | Clickjacking / XSS / MIME sniffing | ✅ | CSP, `X-Frame-Options: DENY`, `nosniff`, HSTS, Permissions-Policy. |
| S7 | Kuryenin kendi gönderisini taşıması | ✅ | Sunucuda engellendi + test. |
| S8 | Admin işlemlerinin izlenememesi | ✅ | `AuditLog`; metadata allow-list ile kişisel veri yazımı engelli. |
| S9 | Client tablo erişimi | ✅ | Yeni her tabloda RLS; takip/denetim/idempotency tablolarına policy verilmedi (server-only). |
| S10 | Sır sızması | ✅ | `.env` gitignore'da; CI'da sır taraması; uygulama service-role key kullanmıyor. |
| S11 | CSP'de `unsafe-inline` | ⚠️ | Next.js inline script gereksinimi. Nonce tabanlı CSP P1. |
| S12 | Belge yükleme güvenliği | ⛔ | Kurye belge yükleme UI'ı henüz yok; Storage kuralları yazılmadı. |

## Operasyonel

| ID | Risk | Durum | Karşı önlem |
|---|---|---|---|
| O1 | Sorun anında özelliği kapatamamak | ✅ | `FeatureFlag` — sunucuda zorlanan kill switch, kayıt yoksa fail-closed. |
| O2 | Eksik yapılandırmayla production açılışı | ✅ | `lib/env.ts` — production'da fail-closed, webhook secret'ı zorunlu kılar. |
| O3 | Regresyonun fark edilmemesi | ✅ | CI: typecheck, test, build, audit, sır taraması, RLS kural kontrolü. |
| O4 | Hata izleme yok | ⛔ | Sentry DSN yapılandırılmadı; `/api/health` var ama alarm hedefi yok. |
| O5 | Yedek / geri yükleme belirsiz | ⚠️ | Supabase otomatik yedek alıyor; geri yükleme prosedürü test edilmedi. |
| O6 | Bildirim gönderilememesi | ⛔ | SMS sağlayıcısı yok; sağlayıcı `delivered:false` + sebep döner, sessiz başarı yok. |
| O7 | Lint kapısı yok | ⚠️ | ESLint repoda hiç kurulmamış; paket ekleme onayı bekliyor. |
