import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { colors, radius, spacing } from "@/theme/tokens";

const vehicles = [
  { value: "WALK", label: "Yaya", hint: "Merkezde kısa mesafeler" },
  { value: "BIKE", label: "Bisiklet", hint: "Küçük ve hafif paketler" },
  { value: "MOTORCYCLE", label: "Motosiklet", hint: "En hızlı eşleşme" },
  { value: "CAR", label: "Otomobil", hint: "Büyük ve hacimli paketler" },
] as const;

/**
 * Kurye başvurusu. Onay ADMIN tarafından verilir — burada otomatik onay yok.
 * Belge yükleme henüz yok; başvuru bu bilgilerle incelenir (dürüstçe belirtilir).
 */
export default function CourierApplyScreen() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [vehicleType, setVehicleType] = useState<string>("MOTORCYCLE");
  const [zones, setZones] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const catalog = await api.catalog();
        setAvailable(catalog.zones.map((z) => z.name));
      } catch {
        // Bölge önerisi yüklenemezse serbest metin girişi yeterli.
      }
    })();
  }, []);

  function toggleZone(name: string) {
    setZones((prev) =>
      prev.includes(name) ? prev.filter((z) => z !== name) : [...prev, name],
    );
  }

  async function submit() {
    setError(null);
    if (zones.length === 0) {
      setError("En az bir bölge seç.");
      return;
    }
    setSaving(true);
    try {
      await api.applyCourier({ vehicleType, activeZones: zones, documentPaths: [] });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Başvuru gönderilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <SafeAreaView style={styles.centered} edges={["top", "bottom"]}>
        <Text style={styles.doneTitle}>Başvurun alındı</Text>
        <Text style={styles.doneBody}>
          Ekibimiz bilgilerini inceliyor. Onaylandığında iş almaya başlayabilirsin —
          genellikle 1 iş günü sürer.
        </Text>
        <Button
          label="Profile dön"
          onPress={() => router.replace("/(tabs)/profile" as never)}
          style={styles.doneButton}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={() => (step === 1 ? router.back() : setStep(1))}
          style={styles.back}
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Text style={styles.stepLabel}>ADIM {step}/2</Text>
        <Text style={styles.title}>
          {step === 1 ? "Nasıl teslimat yapacaksın?" : "Hangi bölgelerde çalışacaksın?"}
        </Text>

        <View style={styles.progressRow}>
          <View style={[styles.progressBar, styles.progressActive]} />
          <View style={[styles.progressBar, step === 2 && styles.progressActive]} />
        </View>

        {step === 1 ? (
          <View style={styles.grid}>
            {vehicles.map((v) => {
              const selected = vehicleType === v.value;
              return (
                <Pressable
                  key={v.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setVehicleType(v.value)}
                  style={[styles.card, selected && styles.cardSelected]}
                >
                  <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
                    {v.label}
                  </Text>
                  <Text style={[styles.cardHint, selected && styles.cardHintSelected]}>
                    {v.hint}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.zoneBlock}>
            <View style={styles.chipRow}>
              {[...new Set([...available, ...zones])].map((name) => {
                const selected = zones.includes(name);
                return (
                  <Pressable
                    key={name}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggleZone(name)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.addRow}>
              <TextInput
                value={custom}
                onChangeText={setCustom}
                placeholder="Başka bölge ekle…"
                placeholderTextColor={colors.inkFaint}
                style={styles.input}
                accessibilityLabel="Başka bölge ekle"
              />
              <Button
                label="Ekle"
                variant="soft"
                onPress={() => {
                  const name = custom.trim();
                  if (name && !zones.includes(name)) setZones((p) => [...p, name]);
                  setCustom("");
                }}
                style={styles.addButton}
              />
            </View>
            <Text style={styles.privacyNote}>
              Kimlik ve belge doğrulama, güvenli teslimat ağı için gereklidir. Belge
              yükleme adımı yakında ekleniyor; başvurun şimdilik bu bilgilerle incelenir.
            </Text>
          </View>
        )}

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {step === 1 ? (
          <Button label="Devam" variant="dark" onPress={() => setStep(2)} />
        ) : (
          <Button label="Başvuruyu gönder" onPress={submit} loading={saving} />
        )}
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
  stepLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.inkFaint,
  },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.8, color: colors.ink },
  progressRow: { flexDirection: "row", gap: 6 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line },
  progressActive: { backgroundColor: colors.primary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  card: {
    flexGrow: 1,
    flexBasis: "46%",
    borderRadius: radius.card,
    backgroundColor: colors.fillSoft,
    borderWidth: 1,
    borderColor: "#EDF1F5",
    padding: spacing.base,
    gap: 4,
  },
  cardSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  cardTitleSelected: { color: colors.inkInverse },
  cardHint: { fontSize: 12, fontWeight: "600", color: colors.inkFaint },
  cardHintSelected: { color: "rgba(255,255,255,0.6)" },
  zoneBlock: { gap: spacing.md },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: { backgroundColor: colors.navy },
  chipText: { fontSize: 13, fontWeight: "800", color: colors.inkSecondary },
  chipTextSelected: { color: colors.inkInverse },
  addRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  input: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
  },
  addButton: { paddingHorizontal: 20 },
  privacyNote: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkSecondary,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    borderRadius: radius.control,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
    padding: spacing.md,
    borderRadius: radius.control,
  },
  doneTitle: { fontSize: 28, fontWeight: "800", color: colors.ink },
  doneBody: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.inkSecondary,
    textAlign: "center",
  },
  doneButton: { alignSelf: "stretch", marginTop: spacing.lg },
});
