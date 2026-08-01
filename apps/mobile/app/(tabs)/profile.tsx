import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type Me } from "@/lib/api";
import { Button } from "@/components/Button";
import { getSupabase } from "@/lib/supabase";
import { colors, radius, spacing } from "@/theme/tokens";

const courierStatusLabel: Record<string, string> = {
  NOT_APPLIED: "Kurye değil",
  PENDING: "Başvuru alındı",
  UNDER_REVIEW: "İncelemede",
  APPROVED: "Onaylı kurye",
  REJECTED: "Onaylanmadı",
  SUSPENDED: "Askıya alındı",
  DISABLED: "Devre dışı",
};

export default function ProfileScreen() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setMe(await api.me());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Profil yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function logout() {
    await getSupabase().auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const status = me?.courier.status ?? "NOT_APPLIED";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(me?.email ?? "??").slice(0, 2).toLocaleUpperCase("tr-TR")}
            </Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.email} numberOfLines={1}>
              {me?.email ?? "—"}
            </Text>
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>Gönderici</Text>
              {me?.courier.approved ? (
                <Text style={[styles.badge, styles.badgeSuccess]}>Kurye</Text>
              ) : null}
            </View>
          </View>
        </View>

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>KURYE DURUMU</Text>
          <Text style={styles.cardValue}>{courierStatusLabel[status] ?? status}</Text>
          {me?.courier.rejectionReason ? (
            <Text style={styles.rejectionReason}>
              Neden: {me.courier.rejectionReason}
            </Text>
          ) : null}
          {me?.courier.activeZones.length ? (
            <Text style={styles.cardMeta}>
              Bölgeler: {me.courier.activeZones.join(", ")}
            </Text>
          ) : null}

          {!me?.courier.approved && me?.courier.canApply ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/courier-apply" as never)}
              style={styles.applyLink}
            >
              <Text style={styles.applyLinkText}>
                {status === "REJECTED" ? "Yeniden başvur →" : "Kurye başvurusu yap →"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {me?.isAdmin ? (
          <View style={styles.adminNote}>
            <Text style={styles.adminNoteText}>
              Operasyon paneli yalnızca web üzerinden erişilebilir. Mobil uygulamada
              admin yüzeyi bulunmaz.
            </Text>
          </View>
        ) : null}

        <Button label="Çıkış yap" variant="soft" onPress={logout} />
        <Text style={styles.footnote}>YOLLA · Her yere. Her şeyi. Daha hızlı.</Text>
      </ScrollView>
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
  content: { padding: 24, gap: spacing.lg, paddingBottom: 40 },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.base },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.inkInverse, fontSize: 20, fontWeight: "800" },
  identityText: { flex: 1, gap: 6 },
  email: { fontSize: 20, fontWeight: "800", color: colors.ink },
  badgeRow: { flexDirection: "row", gap: 6 },
  badge: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  badgeSuccess: { color: colors.successDeep, backgroundColor: colors.successSoft },
  card: {
    backgroundColor: colors.fillSoft,
    borderRadius: radius.cardLg,
    padding: spacing.lg,
    gap: 6,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: colors.inkFaint,
  },
  cardValue: { fontSize: 20, fontWeight: "800", color: colors.ink },
  cardMeta: { fontSize: 13, fontWeight: "600", color: colors.inkSecondary },
  rejectionReason: { fontSize: 13, fontWeight: "700", color: colors.danger },
  applyLink: { minHeight: 44, justifyContent: "center" },
  applyLinkText: { fontSize: 15, fontWeight: "800", color: colors.primary },
  adminNote: {
    backgroundColor: colors.infoSoft,
    borderRadius: radius.control,
    padding: spacing.md,
  },
  adminNoteText: { fontSize: 13, fontWeight: "600", color: colors.inkSecondary },
  error: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
    padding: spacing.md,
    borderRadius: radius.control,
  },
  footnote: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.inkFaint,
    textAlign: "center",
  },
});
