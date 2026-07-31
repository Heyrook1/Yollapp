# Rollback — geri alma prosedürü

## 1. Uygulama sürümünü geri al (en hızlı, ~1 dk)

Netlify → Deploys → son iyi bilinen deploy → **Publish deploy**.
Kod anında geri döner. Veritabanı **değişmez** — aşağıdaki uyumluluk notuna bak.

## 2. Migration geri alma

Bu daldaki iki migration da **additive**: yalnızca yeni tablo, yeni enum değeri ve
yeni kısıt ekler. Var olan tabloya kolon eklemez, silmez, veri taşımaz.

**Sonuç:** Uygulamayı eski sürüme döndürmek için migration'ı geri almanız
**gerekmez**. Eski kod yeni tabloları görmezden gelir ve sorunsuz çalışır.
En güvenli yol: kodu geri al, şemayı olduğu gibi bırak.

Şemayı da geri almak gerekirse (yalnızca gerçekten zorunluysa):

```sql
-- ÖNCE YEDEK AL. Bu komutlar defter verisini KALICI SİLER.
BEGIN;
DROP TRIGGER IF EXISTS ledger_entries_append_only ON ledger_entries;
DROP TRIGGER IF EXISTS ledger_entries_no_delete ON ledger_entries;
DROP FUNCTION IF EXISTS ledger_entries_forbid_mutation();
DROP FUNCTION IF EXISTS ledger_entries_forbid_delete();
DROP TABLE IF EXISTS ledger_entries, wallets, payouts, tracking_tokens,
  incidents, audit_logs, consents, idempotency_keys,
  rate_limit_counters, feature_flags CASCADE;
DELETE FROM _prisma_migrations
  WHERE migration_name IN (
    '20260801120000_production_foundations',
    '20260801130000_rate_limit_and_flags'
  );
COMMIT;
```

**Not:** `CourierStatus` enum'una eklenen değerler (`UNDER_REVIEW`, `SUSPENDED`,
`DISABLED`) Postgres'te geri alınamaz. Bu değerleri kullanan satır varsa önce
`PENDING`/`REJECTED`'a taşınmalı. Bu yüzden enum geri alma **önerilmez** —
zararsızdır, eski kod bu değerleri hiç üretmez.

## 3. Acil durumda kodu değil özelliği kapat (tercih edilen)

Deploy geri almak yerine, sorunlu akışı sunucudan kapatın:

```sql
UPDATE feature_flags SET enabled = false WHERE id = 'shipment_creation';
UPDATE feature_flags SET enabled = false WHERE id = 'courier_matching';
```

Etki anında ve kullanıcıya Türkçe açıklamayla yansır. Deploy gerekmez.

## 4. Doğrulama

Geri alma sonrası:

```bash
curl -s https://<site>/api/health
```

`status: "ok"` ve `checks.database: "ok"` bekleniyor. Ardından bir gönderi
oluşturup listede göründüğünü teyit edin.
