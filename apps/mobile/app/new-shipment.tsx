import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type CatalogSize, type CatalogZone } from "@/lib/api";
import { Button } from "@/components/Button";
import { colors, radius, spacing } from "@/theme/tokens";

const sizeHints: Record<string, string> = {
  S: "Zarf, belge veya ayakkabı kutusuna kadar",
  M: "10 kilograma kadar",
  L: "Büyük kutu veya hacimli ürün",
  XL: "Çok büyük / özel taşıma",
};

function defaultWindow() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 2);
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return { start, end };
}

/**
 * Gönderi oluşturma. Fiyat SUNUCUDA hesaplanır — bu ekran fiyat göndermez,
 * yalnızca girdi toplar (CLAUDE.md §5.4).
 */
export default function NewShipmentScreen() {
  const router = useRouter();
  const [zones, setZones] = useState<CatalogZone[]>([]);
  const [sizes, setSizes] = useState<CatalogSize[]>([]);
  const [loading, setLoading] = useState(true);

  const [zoneId, setZoneId] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isExpress, setIsExpress] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; amount: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const catalog = await api.catalog();
        setZones(catalog.zones);
        setSizes(catalog.sizeClasses);
        setZoneId(catalog.zones[0]?.id ?? "");
        setSizeId(catalog.sizeClasses[0]?.id ?? "");
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Katalog yüklenemedi.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function submit() {
    setError(null);
    const digits = phone.replace(/\D/g, "");
    if (pickup.trim().length < 5 || dropoff.trim().length < 5) {
      setError("Alım ve teslim adresi en az 5 karakter olmalı.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Alıcı adı en az 2 karakter olmalı.");
      return;
    }
    if (digits.length < 10) {
      setError("Geçerli bir telefon girin (en az 10 rakam).");
      return;
    }

    setSaving(true);
    try {
      const win = defaultWindow();
      const created = await api.createShipment({
        zoneId,
        sizeClassId: sizeId,
        isExpress,
        pickupAddress: pickup.trim(),
        dropoffAddress: dropoff.trim(),
        recipientName: name.trim(),
        recipientPhone: phone,
        windowStartsAt: win.start.toISOString(),
        windowEndsAt: win.end.toISOString(),
      });
      setResult({
        code: created.shipmentId.slice(0, 8).toUpperCase(),
        amount: created.amountLabel,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gönderi oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <SafeAreaView style={styles.centered} edges={["top", "bottom"]}>
        <Text style={styles.successTitle}>Gönderi hazır</Text>
        <Text style={styles.successCode}>{result.code}</Text>
        <Text style={styles.successAmount}>{result.amount}</Text>
        <Text style={styles.successNote}>
          Fiyat sunucuda hesaplandı ve teklif olarak kaydedildi.
        </Text>
        <Button
          label="Gönderilerime dön"
          onPress={() => router.replace("/shipments")}
          style={styles.successButton}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Nereden nereye?</Text>

          <Field label="Alım adresi">
            <TextInput
              value={pickup}
              onChangeText={setPickup}
              placeholder="Bedrettin Demirel Cad. 24, Lefkoşa"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
              accessibilityLabel="Alım adresi"
            />
          </Field>

          <Field label="Teslim adresi">
            <TextInput
              value={dropoff}
              onChangeText={setDropoff}
              placeholder="Karakum Sitesi B Blok, Girne"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
              accessibilityLabel="Teslim adresi"
            />
          </Field>

          <Field label="Teslim bölgesi">
            <View style={styles.chipRow}>
              {zones.map((z) => (
                <Chip
                  key={z.id}
                  label={`${z.name} ${z.baseFeeLabel}+`}
                  selected={zoneId === z.id}
                  onPress={() => setZoneId(z.id)}
                />
              ))}
            </View>
          </Field>

          <Field label="Paket boyutu">
            <View style={styles.sizeGrid}>
              {sizes.map((s) => {
                const selected = sizeId === s.id;
                return (
                  <Pressable
                    key={s.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setSizeId(s.id)}
                    style={[styles.sizeCard, selected && styles.sizeCardSelected]}
                  >
                    <Text style={[styles.sizeName, selected && styles.sizeNameSelected]}>
                      {s.name}
                    </Text>
                    <Text style={[styles.sizeHint, selected && styles.sizeHintSelected]}>
                      {sizeHints[s.code] ?? `Boyut ${s.code}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          <Field label="Alıcı adı">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ayşe Kaya"
              placeholderTextColor={colors.inkFaint}
              style={styles.input}
              accessibilityLabel="Alıcı adı"
            />
          </Field>

          <Field label="Alıcı telefon">
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="0533 123 45 67"
              placeholderTextColor={colors.inkFaint}
              keyboardType="phone-pad"
              style={styles.input}
              accessibilityLabel="Alıcı telefon"
            />
          </Field>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isExpress }}
            onPress={() => setIsExpress((v) => !v)}
            style={[styles.expressCard, isExpress && styles.expressCardOn]}
          >
            <Text style={styles.expressTitle}>Yolla Ekspres</Text>
            <Text style={styles.expressHint}>
              Öncelikli eşleşme — prim ücreti teklife eklenir
            </Text>
          </Pressable>

          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Button label="Fiyatı gör ve oluştur" onPress={submit} loading={saving} />
          <Text style={styles.footnote}>
            Kesin fiyat sunucuda hesaplanır; bu ekran fiyat göndermez.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceElevated },
  flex: { flex: 1 },
  centered: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: spacing.sm,
  },
  content: { padding: 24, gap: spacing.base, paddingBottom: 48 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "700", color: colors.ink },
  input: {
    minHeight: 52,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
  },
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
  sizeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sizeCard: {
    flexGrow: 1,
    flexBasis: "46%",
    borderRadius: radius.card,
    backgroundColor: colors.fillSoft,
    borderWidth: 1,
    borderColor: "#EDF1F5",
    padding: spacing.base,
    gap: 4,
  },
  sizeCardSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  sizeName: { fontSize: 16, fontWeight: "800", color: colors.ink },
  sizeNameSelected: { color: colors.inkInverse },
  sizeHint: { fontSize: 12, fontWeight: "600", color: colors.inkFaint },
  sizeHintSelected: { color: "rgba(255,255,255,0.6)" },
  expressCard: {
    borderRadius: radius.card,
    backgroundColor: colors.fillSoft,
    padding: spacing.base,
    gap: 2,
  },
  expressCardOn: { backgroundColor: colors.accentSoft },
  expressTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  expressHint: { fontSize: 13, fontWeight: "600", color: colors.inkFaint },
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
  successTitle: { fontSize: 28, fontWeight: "800", color: colors.ink },
  successCode: { fontSize: 14, fontWeight: "700", color: colors.inkFaint },
  successAmount: {
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1.6,
    color: colors.ink,
  },
  successNote: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.inkSecondary,
    textAlign: "center",
  },
  successButton: { alignSelf: "stretch", marginTop: spacing.lg },
});
