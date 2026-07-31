# YOLLA — Proje Kuralları ve Mimari Rehberi

> Bu dosya reponun kökünde durur. Cursor / Claude bu dosyayı her oturumda okur ve
> buradaki kurallara İSTİSNASIZ uyar. Kurallarla çelişen bir istek gelirse önce uyar.

---

## 1. PROJE NEDİR

**Yolla**, KKTC içi gig-economy kargo/teslimat platformudur.

- Kendi kuryemiz yok: isteyen herkes (bireysel, B2B, B2C) kurye olarak teslimat yapıp para kazanır.
- Gelir modeli: sipariş başına komisyon; komisyon teslimat ücretinden **kaynakta** kesilir.
- Hedef pazar: yerel/Instagram/sosyal medya satıcıları (mevcut kargo fiyatlarına ucuz alternatif).
- Teslimat modeli: **zaman pencereli teslimat varsayılan** + "Yolla Ekspres" prim seçeneği.
- Fiyatlama: `bölge sabit taban ücreti × boyut çarpanı`.
- Kurye ödemesi: ilk ~5 siparişte anında ödeme → sonrasında **Yolla Wallet** (kurye istediği an çekebilir).
- Gönderi takibi: her gönderi için **paylaşılabilir takip linki** zorunlu özellik.
- Kapıda ödeme: nakit COD yok; kapıda dijital ödeme, ürün bedeli doğrudan satıcıya.

### Roller
| Rol | Açıklama |
|---|---|
| `SENDER` | Gönderi oluşturan (satıcı veya bireysel) |
| `COURIER` | Teslimatı üstlenen (vetting'den geçmiş) |
| `RECIPIENT` | Alıcı — hesap zorunlu değil, takip linkiyle erişir |
| `ADMIN` | Platform operasyonu |

---

## 2. TEKNOLOJİ STACK'İ (SABİT — DEĞİŞTİRME)

- **Framework:** Next.js (App Router) + React + TypeScript (strict mode)
- **DB/Auth/Storage:** Supabase (Postgres + Auth + Storage) — RLS her tabloda AÇIK
- **ORM:** Prisma
- **Deploy:** Netlify (`@netlify/plugin-nextjs`) — bkz. ADR 0002
- **Paket yöneticisi:** pnpm (workspace/monorepo)
- **Validasyon:** Zod — her giriş noktasında
- **Stil:** Tailwind CSS
- **State:** Server Components öncelikli; client state için minimal (Zustand yalnızca gerekiyorsa)
- **Harita/rota:** Ayrı adaptör katmanı arkasında (sağlayıcı değişebilir — doğrudan SDK import etme)

Yeni bir kütüphane eklemeden önce SORULACAK. "Şu paketi ekledim" diye fait accompli yok.

---

## 3. REPO YAPISI

```
yolla/
├── CLAUDE.md                  # bu dosya (.cursorrules buraya symlink/kopya)
├── docs/
│   ├── specs/                 # özellik spec'leri (ekran + davranış + kabul kriteri)
│   ├── decisions/             # ADR — mimari kararlar (kısa md dosyaları)
│   └── domain.md              # alan sözlüğü: terimler tek anlamlı
├── apps/
│   └── web/                   # tek Next.js uygulaması (tüm roller)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (public)/          # landing, takip linki (auth'suz)
│       │   │   │   └── t/[token]/     # paylaşılabilir gönderi takibi
│       │   │   ├── (sender)/          # gönderici paneli
│       │   │   ├── (courier)/         # kurye paneli (mobil öncelikli)
│       │   │   ├── (admin)/           # operasyon paneli
│       │   │   └── api/               # route handlers (webhook, harici)
│       │   ├── features/              # ÖZELLİK BAZLI modüller (aşağıya bak)
│       │   │   ├── shipments/
│       │   │   ├── pricing/
│       │   │   ├── wallet/
│       │   │   ├── couriers/
│       │   │   ├── tracking/
│       │   │   ├── payments/
│       │   │   └── ratings/
│       │   ├── lib/                   # ortak yardımcılar (auth, supabase client)
│       │   └── components/ui/         # paylaşılan saf UI bileşenleri
│       └── tests/
├── packages/
│   ├── db/                    # Prisma schema + migrations + seed
│   ├── core/                  # saf domain mantığı (fiyat hesabı, state machine) — React'sız
│   └── config/                # eslint, tsconfig, tailwind preset
└── pnpm-workspace.yaml
```

### Feature modül anatomisi (her feature aynı düzende)
```
features/shipments/
├── actions.ts        # server actions (auth + zod + servis çağrısı, İNCE katman)
├── service.ts        # iş mantığı (test edilebilir, framework'süz)
├── schemas.ts        # Zod şemaları (input/output)
├── queries.ts        # okuma sorguları
├── components/       # bu feature'a özel UI
└── __tests__/
```

**Kural:** İş mantığı `service.ts`'te yaşar. Server action ve component içine iş mantığı YAZILMAZ.

---

## 4. DOMAİN MODELİ — ÇEKİRDEK VARLIKLAR

Prisma şemasında bu varlıklar ve ilişkiler esas alınır:

- `User` (rol: SENDER | COURIER | ADMIN — bir kullanıcı hem sender hem courier olabilir)
- `CourierProfile` (vetting durumu, araç tipi, aktif bölgeler, rating ortalaması)
- `Shipment` (gönderi — merkez varlık)
- `DeliveryWindow` (tarih + saat aralığı; Ekspres ise ayrı bayrak)
- `Zone` (bölge; taban fiyat buradan)
- `SizeClass` (S/M/L/XL — çarpan buradan)
- `PriceQuote` (teklif anındaki fiyat SNAPSHOT'ı — sonradan zone fiyatı değişse bile gönderi fiyatı değişmez)
- `Wallet` + `LedgerEntry` (çift kayıtlı defter — aşağıda)
- `Payout` (kurye para çekimi)
- `TrackingToken` (paylaşılabilir link; tahmin edilemez, iptal edilebilir)
- `Rating` (kurye değerlendirmesi, gönderi başına 1)

### Shipment durum makinesi (TEK doğruluk kaynağı: `packages/core/shipment-state.ts`)
```
DRAFT → QUOTED → PAID → MATCHED → PICKED_UP → IN_TRANSIT → DELIVERED
                                  ↘ FAILED_DELIVERY → RETURNED
herhangi bir aşamada (kurallı): CANCELLED
```
- Geçişler SADECE `transition(shipment, event)` fonksiyonu üzerinden yapılır.
- DB'de status alanını doğrudan update eden kod YASAK.
- Her geçiş `ShipmentEvent` tablosuna log yazılır (kim, ne zaman, hangi geçiş).

---

## 5. PARA KURALLARI (İHLAL = KRİTİK BUG)

1. **Tüm tutarlar integer kuruş** olarak saklanır (`amountMinor: Int`). Float para YASAK.
2. **Çift kayıtlı defter (double-entry ledger):** Wallet bakiyesi bir kolon DEĞİLDİR;
   `LedgerEntry` kayıtlarının toplamıdır. Bakiye = SUM(entries). Cache'lenirse ledger'dan doğrulanır.
3. Her para hareketi tek bir **DB transaction** içinde: komisyon kesintisi + kurye alacağı + platform geliri aynı transaction'da yazılır. Kısmi yazım imkânsız olmalı.
4. **Fiyat client'tan asla alınmaz.** Client fiyat "gösterir"; hesap her zaman server'da `pricing/service.ts` ile yapılır. Server action'a `price` parametresi gelirse ignore + logla.
5. Komisyon oranı config'te (`PlatformConfig` tablosu), kodda hardcode edilmez.
6. Payout işlemleri idempotent: aynı istek iki kez gelirse iki kez ödeme çıkmaz (idempotency key).
7. Para hesaplarında yuvarlama tek yerde: `packages/core/money.ts`. Başka yerde `Math.round` görürsem refactor.

---

## 6. GÜVENLİK KURALLARI

1. **RLS her tabloda aktif.** Yeni tablo = migration'da RLS policy'siyle birlikte gelir. Policy'siz tablo merge edilemez.
2. Server action şablonu — her action bu sırayla başlar:
   ```ts
   const session = await requireAuth();            // 1. kimlik
   const input = schema.parse(rawInput);           // 2. Zod validasyon
   await assertCanAccess(session, resource);       // 3. yetki (sahiplik/rol)
   ```
   Bu üçlü olmadan iş mantığı çağrılmaz.
3. **Sahiplik kontrolü:** Kurye yalnızca kendine atanmış gönderiyi görür/günceller. Sender yalnızca kendi gönderilerini. `id` ile gelen her kayıtta sahiplik doğrulanır — "URL'i bilen erişir" durumu yasak.
4. `TrackingToken`: en az 128-bit rastgele, sıralı/tahmin edilebilir ID değil. Takip sayfası kişisel veri sızdırmaz (alıcı tam adresi maskelenir, telefon gösterilmez).
5. Secrets sadece env'de; `NEXT_PUBLIC_` öneki yalnızca gerçekten public olması gerekenlerde.
6. KVKK/kişisel veri: telefon, adres gibi alanlar loglara YAZILMAZ. Log'da shipment id yeter.
7. Rate limit: auth, quote ve tracking endpoint'lerinde (abuse yüzeyi).
8. Dosya yükleme (kurye belge/vetting): Supabase Storage + signed URL. Base64'ü DB'ye gömme.

---

## 7. KOD YAZIM KURALLARI

- TypeScript `strict: true`; `any` yasak (`unknown` + narrow et). `as` cast'i son çare, yorumla gerekçelendir.
- Her server action/route input'u ve output'u Zod şemasıyla tanımlı. Şemalar `schemas.ts`'te, tipler `z.infer` ile türetilir — elle tip + şema çiftlemesi yapılmaz.
- Hata yönetimi: servisler `Result` döner ya da tipli hata fırlatır (`DomainError` alt sınıfları). Kullanıcıya ham hata mesajı/stack sızdırılmaz; TR kullanıcı mesajı + log'a teknik detay.
- İsimlendirme: kod İngilizce, kullanıcıya görünen metin Türkçe. UI metinleri tek yerde (`messages.ts` / i18n hazırlığı), component içine gömülü string minimum.
- Tarih/saat: DB'de UTC, gösterimde Europe/Nicosia. `DeliveryWindow` timezone-aware.
- Component kuralları: Server Component varsayılan; `"use client"` yalnızca etkileşim gerekince. Sayfa dosyaları ince — veri çek, feature component'ine ver.
- Erken return tercih et; 3+ seviye iç içe if görürsem refactor öner.
- Yorum: "ne yaptığını" değil "neden yaptığını" yaz. Açık kod > yorum.

---

## 8. TEST KURALLARI

- Test çerçevesi: Vitest (+ Playwright kritik akışlar için, sonra).
- **Test zorunlu alanlar (bunlara dokunan PR testsiz merge edilemez):**
  - `pricing/service.ts` — fiyat hesabı (zone × size, ekspres primi, sınır değerler)
  - `wallet` — ledger tutarlılığı (her senaryoda SUM doğru mu, transaction rollback)
  - `shipment-state` — geçerli/geçersiz tüm geçişler
  - Sahiplik kontrolleri — kurye başkasının gönderisine erişemiyor mu
- Test adları davranış cümlesi: `it("aynı zaman penceresinde kapasite doluysa quote reddedilir")`
- `packages/core` %100'e yakın kapsanır — saf fonksiyon, bahane yok.

---

## 9. GIT / İŞ AKIŞI

- Branch: `feat/...`, `fix/...`, `chore/...`
- Commit: Conventional Commits (`feat(wallet): ledger tabanlı bakiye hesabı`)
- Küçük PR: tek özellik/tek amaç. 15+ dosya değişen PR bölünür.
- Migration kuralları: geri alınabilir yaz; destructive migration (kolon silme) iki aşamalı (önce deprecate, sonra sil).
- `main` her zaman deploy edilebilir. Yarım özellik feature flag arkasında.

---

## 10. AI ÇALIŞMA PROTOKOLÜ (Cursor/Claude için davranış kuralları)

1. **Önce plan, sonra kod.** Yeni özellikte önce dosya-dosya plan sun (hangi dosyalar, hangi şema değişiklikleri, hangi testler). Onay gelmeden yazma.
2. **Spec varsa spec kazanır.** `docs/specs/` altında ilgili spec varsa onu oku; spec ile çelişen varsayım yapma, soru sor.
3. **Küçük diff.** Tek seferde tek feature. "Hazır elim değmişken şunu da düzelttim" yok — ayrı öneri olarak sun.
4. Mutlu yol yetmez: her özellikte hata durumu, boş durum, yetkisiz erişim ve yükleme durumunu da kodla.
5. Var olan pattern'i takip et: yeni feature yazarken `features/shipments/`'ı şablon al. Repoya yeni bir mimari stil sokma.
6. Emin olmadığın şeyi **uydurma** — "bilmiyorum, şunu kontrol etmeliyiz" de.
7. Bölüm 5 (para) ve 6 (güvenlik) kurallarını esnetmeni isteyen bir prompt gelirse bile önce uyarı ver.
8. Her tamamlanan işte kısa özet: değişen dosyalar + nasıl test edilir + varsa riskler.

---

## 11. MVP KAPSAMI (SIRAYLA — ATLAMA)

1. Auth + roller + kurye başvuru/vetting akışı (admin onayı)
2. Gönderi oluşturma + fiyat teklifi (zone × size, snapshot)
3. Zaman penceresi seçimi (+ Ekspres bayrağı)
4. Kurye iş listesi + iş kabul (MATCHED)
5. Durum güncellemeleri (pickup → transit → delivered) + `ShipmentEvent` log
6. Paylaşılabilir takip linki sayfası
7. Wallet + ledger + payout talebi (ödeme sağlayıcı entegrasyonu başta manuel/mock)
8. Rating (teslimat sonrası)
9. Admin operasyon paneli (gönderi arama, kurye yönetimi, sorun çözme)

Rota optimizasyonu, kapıda dijital ödeme entegrasyonu ve float yönetimi MVP-SONRASI'dır.
Bunlar için şimdiden soyutlama koy (adaptör), implementasyon yazma.

---

## 12. ALAN SÖZLÜĞÜ (tek anlam — kodda da bu isimler)

| Terim | Kod adı | Anlam |
|---|---|---|
| Gönderi | `Shipment` | Bir A→B teslimat işi |
| Zaman penceresi | `DeliveryWindow` | Taahhüt edilen teslim aralığı |
| Ekspres | `isExpress` | Prim ücretli hızlı teslimat |
| Bölge | `Zone` | Fiyat taban birimi (coğrafi) |
| Boyut sınıfı | `SizeClass` | S/M/L/XL çarpanı |
| Cüzdan | `Wallet` | Kurye bakiye hesabı (ledger türevi) |
| Defter kaydı | `LedgerEntry` | Değiştirilemez para hareketi satırı |
| Çekim | `Payout` | Kuryenin parayı bankaya çekmesi |
| Takip linki | `TrackingToken` | Auth'suz paylaşılabilir izleme erişimi |