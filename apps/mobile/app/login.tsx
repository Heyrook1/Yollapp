import { useState } from "react";
import { useRouter } from "expo-router";
import {
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
import { Button } from "@/components/Button";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { colors, radius, spacing } from "@/theme/tokens";

/**
 * Giriş ekranı — GERÇEK Supabase backend'i kullanır (e-posta + şifre).
 *
 * Telefon + OTP sağlayıcısı yapılandırılmadığı için sahte OTP akışı YAZILMADI
 * (bkz. docs/EXTERNAL-DEPENDENCIES.md). Web ile aynı kimlik doğrulama yolu.
 */
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const configured = isSupabaseConfigured();

  async function submit() {
    setError(null);
    setPending(true);
    try {
      const { error: authError } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        // Hesap sayımını önlemek için genel mesaj.
        setError("Giriş başarısız. E-posta veya şifreyi kontrol edin.");
        return;
      }
      router.replace("/home");
    } catch (e) {
      setError(
        e instanceof Error && e.message.includes("yapılandırılmadı")
          ? e.message
          : "Bağlantı kurulamadı. Lütfen tekrar deneyin.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Geri"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </Pressable>

          <View style={styles.headingBlock}>
            <Text style={styles.heading}>Tekrar{"\n"}hoş geldin</Text>
            <Text style={styles.subtitle}>
              Hesabına giriş yap, kaldığın yerden devam et.
            </Text>
          </View>

          {!configured ? (
            <Text style={styles.warning}>
              Supabase yapılandırılmadı. apps/mobile/.env dosyasını oluşturun.
            </Text>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@eposta.com"
              placeholderTextColor={colors.inkFaint}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              editable={!pending}
              style={styles.input}
              accessibilityLabel="E-posta"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Şifre</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.inkFaint}
              secureTextEntry
              autoCapitalize="none"
              editable={!pending}
              style={styles.input}
              accessibilityLabel="Şifre"
            />
          </View>

          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Button
            label="Giriş yap"
            onPress={submit}
            loading={pending}
            disabled={!configured || email.length === 0 || password.length === 0}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceElevated },
  flex: { flex: 1 },
  content: { padding: 28, gap: spacing.lg },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 20, color: colors.ink },
  headingBlock: { gap: spacing.sm },
  heading: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1.2,
    lineHeight: 39,
    color: colors.ink,
  },
  subtitle: { fontSize: 15, fontWeight: "600", color: colors.inkSecondary },
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
    backgroundColor: colors.surfaceElevated,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
    padding: spacing.md,
    borderRadius: radius.control,
  },
  warning: {
    backgroundColor: colors.warningSoft,
    color: colors.warningDeep,
    fontSize: 14,
    fontWeight: "700",
    padding: spacing.md,
    borderRadius: radius.control,
  },
});
