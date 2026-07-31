# Spec: Gönderi oluşturma + fiyat teklifi + zaman penceresi

## Özet

Sender bölge, boyut, zaman penceresi ve (opsiyonel) Ekspres seçerek gönderi oluşturur.
Fiyat sunucuda `zoneBase × sizeMultiplier (+ express premium)` ile hesaplanır ve `PriceQuote` olarak snapshot alınır. Durum `DRAFT → QUOTED` yalnızca `transition()` ile geçer.

## Ekranlar

| Rota | Rol | Davranış |
|---|---|---|
| `/sender` | SENDER | Panel kısayolları |
| `/sender/shipments` | auth | Kendi gönderi listesi |
| `/sender/shipments/new` | auth | Oluştur + otomatik quote |

## Kabul kriterleri

- [ ] Fiyat client'tan gelirse ignore + log
- [ ] Quote tutarları integer kuruş (`amountMinor`)
- [ ] Status doğrudan update edilmez; `transition(QUOTE)` kullanılır
- [ ] Her geçiş `ShipmentEvent` kaydı üretir
- [ ] Sender yalnızca kendi gönderilerini listeler
- [ ] Zaman penceresi UTC saklanır; ekspres bayrağı fiyatı etkiler
- [ ] Boş katalog / hata / yetkisiz durumları UI'da var
