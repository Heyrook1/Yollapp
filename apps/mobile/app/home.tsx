import { useMemo } from "react";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// Domain mantığı web ile PAYLAŞILIR — packages/core React'sız olduğu için
// fiyatlama ve para biçimlendirme burada aynen çalışır (ADR 0003).
import { calculatePrice, formatTry, splitDeliveryEarning } from "@yolla/core";
import { Button } from "@/components/Button";
import { colors, radius, spacing } from "@/theme/tokens";

/**
 * Gönderici ana ekranı (ilk sürüm).
 *
 * Fiyat burada YALNIZCA önizleme amaçlı hesaplanır; yetkili fiyat her zaman
 * sunucuda üretilir ve gönderi oluşturulurken snapshot'lanır (CLAUDE.md §5.4).
 */
export default function HomeScreen() {
  const router = useRouter();

  // Girne (60₺ taban) × Orta paket (1.5×) — katalog sunucudan gelene kadar örnek.
  const preview = useMemo(() => {
    const price = calculatePrice({
      zoneBaseMinor: 6000,
      sizeMultiplier: 1.5,
      expressPremiumBps: 5000,
      isExpress: false,
    });
    const split = splitDeliveryEarning(price.amountMinor, 1500);
    return { price, split };
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>Merhaba</Text>

        <View style={styles.searchCard}>
          <View style={styles.dot} />
          <Text style={styles.searchText}>Nereye gönderiyorsun?</Text>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>ÖRNEK FİYAT · GİRNE · ORTA PAKET</Text>
          <Text style={styles.previewAmount}>{formatTry(preview.price.amountMinor)}</Text>
          <View style={styles.previewRow}>
            <Text style={styles.previewMeta}>
              Kurye kazancı {formatTry(preview.split.netMinor)}
            </Text>
            <Text style={styles.previewMeta}>
              Komisyon {formatTry(preview.split.commissionMinor)}
            </Text>
          </View>
          <Text style={styles.previewNote}>
            Kesin fiyat gönderi oluşturulurken sunucuda hesaplanır.
          </Text>
        </View>

        <Button label="Paket gönder" onPress={() => router.push("/")} />

        <Text style={styles.footnote}>
          Bu ekran mobil uygulamanın ilk sürümüdür. Gönderi oluşturma, canlı takip ve
          kurye akışı web uygulamasında tamamlanmıştır; mobile taşınmaları sürüyor.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 24, gap: spacing.lg },
  greeting: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1.2,
    color: colors.ink,
  },
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 64,
    borderRadius: radius.card,
    backgroundColor: colors.fill,
    paddingHorizontal: spacing.lg,
  },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  searchText: { fontSize: 19, fontWeight: "800", color: colors.inkSecondary },
  previewCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.cardLg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#7FA8FF",
  },
  previewAmount: {
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1.6,
    color: colors.inkInverse,
  },
  previewRow: { flexDirection: "row", justifyContent: "space-between" },
  previewMeta: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
  previewNote: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
  },
  footnote: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkFaint,
    lineHeight: 19,
  },
});
