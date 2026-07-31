# YOLLA Design System

Kaynak: `apps/web/src/app/globals.css` (`@theme`) + `apps/web/src/components/ui/*`.

## Tokens
- **Primary** `#0057FF` (deep `#0033CC`, soft `#E8EFFF`) — ekran başına 1 birincil aksiyon.
- **Accent** `#FF8A00` (kurye/kazanç vurgusu, soft `#FFF4E6`).
- **Navy** `#0B1220` — marka blokları (welcome, canlı kart, cüzdan başlığı).
- Zemin `#F7F9FC`, yüzey `#FFFFFF`, fill `#F1F5F9`, fill-soft `#F8FAFC`, border `#E2E8F0`.
- Metin `#0F172A` / ikincil `#64748B` / soluk `#94A3B8`.
- Semantik: success `#22C55E` (deep `#15803D`), warning `#F59E0B` (deep `#B45309`), danger `#E11D48`, info `#0284C7`.
- Font: **Manrope** (next/font, `--font-sans`); rakamlar `tabular-nums`.
- Radius: kontrol 16, kart 20–24, sheet 32, buton pill (999).
- Spacing 8'lik grid (4–64). Dokunma hedefi ≥44px; birincil buton 56–58px; input 52px; mobil yatay padding 20–24px.
- Gölge: `shadow-primary` (mavi pill), `shadow-float` (yüzen daire butonlar), `shadow-sheet` (alt sayfa).
- Motion: `blink`, `radar`, `pulse` keyframes; `prefers-reduced-motion` ile kapatılır.

## Kurallar
1. Mavi degrade pill = ekrandaki TEK birincil aksiyon. İkincil aksiyonlar navy/soft/ghost.
2. Kart ızgarası değil, beyaz zemin + `border-line` hairline satırlar; ekran başına en fazla 1 koyu yükseltilmiş blok.
3. Hiyerarşiyi display rakamlar taşır (ETA 52px, kazanç 48–72px, bakiye 56px).
4. Durum yalnız renkle anlatılmaz — `StatusBadge` etiket + renk verir.
5. Para daima `formatTry(amountMinor)`; UI'da asla float hesap yapılmaz, fiyat client'tan gelmez.

## Bileşenler (`components/ui`)
`Button` (primary/dark/secondary/soft/ghost/danger/success · sm/md/lg · loading) · `IconButton` ·
`Field`/`TextInput`/`Select`/`Textarea` · `Chip` · `StatusBadge` · `SegmentedProgress` ·
`SheetPanel`+`ConfirmDialog` · `Timeline` · `EmptyState`/`ErrorState` · `Skeleton` · `TopBar` ·
`BottomTabBar` (ikonlu, safe-area) · `MapCanvas` (harita adaptörü placeholder'ı) · `icons.tsx`.

Tüm etkileşimli bileşenler: focus-visible halka, disabled, loading durumları; `aria-*` etiketleri TR.
