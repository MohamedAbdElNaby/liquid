import { Platform, useColorScheme } from 'react-native';

export type LiquidColorScheme = 'light' | 'dark';

/** `system` follows the device appearance. */
export type LiquidColorSchemeSetting = 'system' | LiquidColorScheme;

export type LiquidColors = {
  /** Primary text and icon color on glass. */
  label: string;
  /** Secondary text, inactive tabs and placeholders. */
  secondaryLabel: string;
  /** Accent color used for selected items and prominent buttons. */
  tint: string;
  /** Color of the "on" state of toggles. */
  success: string;
  /** Selection pill drawn behind the focused tab or segment. */
  selection: string;
  /** Resting pill behind the focused tab of the tab bars. */
  tabSelection: string;
  /** Tint of the bottom tab bar's glass: frosted white in light mode, dark gray in dark mode. */
  tabBarGlass: string;
  /** Glass of the top tab bar's drop, with enough body to show over the light bar. */
  topTabLens: string;
  /** Track of toggles and sliders. */
  track: string;
  /** Fill of knobs and thumbs when they are at rest. */
  thumb: string;
};

const LIGHT: LiquidColors = {
  label: '#000000',
  secondaryLabel: 'rgba(60, 60, 67, 0.6)',
  tint: '#007AFF',
  success: '#34C759',
  selection: 'rgba(0, 0, 0, 0.08)',
  tabSelection: 'rgba(0, 0, 0, 0.06)',
  tabBarGlass: 'rgba(255, 255, 255, 0.18)',
  topTabLens: 'rgba(0, 0, 0, 0.08)',
  track: 'rgba(120, 120, 128, 0.2)',
  thumb: '#FFFFFF',
};

const DARK: LiquidColors = {
  label: '#FFFFFF',
  secondaryLabel: 'rgba(235, 235, 245, 0.6)',
  tint: '#0A84FF',
  success: '#30D158',
  selection: 'rgba(255, 255, 255, 0.16)',
  tabSelection: 'rgba(0, 0, 0, 0.42)',
  tabBarGlass: 'rgba(44, 44, 46, 0.28)',
  topTabLens: 'rgba(255, 255, 255, 0.1)',
  track: 'rgba(120, 120, 128, 0.36)',
  thumb: '#FFFFFF',
};

export function getLiquidColors(scheme: LiquidColorScheme): LiquidColors {
  return scheme === 'dark' ? DARK : LIGHT;
}

/** Resolves a color scheme setting against the current device appearance. */
export function useLiquidColorScheme(
  setting: LiquidColorSchemeSetting = 'system'
): LiquidColorScheme {
  const system = useColorScheme();

  if (setting !== 'system') {
    return setting;
  }

  return system === 'dark' ? 'dark' : 'light';
}

/** Returns the scheme and the matching palette in one call. */
export function useLiquidColors(setting?: LiquidColorSchemeSetting) {
  const scheme = useLiquidColorScheme(setting);

  return { scheme, colors: getLiquidColors(scheme) };
}

/**
 * The wash of the `frost` props (0 to 1) as a glass tint: milky white in
 * light mode, black in dark mode.
 */
export function frostColor(
  frost: number,
  dark: boolean,
  /** The tint's opacity at full frost. */
  max = 0.7
): string {
  const amount = Math.min(Math.max(frost, 0), 1);
  return dark
    ? `rgba(0, 0, 0, ${max * amount})`
    : `rgba(255, 255, 255, ${max * amount})`;
}

/** The tab bars' drop tint for a `lensWash` (0 to 1), or undefined for the default. */
export function lensWashColor(
  wash: number | undefined,
  dark: boolean
): string | undefined {
  if (wash == null || wash <= 0) {
    return undefined;
  }
  const amount = Math.min(wash, 1) * 0.75;
  return dark ? `rgba(0, 0, 0, ${amount})` : `rgba(255, 255, 255, ${amount})`;
}

/** Android tab bars draw their tint at 60%; this makes full frost as milky there. */
const TAB_BAR_FROST_MAX = Platform.OS === 'android' ? 1 : 0.7;

/**
 * The tab bars' glass tint for a `frost` (0 to 1): their usual tint at 0,
 * rising smoothly to milky white (black in dark mode), so a little frost
 * never looks lighter than none.
 */
export function tabBarFrostColor(
  frost: number,
  colors: LiquidColors,
  dark: boolean
): string {
  const amount = Math.min(Math.max(frost, 0), 1);
  if (amount === 0) {
    return colors.tabBarGlass;
  }
  // From the default tint's strength (18% white, 28% dark gray) to the max:
  // white in light mode, black in dark mode.
  const base = dark ? 0.28 : 0.18;
  const alpha = base + (TAB_BAR_FROST_MAX - base) * amount;
  return dark ? `rgba(0, 0, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
}
