import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type CourierJob } from "@/lib/api";
import { Button } from "@/components/Button";
import { colors, radius, spacing } from "@/theme/tokens";

const ACTIVE = ["MATCHED", "PICKED_UP", "IN_TRANSIT"];

/** Kurye işleri: aktif görev üstte, altında açık iş havuzu. */
export default function JobsScreen() {
  const router = useRouter();
  const [open, setOpen] = useState<CourierJob[]>([]);
  const [mine, setMine] = useState<CourierJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [openRes, mineRes] = await Promise.all([
        api.listJobs(false),
        api.listJobs(true),
      ]);
      setOpen(openRes.jobs.filter((j) => j.status === "PAID"));
      setMine(mineRes.jobs.filter((j) => ACTIVE.includes(j.status)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "İşler yüklenemedi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function accept(job: CourierJob) {
    Alert.alert(
      "İşi kabul et",
      `${job.netLabel ?? ""} net kazanç\n${job.pickupAddress} → ${job.dropoffAddress}`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Kabul et",
          onPress: async () => {
            setBusyId(job.id);
            try {
              await api.jobAction(job.id, "accept");
              await load();
            } catch (e) {
              Alert.alert(
                "İş alınamadı",
                e instanceof ApiError ? e.message : "Tekrar deneyin.",
              );
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={open}
        keyExtractor={(j) => j.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.title}>İşler</Text>
            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}

            {mine.length > 0 ? (
              <View style={styles.activeBlock}>
                <Text style={styles.sectionLabel}>AKTİF GÖREVİN</Text>
                {mine.map((job) => (
                  <Pressable
                    key={job.id}
                    accessibilityRole="button"
                    onPress={() => router.push(`/shipment/${job.id}` as never)}
                    style={styles.activeCard}
                  >
                    <Text style={styles.activeStatus}>{job.statusLabel}</Text>
                    <Text style={styles.activeRoute} numberOfLines={2}>
                      {job.dropoffAddress}
                    </Text>
                    <Text style={styles.activeCta}>Görevi aç →</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>AÇIK İŞLER</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Şu an açık iş yok</Text>
            <Text style={styles.emptyBody}>
              Yeni teslimatlar geldiğinde burada görünecek.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.net}>{item.netLabel ?? "—"}</Text>
              {item.commissionLabel ? (
                <Text style={styles.commission}>
                  brüt {item.grossLabel} − kom. {item.commissionLabel}
                </Text>
              ) : null}
            </View>

            <View style={styles.routeBlock}>
              <View style={styles.routeRow}>
                <View style={styles.dotDark} />
                <Text style={styles.routeText} numberOfLines={1}>
                  {item.pickupAddress}
                </Text>
              </View>
              <View style={styles.routeRow}>
                <View style={styles.dotBlue} />
                <Text style={styles.routeText} numberOfLines={1}>
                  {item.dropoffAddress} · {item.zoneName}
                </Text>
              </View>
            </View>

            <View style={styles.chipRow}>
              <Text style={styles.chip}>{item.sizeName}</Text>
              <Text style={styles.chip}>{item.isExpress ? "Ekspres" : "Standart"}</Text>
              {item.windowLabel ? <Text style={styles.chip}>{item.windowLabel}</Text> : null}
            </View>

            <Button
              label="Kabul et"
              onPress={() => accept(item)}
              loading={busyId === item.id}
              style={styles.acceptButton}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  centered: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 24, paddingBottom: 40, gap: spacing.base },
  headerBlock: { gap: spacing.md, marginBottom: spacing.xs },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -1, color: colors.ink },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.inkFaint,
  },
  activeBlock: { gap: spacing.sm },
  activeCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.cardLg,
    padding: spacing.lg,
    gap: 4,
  },
  activeStatus: { color: "#7FA8FF", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  activeRoute: { color: colors.inkInverse, fontSize: 18, fontWeight: "800" },
  activeCta: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "800" },
  card: {
    backgroundColor: colors.fillSoft,
    borderRadius: radius.cardLg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  cardTop: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  net: { fontSize: 28, fontWeight: "800", letterSpacing: -1, color: colors.ink },
  commission: { fontSize: 11, fontWeight: "700", color: colors.inkFaint },
  routeBlock: { gap: 6 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dotDark: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.navy },
  dotBlue: { width: 8, height: 8, borderRadius: 2, backgroundColor: colors.primary },
  routeText: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.ink },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkSecondary,
    backgroundColor: colors.fill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  acceptButton: { marginTop: spacing.xs },
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.fillSoft,
    borderRadius: radius.cardLg,
    padding: spacing["2xl"],
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  emptyBody: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.inkSecondary,
    textAlign: "center",
  },
  error: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
    padding: spacing.md,
    borderRadius: radius.control,
  },
});
