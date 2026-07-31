# Spec: Kurye iş listesi + kabul (MATCHED)

## Özet

Sender mock ödeme ile `QUOTED → PAID` yapar. Onaylı kuryeler `PAID` ve `courierId=null` işleri görür; kabulde `PAID → MATCHED` + kurye ataması. Geçişler yalnızca `transition()`.

## Ekranlar

| Rota | Rol | Davranış |
|---|---|---|
| `/sender/shipments` | sender | QUOTED satırında "Öde (mock)" |
| `/courier/jobs` | COURIER | Açık işler + kabul (mobil öncelikli) |
| `/courier/jobs/mine` | COURIER | Üzerindeki işler |

## Kabul kriterleri

- [ ] Non-courier `/courier/jobs` → kurye başvurusu yönlendirmesi
- [ ] Onaysız kurye accept → FORBIDDEN
- [ ] Çift kabul → CONFLICT
- [ ] Kurye yalnızca kendine atananı "işlerim"de görür
- [ ] ShipmentEvent her PAY/MATCH geçişinde yazılır
- [ ] Client fiyatı yok; ödeme mock
