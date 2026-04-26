// firstmeal Design System — Stitch x Blinkit Synergy
// Palette: Gold #F8CB46 | Bronze #897541 | Cyan #64E0FF
export const Colors = {
  // --- Core Palette ---
  primary:      '#F8CB46', // Vibrant Gold
  primaryFg:    '#1A1200', // Dark on Gold
  secondary:    '#897541', // Muted Bronze (Brutalist borders)
  tertiary:     '#64E0FF', // Electric Cyan (Speed Streak)
  accent:       '#F8CB46',

  // --- Backgrounds ---
  background:   '#FFFDF5',
  surface:      '#FFFFFF',
  surfaceLight: '#FFF8E7',

  // --- Text ---
  textPrimary:   '#1A1200',
  textSecondary: '#6B5E35',

  // --- Utility ---
  border:   '#E8D8A0',
  error:    '#FF3B30',
  success:  '#34C759',

  // --- Admin ---
  adminBg:  '#1A1200',
  adminFg:  '#F8CB46',
};

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, screen: 20,
};

export const FontSize = {
  h1: 40, h2: 32, h3: 24, body: 16, caption: 12, sm: 14,
};

// Brutalist offset: apply borderBottomWidth: 4, borderRightWidth: 4 using Colors.secondary
export const Brutalist = {
  borderBottomWidth: 4,
  borderRightWidth: 4,
  borderColor: '#897541',
};

export const Radius = { sm: 4, md: 8, lg: 16, full: 100 };
