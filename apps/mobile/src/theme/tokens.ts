/**
 * YOLLA tasarım token'ları — web ile BİREBİR aynı değerler.
 *
 * Tailwind CSS değişkenleri React Native'de çalışmadığı için değerler burada
 * tekrar tanımlanır. Değişiklik olursa iki taraf birlikte güncellenmeli:
 * kaynak referans `apps/web/src/app/globals.css` @theme bloğu.
 */

export const colors = {
  primary: "#0057FF",
  primaryDeep: "#0033CC",
  primarySoft: "#E8EFFF",
  accent: "#FF8A00",
  accentSoft: "#FFF4E6",
  navy: "#0B1220",

  ink: "#0F172A",
  inkSecondary: "#64748B",
  inkFaint: "#94A3B8",
  inkInverse: "#FFFFFF",

  surface: "#F7F9FC",
  surfaceElevated: "#FFFFFF",
  fill: "#F1F5F9",
  fillSoft: "#F8FAFC",
  border: "#E2E8F0",
  line: "#F1F5F9",

  success: "#22C55E",
  successDeep: "#15803D",
  successSoft: "#E9F9EF",
  warning: "#F59E0B",
  warningDeep: "#B45309",
  warningSoft: "#FFF4E6",
  danger: "#E11D48",
  dangerSoft: "#FDF2F5",
  info: "#0284C7",
  infoSoft: "#E3F2FD",
} as const;

/** 8'lik grid (CLAUDE.md tasarım kuralı). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 64,
} as const;

export const radius = {
  control: 16,
  card: 20,
  cardLg: 24,
  sheet: 32,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 46, fontWeight: "800", letterSpacing: -1.8, lineHeight: 49 },
  title: { fontSize: 34, fontWeight: "800", letterSpacing: -1.2, lineHeight: 39 },
  heading: { fontSize: 24, fontWeight: "800", letterSpacing: -0.6 },
  body: { fontSize: 16, fontWeight: "600" },
  bodySmall: { fontSize: 14, fontWeight: "600" },
  caption: { fontSize: 12, fontWeight: "700" },
} as const;

/** Minimum dokunma hedefi — erişilebilirlik şartı. */
export const TOUCH_TARGET = 44;
/** Birincil buton yüksekliği (web ile aynı). */
export const PRIMARY_BUTTON_HEIGHT = 56;
