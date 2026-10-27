import { StyleSheet, type ColorValue, type ViewProps } from 'react-native';
import {
  NativeLiquidGlassContainerView,
  NativeLiquidGlassView,
} from './NativeLiquidGlass';
import type { LiquidColorSchemeSetting } from './theme';

export type LiquidGlassStyle = 'regular' | 'clear';

export type LiquidGlassViewProps = ViewProps & {
  /**
   * `regular` is the standard material. `clear` is more transparent and works
   * best over rich media.
   * @default 'regular'
   */
  glassStyle?: LiquidGlassStyle;
  /** Tints the glass, like `.glassProminent` buttons. */
  tintColor?: ColorValue;
  /**
   * Reacts to touches: native interactive glass on iOS 26+, a press highlight
   * and stronger refraction on Android.
   * @default false
   */
  interactive?: boolean;
  /**
   * Corner radius of the glass shape. Defaults to `borderRadius` from `style`.
   * Values larger than half of the shortest side produce a capsule.
   */
  cornerRadius?: number;
  /**
   * Animates changes of size and position as a liquid morph instead of
   * jumping, e.g. a button that turns into a wider capsule. Inside a
   * `LiquidGlassContainer`, neighbouring glass merges while morphing (iOS 26).
   * @default false
   */
  morph?: boolean;
  /**
   * iOS: fades the glass out over this many points at its bottom edge, like
   * a bar that melts into the content under it.
   * @default 0
   */
  fadeBottom?: number;
  /**
   * Forces the light or dark material.
   * @default 'system'
   */
  colorScheme?: LiquidColorSchemeSetting;
  /**
   * Android: blur radius of the backdrop in dp.
   * @default 8 for `regular`, 2 for `clear`
   */
  blurRadius?: number;
  /** Android 13+: height of the refracting edge in dp. @default 12 */
  refractionHeight?: number;
  /** Android 13+: strength of the refraction in dp. @default 24 */
  refractionAmount?: number;
  /** Android 13+: splits colors at the refracting edge. @default false */
  chromaticAberration?: boolean;
  /** Android 13+: adds depth to the refraction. @default false */
  depthEffect?: boolean;
  /** Android: draws the specular rim highlight. @default true */
  highlight?: boolean;
  /** Android: draws a soft drop shadow. @default true */
  shadow?: boolean;
};

/**
 * A view whose background is the Liquid Glass material. Children are drawn on
 * top of the glass.
 */
export function LiquidGlassView({
  glassStyle = 'regular',
  tintColor,
  interactive = false,
  cornerRadius,
  colorScheme = 'system',
  blurRadius = glassStyle === 'clear' ? 2 : 8,
  style,
  ...rest
}: LiquidGlassViewProps) {
  const borderRadius = StyleSheet.flatten(style)?.borderRadius;
  const radius =
    cornerRadius ?? (typeof borderRadius === 'number' ? borderRadius : 0);

  return (
    <NativeLiquidGlassView
      {...rest}
      style={style}
      glassStyle={glassStyle}
      glassTintColor={tintColor}
      interactive={interactive}
      cornerRadius={radius}
      colorScheme={colorScheme}
      blurRadius={blurRadius}
    />
  );
}

export type LiquidGlassContainerProps = ViewProps & {
  /**
   * Distance at which glass children start blending into each other (iOS 26+).
   * @default 0
   */
  spacing?: number;
};

/**
 * Groups `LiquidGlassView`s so they render as one material and morph into
 * each other on iOS 26+. Behaves like a regular `View` elsewhere.
 */
export function LiquidGlassContainer(props: LiquidGlassContainerProps) {
  return <NativeLiquidGlassContainerView {...props} />;
}
