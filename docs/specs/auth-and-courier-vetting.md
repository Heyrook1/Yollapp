# Spec: Auth + Kurye başvuru / vetting

## Özet

Kullanıcı e-posta/şifre ile kayıt olur ve giriş yapar. Varsayılan rol `SENDER`.
Kurye olmak isteyen kullanıcı başvuru formunu doldurur; admin onaylar veya reddeder.
Onayda kullanıcıya `COURIER` rolü eklenir.

## Ekranlar

| Rota | Rol | Davranış |
|---|---|---|
| `/signup`, `/login` | public | E-posta/şifre auth |
| `/courier/apply` | authenticated | Başvuru formu + durum |
| `/admin/couriers` | ADMIN | Bekleyen başvurular, onay/red |

## Davranış

1. İlk oturumda Prisma `User` upsert edilir (`id` = Supabase Auth user id), rol `[SENDER]`.
2. Başvuru `CourierProfile` oluşturur, `status=PENDING`. Zaten PENDING ise idempotent.
3. APPROVED ise yeni başvuru `CONFLICT`.
4. REJECTED ise yeniden başvuru PENDING'e çeker.
5. Admin APPROVE: profile APPROVED + `User.roles` içine COURIER.
6. Admin REJECT: reason zorunlu; COURIER rolü eklenmez.
7. Non-admin review → FORBIDDEN.

## Kabul kriterleri

- [ ] Auth'suz `/courier/*` ve `/admin/*` → login redirect
- [ ] Non-admin `/admin/couriers` → yetkisiz mesaj
- [ ] Başvuru sonrası durum PENDING görünür
- [ ] Admin onay sonrası kullanıcıda COURIER rolü
- [ ] Red sonrası reason görünür; COURIER yok
- [ ] Para/fiyat client'tan alınmaz (bu slice'ta fiyat yok)
- [ ] UI metinleri Türkçe (`messages.ts`)

## Admin bootstrap

1. `ADMIN_BOOTSTRAP_EMAIL` ile kullanıcı signup olur.
2. `pnpm db:seed` çalıştırılır → kullanıcıya ADMIN eklenir.
