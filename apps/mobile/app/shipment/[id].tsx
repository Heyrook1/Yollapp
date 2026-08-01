import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type JobAction, type ShipmentDetail } from "@/lib/api";
import { Button } from "@/components/Button";
import { colors, radius, spacing } from "@/theme/tokens";

const statusLabels: Record<string, string> = {
  DRAFT: "Taslak",
  QUOTED: "Ödeme bekliyor",
  PAID: "Kurye aranıyor",
  MATCHED: "Kurye atandı",
  PICKED_UP: "Paket alındı",
  IN_TRANSIT: "Yolda",
  DELIVERED: "Teslim edildi",
  FAILED_DELIVERY: "Teslim edilemedi",
  RETURNED: "İade edildi",
  CANCELLED: "İptal edildi",
};

/** Kurye görev akışı — her aşamada TEK baskın aksiyon. */
const courierStep: Record<
  string,
  { title: string; action: JobAction; label: string; confirm: string }
> = {
  MATCHED: {
    title: "Alım noktasına git",
    action: "pick_up",
    label: "Paketi teslim aldım",
    confirm: "Paketi göndericiden teslim aldın mı?",
  },
  PICKED_UP: {
    title: "Yola çık",
    action: "start_transit",
    label: "Yola çıktım",
    confirm: "Teslimat noktasına doğru hareket ediyor musun?",
  },
  IN_TRANSIT: {
    title: "Teslimat noktasına git",
    action: "deliver",
    label: "Teslim ettim",
    confirm: "Teslimat tamamlandı mı? Bu işlem geri alınamaz.",
  },
};

export default function ShipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setDetail(await api.shipmentDetail(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gönderi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function run(fn: () => Promise<unknown>, failTitle: string) {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      Alert.alert(failTitle, e instanceof ApiError ? e.message : "Tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  function confirmAction(message: string, onYes: () => void) {
    Alert.alert("Onayla", message, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Evet", onPress: onYes },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Text style={styles.errorTitle}>Gönderi bulunamadı</Text>
        <Text style={styles.errorBody}>{error ?? "Bu gönderiye erişimin yok."}</Text>
        <Button label="Geri dön" variant="soft" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const step = detail.viewer === "courier" ? courierStep[detail.status] : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Text style={styles.code}>{detail.code}</Text>
        <Text style={styles.status}>
          {statusLabels[detail.status] ?? detail.status}
        </Text>

        {detail.windowLabel ? (
          <Text style={styles.window}>Teslimat penceresi · {detail.windowLabel}</Text>
        ) : null}

        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.dotDark} />
            <View style={styles.routeTextBlock}>
              <Text style={styles.routeLabel}>ALIM</Text>
              <Text style={styles.routeValue}>{detail.pickupAddress}</Text>
            </View>
          </View>
          <View style={styles.routeRow}>
            <View style={styles.dotBlue} />
            <View style={styles.routeTextBlock}>
              <Text style={[styles.routeLabel, styles.routeLabelBlue]}>TESLİM</Text>
              <Text style={styles.routeValue}>{detail.dropoffAddress}</Text>
              <Text style={styles.routeMeta}>{detail.recipientName}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaChip}>{detail.zoneName}</Text>
          <Text style={styles.metaChip}>{detail.sizeName}</Text>
          {detail.isExpress ? <Text style={styles.metaChip}>Ekspres</Text> : null}
          {detail.amountLabel ? (
            <Text style={[styles.metaChip, styles.metaChipAmount]}>
              {detail.amountLabel}
            </Text>
          ) : null}
        </View>

        {detail.events.length > 0 ? (
          <View style={styles.timeline}>
            <Text style={styles.sectionLabel}>DURUM GEÇMİŞİ</Text>
            {detail.events.map((e, i) => (
              <View key={`${e.toStatus}-${i}`} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <Text style={styles.timelineText}>
                  {statusLabels[e.toStatus] ?? e.toStatus}
                </Text>
                <Text style={styles.timelineTime}>{e.timeLabel}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Kurye görev akışı */}
        {step ? (
          <View style={styles.actionBlock}>
            <Text style={styles.sectionLabel}>SIRADAKİ GÖREV</Text>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Button
              label={step.label}
              loading={busy}
              onPress={() =>
                confirmAction(step.confirm, () =>
                  run(() => api.jobAction(detail.id, step.action), "Görev güncellenemedi"),
                )
              }
            />
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                confirmAction(
                  "Teslimat sorunu bildirilsin mi? Operasyon ekibi bilgilendirilir.",
                  () =>
                    run(() => api.jobAction(detail.id, "fail"), "Sorun bildirilemedi"),
                )
              }
              style={styles.secondaryLink}
            >
              <Text style={styles.secondaryLinkText}>Teslimat sorunu bildir</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Gönderici aksiyonları */}
        {detail.viewer === "sender" && detail.status === "QUOTED" ? (
          <View style={styles.actionBlock}>
            <Text style={styles.payNote}>
              Test ödemesi — gerçek kart çekilmez, ödeme sağlayıcısı henüz bağlanmadı.
            </Text>
            <Button
              label="Ödemeyi tamamla"
              loading={busy}
              onPress={() =>
                run(() => api.shipmentAction(detail.id, "pay"), "Ödeme alınamadı")
              }
            />
          </View>
        ) : null}

        {detail.viewer === "sender" &&
        ["QUOTED", "PAID", "MATCHED"].includes(detail.status) ? (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              confirmAction("Gönderi iptal edilsin mi? Bu işlem geri alınamaz.", () =>
                run(() => api.shipmentAction(detail.id, "cancel"), "İptal edilemedi"),
              )
            }
            style={styles.secondaryLink}
          >
            <Text style={styles.cancelLinkText}>Gönderiyi iptal et</Text>
          </Pressable>
        ) : null}

        <Text style={styles.footnote}>
          Canlı harita takibi henüz aktif değil — harita sağlayıcısı bağlanmadı.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceElevated },
  centered: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: spacing.md,
  },
  content: { padding: 24, gap: spacing.md, paddingBottom: 48 },
  back: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 20, color: colors.ink },
  code: { fontSize: 12, fontWeight: "800", letterSpacing: 1, color: colors.inkFaint },
  status: { fontSize: 30, fontWeight: "800", letterSpacing: -1, color: colors.ink },
  window: { fontSize: 14, fontWeight: "600", color: colors.inkSecondary },
  routeCard: {
    backgroundColor: colors.fillSoft,
    borderRadius: radius.cardLg,
    padding: spacing.lg,
    gap: spacing.base,
  },
  routeRow: { flexDirection: "row", gap: spacing.md },
  dotDark: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.navy, marginTop: 4 },
  dotBlue: { width: 12, height: 12, borderRadius: 3, backgroundColor: colors.primary, marginTop: 4 },
  routeTextBlock: { flex: 1, gap: 2 },
  routeLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.inkFaint,
  },
  routeLabelBlue: { color: colors.primary },
  routeValue: { fontSize: 16, fontWeight: "800", color: colors.ink },
  routeMeta: { fontSize: 12, fontWeight: "600", color: colors.inkFaint },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.inkSecondary,
    backgroundColor: colors.fill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  metaChipAmount: { color: colors.inkInverse, backgroundColor: colors.navy },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.inkFaint,
  },
  timeline: { gap: spacing.sm, paddingTop: spacing.sm },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  timelineText: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.ink },
  timelineTime: { fontSize: 12, fontWeight: "600", color: colors.inkFaint },
  actionBlock: {
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.lg,
  },
  stepTitle: { fontSize: 22, fontWeight: "800", color: colors.ink },
  payNote: { fontSize: 13, fontWeight: "700", color: colors.successDeep },
  secondaryLink: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  secondaryLinkText: { fontSize: 15, fontWeight: "800", color: colors.inkSecondary },
  cancelLinkText: { fontSize: 15, fontWeight: "800", color: colors.danger },
  errorTitle: { fontSize: 22, fontWeight: "800", color: colors.ink },
  errorBody: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.inkSecondary,
    textAlign: "center",
  },
  footnote: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkFaint,
    textAlign: "center",
    paddingTop: spacing.sm,
  },
});
