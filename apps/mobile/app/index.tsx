import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { colors, spacing, typography } from "@/theme/tokens";

const trustItems = ["Doğrulanmış kuryeler", "Canlı takip", "Teslimat kodu"] as const;

/** Karşılama ekranı — web'deki Welcome ile aynı hiyerarşi ve marka anı. */
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.top}>
          <Text style={styles.wordmark}>YOLLA</Text>
          <View style={styles.headlineBlock}>
            <Text style={styles.headline}>Her yere.</Text>
            <Text style={styles.headline}>Her şeyi.</Text>
            <Text style={[styles.headline, styles.headlineAccent]}>Daha hızlı.</Text>
          </View>
          <Text style={styles.subtitle}>
            Kıbrıs&apos;ın kurye ağı. Dakikalar içinde kurye bul, canlı takip et.
          </Text>
        </View>

        <View style={styles.bottom}>
          <View style={styles.trustRow}>
            {trustItems.map((item) => (
              <View key={item} style={styles.trustItem}>
                <Text style={styles.trustCheck}>✓</Text>
                <Text style={styles.trustLabel}>{item}</Text>
              </View>
            ))}
          </View>

          <Button label="Paket gönder" onPress={() => router.push("/login")} />
          <Button
            label="Giriş yap"
            variant="secondary"
            onPress={() => router.push("/login")}
            style={styles.secondaryButton}
          />
          <Text
            accessibilityRole="link"
            onPress={() => router.push("/login")}
            style={styles.earnLink}
          >
            Teslimat yaparak kazan →
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  safe: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing.xl,
  },
  top: { gap: spacing.xl, paddingTop: spacing["2xl"] },
  wordmark: {
    color: colors.inkInverse,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 4,
  },
  headlineBlock: { gap: 0 },
  headline: {
    color: colors.inkInverse,
    fontSize: typography.display.fontSize,
    fontWeight: "800",
    letterSpacing: typography.display.letterSpacing,
    lineHeight: typography.display.lineHeight,
  },
  headlineAccent: { color: "#4D8DFF" },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  bottom: { gap: spacing.md },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.base,
    paddingBottom: spacing.xs,
  },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustCheck: { color: "#4ADE80", fontSize: 13, fontWeight: "800" },
  trustLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "700" },
  secondaryButton: { marginTop: -spacing.xs },
  earnLink: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: spacing.md,
  },
});
