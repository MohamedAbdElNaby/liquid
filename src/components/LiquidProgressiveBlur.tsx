import {
  Platform,
  UIManager,
  type ColorValue,
  type ViewProps,
} from 'react-native';
import { LiquidGlassView } from '../LiquidGlassView';
import { NativeLiquidProgressiveBlur } from '../NativeLiquidGlass';
import type { LiquidColorSchemeSetting } from '../theme';

/** A fade longer than any view: the glass fades over its whole height. */
const WHOLE_HEIGHT = 100000;

let nativeBlur: boolean | undefined;

/**
 * Whether the app binary has the native view. An over-the-air JS update can
 * reach a binary built before it, which would draw "Unimplemented component"
 * in its place: such a binary gets the glass fallback instead.
 */
function hasNativeBlur() {
  if (nativeBlur === undefined) {
    nativeBlur =
      Platform.OS === 'ios' &&
      UIManager.hasViewManagerConfig('RNLiquidProgressiveBlur');
  }
  return nativeBlur;
}

export type LiquidProgressiveBlurProps = ViewProps & {
  /** iOS: blur radius where the blur is full, in points. @default 20 */
  maxBlur?: number;
  /** A colour over the blur that fades out with it, e.g. `rgba(255, 255, 255, 0.8)`. */
  tintColor?: ColorValue;
  /** How many points at the bottom fade out. @default the whole height */
  fadeHeight?: number;
  /** `'ease'` fades along an S-curve with no visible start or end. @default 'ease' */
  fadeCurve?: 'linear' | 'ease';
  /** Android: blur of the glass in dp. @default 8 */
  blurRadius?: number;
  /** Android: pins the light or dark material. */
  colorScheme?: LiquidColorSchemeSetting;
};

/**
 * A blur that is strongest at the top and weakens down the view, with a tint
 * fading out with it: the iOS 26 scroll edge behind a bar (Photos, Telegram).
 *
 * iOS: a real progressive blur (Core Animation's variable blur, falling back
 * to an even blur that fades out). Android, and iOS binaries built before
 * this view: plain glass (no lens, rim or shadow) fading along the same curve.
 */
export function LiquidProgressiveBlur({
  maxBlur = 20,
  tintColor,
  fadeHeight,
  fadeCurve = 'ease',
  blurRadius = 8,
  colorScheme,
  pointerEvents = 'none',
  ...rest
}: LiquidProgressiveBlurProps) {
  if (hasNativeBlur()) {
    return (
      <NativeLiquidProgressiveBlur
        {...rest}
        pointerEvents={pointerEvents}
        maxBlurRadius={maxBlur}
        blurTintColor={tintColor}
        fadeHeight={fadeHeight ?? 0}
        fadeCurve={fadeCurve}
      />
    );
  }
  return (
    <LiquidGlassView
      {...rest}
      pointerEvents={pointerEvents}
      glassStyle="regular"
      colorScheme={colorScheme}
      tintColor={tintColor}
      blurRadius={blurRadius}
      fadeBottom={fadeHeight ?? WHOLE_HEIGHT}
      fadeCurve={fadeCurve}
      highlight={false}
      shadow={false}
      refractionHeight={0}
      refractionAmount={0}
    />
  );
}
