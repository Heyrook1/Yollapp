import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from "react-native";
import { PRIMARY_BUTTON_HEIGHT, colors, radius } from "@/theme/tokens";

type Variant = "primary" | "dark" | "secondary" | "soft";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

/**
 * Birincil aksiyon butonu. Web'deki Button ile aynı hiyerarşi kuralı:
 * ekran başına TEK mavi birincil aksiyon; ikincil aksiyonlar navy/soft.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} />
      ) : (
        <Text style={[styles.label, { color: textColor[variant] }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const textColor: Record<Variant, string> = {
  primary: colors.inkInverse,
  dark: colors.inkInverse,
  secondary: colors.inkInverse,
  soft: colors.ink,
};

const variantStyles: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  dark: { backgroundColor: colors.navy },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  soft: { backgroundColor: colors.fill },
};

const styles = StyleSheet.create({
  base: {
    minHeight: PRIMARY_BUTTON_HEIGHT,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  pressed: { opacity: 0.85, transform: [{ translateY: 1 }] },
  disabled: { opacity: 0.6 },
});
