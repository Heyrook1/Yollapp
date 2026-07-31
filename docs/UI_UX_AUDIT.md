# YOLLA UI/UX Audit (design/yolla-professional-ui-v1)

## Stack (verified)
- Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS v4 (`@theme` tokens), pnpm monorepo.
- Supabase Auth (email/password) + Prisma (Postgres). Vitest for unit tests.
- Commands: `pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm db:seed`.

## Real backend capabilities (do not fake beyond these)
| Alan | Durum |
|---|---|
| Auth | E-posta + şifre (Supabase). Telefon+OTP **backend'i yok** — UI mimarisi hazır, fallback e-posta. |
| Gönderi | Oluştur + fiyat snapshot (zone×size+ekspres), mock ödeme (`markPaidAction`), listeleme. |
| Kurye | Başvuru/vetting (araç, bölgeler), admin onay/red, iş kabul (PAID→MATCHED). |
| Durum makinesi | `packages/core/shipment-state.ts` PICK_UP/START_TRANSIT/DELIVER/CANCEL destekler — action katmanı bu dalda eklendi (gerçek, transition() üzerinden). |
| Wallet | Tablo yok. Kurye kazançları DELIVERED gönderilerin quote'larından **gerçek veriyle** hesaplanır; payout backend'i yok (dürüst "yakında"). |
| Takip linki | `TrackingToken` tablosu yok → route açılmadı, backend bağımlılığı olarak listelendi. |
| Rating / Bahşiş | Tablo yok → UI'da etkileşimli gösterilmez. |
| Harita | Sağlayıcı yok → `MapCanvas` placeholder (adaptör arkasında, canlı takip taklidi yapmaz). |

## Önceki UI sorunları
- Landing'de küçük "Gönderici / Kurye" rol linkleri (rol seçtiriyor) — kaldırıldı, aksiyon odaklı Welcome geldi.
- Tek uzun form ile gönderi oluşturma → 3 adımlı akış.
- Tipografi hiyerarşisi yok, durum ekranları (arıyor/yolda/teslim) yok, kurye teklifi 3 sn'de okunmuyor.
- Bottom nav ikonsuz, 3 sekme; safe-area ve aktif durum zayıf.

## Yön
v4 "Visual Reset" (claude.ai/design projesi, `19–21 v4 *.dc.html`): beyaz zemin + hairline ayraçlar,
ekran başına tek yükseltilmiş blok, 40–52px display rakamlar, mavi yalnızca birincil pill'de,
navy (#0B1220) marka blokları, Manrope.
