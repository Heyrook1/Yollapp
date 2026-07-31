# Implementation Progress — design/yolla-professional-ui-v1

- [x] Phase 1 — Repo audit + design docs
- [x] Phase 2 — Tokens + component library (`components/ui/*`, Manrope, v4 paleti)
- [x] Phase 3 — Welcome + auth (e-posta backend'i korunarak)
- [x] Phase 4 — Sender home ("Nereye?", canlı kart, hızlı işlemler)
- [x] Phase 5 — 3 adımlı gönderi oluşturma (onay sheet'i + gerçek quote)
- [x] Phase 6 — Kurye arama durumu (PAID = radar) + iptal
- [x] Phase 7 — Takip (CANLI rozet, segment ilerleme, timeline) + teslim ekranı
- [x] Phase 8 — Kurye başvurusu (3 adımlı, durum ekranları)
- [x] Phase 9 — Kurye ana ekran, aktif görev akışı, cüzdan
- [x] Phase 10 — Business shell (gerçek veriler + dürüst "yakında")
- [x] Phase 11 — Admin operasyon (sidebar, metrikler, gönderi tablosu, kurye onayları)
- [x] Phase 12 — Loading/empty/error durumları (route grubu başına)
- [x] Phase 13 — Erişilebilirlik (focus-visible, aria, reduced-motion, 44px hedefler)
- [x] Phase 14 — Testler (21/21 ✅) + typecheck ✅ + production build ✅

Backend eklemeleri (mevcut mimariyi izleyerek, gerçek):
- [x] `progressShipmentAsCourier` (PICK_UP/START_TRANSIT/DELIVER/FAIL_DELIVERY) + action + 4 test
- [x] `cancelShipmentAsSender` + action + 3 test
- [x] Gönderi detay, kurye/sender cüzdanı, admin özet + tablo sorguları

## Bilinen sınırlar / backend bağımlılıkları
- Telefon + OTP girişi: Supabase phone auth yapılandırması gerekiyor (UI e-posta ile çalışıyor).
- Takip linki `/t/[token]`: `TrackingToken` tablosu + migration bekliyor.
- Payout, rating, bahşiş, gerçek ödeme sağlayıcı, canlı harita: MVP-sonrası; UI'da dürüst
  "yakında" olarak işaretli, sahte davranış yok.
- `pnpm lint`: repo'da ESLint konfigürasyonu hiç kurulmamış (önceden de yoktu); `next lint`
  interaktif kurulum istiyor. Paket ekleme onayıyla ayrıca kurulmalı.
