# Yolla

KKTC içi gig-economy teslimat platformu.

## Stack

- pnpm monorepo
- Next.js App Router (`apps/web`)
- Prisma + Supabase (`packages/db`, Auth)
- Saf domain (`packages/core`)

## Kurulum

```bash
pnpm install
cp .env.example apps/web/.env.local
# apps/web/.env.local ve gerekirse kök .env içine Supabase + DATABASE_URL doldur
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`DATABASE_URL` Prisma için kök veya `packages/db` ortamında da bulunmalıdır:

```bash
# örnek
cp .env.example .env
```

## Scriptler

| Komut | Açıklama |
|---|---|
| `pnpm dev` | Next.js geliştirme sunucusu |
| `pnpm test` | Vitest (core + web) |
| `pnpm db:generate` | Prisma client |
| `pnpm db:migrate` | Migration uygula |
| `pnpm db:seed` | PlatformConfig + ADMIN bootstrap |

## Admin ilk kullanıcı

1. `ADMIN_BOOTSTRAP_EMAIL` değerindeki e-posta ile `/signup`
2. `pnpm db:seed`
3. `/admin/couriers`

## MVP sırası

Bkz. [Claude.md](./Claude.md) §11.

Şu an kodda:
1. Auth + kurye vetting
2. Gönderi oluşturma + fiyat teklifi + zaman penceresi / Ekspres
