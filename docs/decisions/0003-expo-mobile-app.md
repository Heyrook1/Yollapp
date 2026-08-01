# ADR 0003 — Expo (React Native) mobil uygulaması eklendi

## Durum

Kabul edildi (2026-08-01). CLAUDE.md §2'deki sabit stack genişletildi.

## Bağlam

§2 stack'i "SABİT — DEĞİŞTİRME" olarak işaretliyor ve yalnızca Next.js web
uygulamasını tanımlıyordu. Proje sahibi native mobil uygulama istedi.

Web uygulaması mobil öncelikli ve telefonda çalışıyor; ancak native uygulama
push bildirim, arka plan konum ve mağaza dağıtımı gibi kurye akışının pilot
sonrası ihtiyaç duyacağı yetenekleri açar.

## Karar

- `apps/mobile` altında **Expo (SDK 54) + expo-router** uygulaması.
- Web uygulaması **kaldırılmıyor**: admin paneli web'de kalır (mobilde admin
  yüzeyi olmayacak — §Phase 2 kuralı), takip linki web'de açılır.
- **Domain mantığı paylaşılır:** `packages/core` React'sız olduğu için
  fiyatlama, para, defter ve durum makinesi mobilde AYNEN kullanılır.
  Bu, §3'teki "iş mantığı service/core'da yaşar" kuralının karşılığıdır.
- **`packages/db` mobilde KULLANILMAZ.** Prisma ve `DATABASE_URL` cihaza inmez;
  mobil yalnızca Supabase anon key ile konuşur. Veritabanı sırrı istemciye gitmez.
- Tasarım token'ları `apps/mobile/src/theme/tokens.ts` içinde web ile birebir
  aynı değerlerle tanımlanır (Tailwind CSS değişkenleri RN'de çalışmaz).

## Sonuç

- Yeni bir build hattı gerekir (EAS Build) — mağaza dağıtımı için Apple/Google
  geliştirici hesabı zorunlu, bu bir dış bağımlılıktır.
- Ekranlar tek tek RN'ye taşınacak; bu ADR anında tam eşitlik iddia etmez.
- pnpm + Metro sembolik link uyumu için `.npmrc` içinde `node-linker=hoisted`
  kullanılır; aksi halde Metro workspace paketlerini çözemez.
- İki istemci aynı Supabase projesine bağlanır; RLS her iki taraf için de
  tek koruma katmanıdır.
