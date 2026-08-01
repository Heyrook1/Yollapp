import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type Me } from "@/lib/api";
import { colors, radius, spacing } from "@/theme/tokens";

/** Kurye cüzdanı. Kesintiler açıkça gösterilir — komisyon gizlenmez. */
export default function WalletScreen() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      setMe(await api.me());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Cüzdan yüklenemedi.");
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

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const wallet = me?.wallet;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={wallet?.entries ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Cüzdan</Text>
            <Text style={styles.balanceLabel}>Kullanılabilir bakiye</Text>
            <Text style={styles.balance}>{wallet?.availableLabel ?? "—"}</Text>

            <View style={styles.payoutBox}>
              <Text style={styles.payoutText}>
                Para çekme yakında — ödeme sağlayıcısı henüz bağlanmadı.
              </Text>
            </View>

            <View style={styles.statsRow}>
              <Stat label="BEKLEYEN" value={wallet?.pendingLabel ?? "—"} />
              <Stat label="TESLİMAT" value={String(wallet?.deliveredCount ?? 0)} />
              <Stat label="KOMİSYON" value={wallet?.commissionPctLabel ?? "—"} />
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Henüz işlem yok</Text>
              <Text style={styles.emptyBody}>
                İlk teslimatını tamamladığında net kazancın burada görünür.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowDetail}>
                {item.detail}
                {item.settled ? "" : " · devam ediyor"}
              </Text>
            </View>
            <Text style={[styles.rowAmount, !item.settled && styles.rowAmountPending]}>
              +{item.amountLabel}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
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
  list: { paddingBottom: 40 },
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 24,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.inkInverse,
    marginBottom: spacing.md,
  },
  balanceLabel: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.5)" },
  balance: {
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -2,
    color: colors.inkInverse,
  },
  payoutBox: {
    marginTop: spacing.base,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: radius.control,
    padding: spacing.md,
  },
  payoutText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
  statsRow: {
    flexDirection: "row",
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingTop: spacing.base,
  },
  stat: { flex: 1, gap: 2 },
  statLabel: { fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.45)" },
  statValue: { fontSize: 19, fontWeight: "800", color: colors.inkInverse },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: 24,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  rowDetail: { fontSize: 12, fontWeight: "600", color: colors.inkFaint },
  rowAmount: { fontSize: 16, fontWeight: "800", color: colors.successDeep },
  rowAmountPending: { color: colors.inkFaint },
  empty: {
    margin: 24,
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
    margin: 24,
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
    padding: spacing.md,
    borderRadius: radius.control,
  },
});
