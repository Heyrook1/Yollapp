# YOLLA Screen Inventory

Durum: ✅ bu dalda yeniden tasarlandı · ⏳ backend bağımlı (dürüst placeholder/`yakında`) · ➖ kapsam dışı

## Public / Auth
| Ekran | Route | Durum |
|---|---|---|
| Welcome (slogan + güven satırı + tek birincil aksiyon) | `/` | ✅ |
| Giriş (e-posta) | `/login` | ✅ (telefon+OTP backend'i yok — ⏳) |
| Kayıt | `/signup` | ✅ |
| Takip linki | `/t/[token]` | ⏳ `TrackingToken` tablosu yok |

## Sender
| Ekran | Route | Durum |
|---|---|---|
| Ana sayfa ("Nereye?" + canlı kart + tekrar gönder) | `/sender` | ✅ |
| Gönderi oluşturma — 3 adım (adres → paket → plan+özet) | `/sender/shipments/new` | ✅ |
| Gönderilerim | `/sender/shipments` | ✅ |
| Gönderi detay: ödeme / kurye aranıyor / takip / teslim / iptal | `/sender/shipments/[id]` | ✅ (harita placeholder) |
| Cüzdan (ödeme geçmişi — gerçek quote verisi) | `/sender/wallet` | ✅ |
| Profil (roller, çıkış, kurye/işletme geçişi) | `/sender/profile` | ✅ |

## Courier
| Ekran | Route | Durum |
|---|---|---|
| Ana sayfa / açık işler (3 sn'de okunan teklif kartı) | `/courier/jobs` | ✅ |
| Aktif görev (durum makinesine bağlı tek aksiyon) | `/courier/jobs/mine` | ✅ |
| Cüzdan (kazanç = quote − komisyon, gerçek) | `/courier/wallet` | ✅ (payout ⏳) |
| Başvuru (adımlı) + incelemede/onay/red durumları | `/courier/apply` | ✅ (belge yükleme UI ⏳) |
| Profil | `/courier/profile` | ✅ |

## Business
| Ekran | Route | Durum |
|---|---|---|
| İşletme paneli (kendi gönderi istatistikleri, gerçek) | `/business` | ✅ shell — doğrulama/CSV/ekip ⏳ |

## Admin (web, ayrı ve korumalı)
| Ekran | Route | Durum |
|---|---|---|
| Operasyon panosu (durum sayıları, kuyruklar) | `/admin` | ✅ |
| Kurye onayları | `/admin/couriers` | ✅ |
| Gönderiler tablosu | `/admin/shipments` | ✅ |

## Zorunlu durumlar
Her ana route grubunda `loading.tsx` (skeleton) + `error.tsx` (TR retry) + boş durumlar;
yetkisiz/oturumsuz ekranlar; "kurye yok", "iptal", "teslim başarısız" durum ekranları gönderi detayında.
