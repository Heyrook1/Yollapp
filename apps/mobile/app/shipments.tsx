import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type ShipmentSummary } from "@/lib/api";
import { Button } from "@/components/Button";
import { colors, radius, spacing } from "@/theme/tokens";

/** Gönderilerim — gerçek API'den yüklenir, sahte veri yok. */
export default function ShipmentsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ShipmentSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const result = await api.listShipments();
      setItems(result.shipments);
    } catch (e) {
      setItems([]);
      setError(e instanceof ApiError ? e.message : "Gönderiler yüklenemedi.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (items === null) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Gönderilerin yükleniyor…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Gönderilerim</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/new-shipment")}
          style={styles.newButton}
        >
          <Text style={styles.newButtonText}>+ Yeni</Text>
        </Pressable>
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListEmptyComponent={
          error ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Henüz gönderin yok</Text>
              <Text style={styles.emptyBody}>
                İlk paketini gönder — bölgeni ve boyutunu seç, fiyatı anında gör.
              </Text>
              <Button
                label="Paket gönder"
                onPress={() => router.push("/new-shipment")}
                style={styles.emptyButton}
              />
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.recipientName}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.code} · {item.dropoffAddress}
              </Text>
            </View>
            <Text style={styles.rowStatus}>{item.statusLabel}</Text>
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
    gap: spacing.md,
  },
  loadingText: { color: colors.inkSecondary, fontSize: 15, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1,
    color: colors.ink,
  },
  newButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  newButtonText: { color: colors.inkInverse, fontWeight: "800", fontSize: 14 },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  rowMeta: { fontSize: 12, fontWeight: "600", color: colors.inkFaint },
  rowStatus: { fontSize: 13, fontWeight: "800", color: colors.primary },
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.fillSoft,
    borderRadius: radius.cardLg,
    padding: spacing["2xl"],
    marginTop: spacing.lg,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  emptyBody: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.inkSecondary,
    textAlign: "center",
  },
  emptyButton: { marginTop: spacing.md, alignSelf: "stretch" },
  error: {
    marginHorizontal: 24,
    marginBottom: spacing.md,
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
    padding: spacing.md,
    borderRadius: radius.control,
  },
});
