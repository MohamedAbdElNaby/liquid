import { memo } from 'react';
import type { ColorValue, ViewProps } from 'react-native';
import { NativeLiquidGlassV2 } from '../NativeLiquidGlass';
import type { LiquidColorSchemeSetting } from '../theme';
import { useInGlassGroupV2 } from './GlassGroupV2';

/** Larger than any view's half side: the native views clamp it to a capsule. */
const CAPSULE = 10000;

export type GlassShapeV2Props = ViewProps & {
  /** `regular` frosts what is behind; `clear` lets more of it through. @default 'regular' */
  variant?: 'regular' | 'clear';
  /**
   * 0 = regular to 1 = clear. Android: continuous (less blur and frost).
   * iOS: the nearer system style. Overrides `variant`.
   */
  clarity?: number;
  /** Android: how strongly the page bends at the rim, 0 to 1. @default 1 */
  refraction?: number;
  /** Android: brightness of the lit rim, 0 to 1. @default 1 */
  shine?: number;
  /** Fills the glass with this colour, like a prominent button. */
  tintColor?: ColorValue;
  /** @default 'rounded' */
  shape?: 'capsule' | 'rounded';
  /** Corner radius for `shape="rounded"`, in points. @default 22 */
  cornerRadius?: number;
  /** Swells while pressed (iOS 26 interactive glass; a small spring on Android). */
  interactive?: boolean;
  /** @default 'system' */
  colorScheme?: LiquidColorSchemeSetting;
  /**
   * `system` follows iOS's Reduce Transparency setting (Android has none, so
   * there it means `off`); `on` draws an opaque fill in the same shape.
   * @default 'system'
   */
  reduceTransparency?: 'system' | 'on' | 'off';
};

/**
 * The v2 glass: one native view with one backdrop. iOS 26 uses the system
 * Liquid Glass as is; Android uses a neutral frost with an iOS-like edge.
 * Inside a GlassGroupV2 it merges with its neighbours.
 */
export const GlassShapeV2 = memo(function GlassShapeV2Impl({
  variant = 'regular',
  tintColor,
  shape = 'rounded',
  cornerRadius = 22,
  interactive = false,
  colorScheme = 'system',
  reduceTransparency = 'system',
  clarity,
  refraction = 1,
  shine = 1,
  ...rest
}: GlassShapeV2Props) {
  const grouped = useInGlassGroupV2();
  return (
    <NativeLiquidGlassV2
      {...rest}
      grouped={grouped}
      glassStyle={
        clarity == null ? variant : clarity >= 0.5 ? 'clear' : 'regular'
      }
      clarity={clarity ?? -1}
      refraction={refraction}
      shine={shine}
      tintColor={tintColor}
      cornerRadius={shape === 'capsule' ? CAPSULE : cornerRadius}
      interactive={interactive}
      colorScheme={colorScheme}
      reduceTransparency={reduceTransparency}
    />
  );
});
