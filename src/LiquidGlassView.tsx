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
   * How `fadeBottom` fades: `'linear'`, or `'ease'` along an S-curve
   * that melts into the content with no visible start or end.
   * @default 'linear'
   */
  fadeCurve?: 'linear' | 'ease';
  /**
   * A specular rim along the edge, brightest on the top-left and bottom-right
   * curves like iOS 26 glass (Android: its angled highlight, in this colour).
   */
  rimColor?: ColorValue;
  /** Width of the rim in points. @default 1 */
  rimWidth?: number;
  /**
   * iOS: how bright the rim stays along the sides, 0 to 1 (the curves are
   * always brightest). @default 0.35
   */
  rimSideOpacity?: number;
  /**
   * The rim's colour on the side away from the light (the bottom-right),
   * blending from the highlight. A faint dark colour, such as
   * `rgba(0, 0, 0, 0.14)`, makes the highlight read as a reflection on light
   * backgrounds, where a white rim alone disappears. Off when unset.
   */
  rimShadeColor?: ColorValue;
  /**
   * A hairline all round the outside of the glass, under the rim, e.g.
   * `rgba(0, 0, 0, 0.12)`. The rim's light then shines against an edge, so
   * it reads as a glint on white pages. Off when unset.
   */
  rimEdgeColor?: ColorValue;
  /**
   * Where the rim shines: `'diagonal'` on the top-left and bottom-right
   * curves, `'vertical'` along the top and bottom edges, fading towards the
   * left and right sides like the iOS search field; with `rimShadeColor`
   * the sides turn to that colour, a shiny white-to-grey border.
   * @default 'diagonal'
   */
  rimGradient?: 'diagonal' | 'vertical';
  /**
   * iOS: a soft white reflection across the top of the glass, like light
   * catching it, 0 (off) to 1. @default 0
   */
  sheenOpacity?: number;
  /**
   * The edge of iOS 26 glass in light mode (the Messages call buttons): a
   * hairline, light grey along the top and darker down the sides, a white
   * glow just inside the top edge and a white line along the bottom. Shines
   * without tinting the glass. iOS and Android. @default false
   */
  specularEdge?: boolean;
  /** Strength of the specular edge's white glow inside the top edge, 0 to 1. @default 0.95 */
  specularTopOpacity?: number;
  /** Strength of the specular edge's white line along the bottom, 0 to 1. @default 0.95 */
  specularBottomOpacity?: number;
  /** Strength of the specular edge's grey hairline, 0 to 1. @default 1 */
  specularHairlineOpacity?: number;
  /** How far down the specular edge's top glow reaches, as a fraction of the height. @default 0.16 */
  specularGlowHeight?: number;
  /**
   * How far up the specular edge's bottom shine reaches, as a fraction of
   * the height: `0.07` is a white line (the hairline fades out under it);
   * taller is a glow, and the bottom edge then mirrors the top one, glow and
   * hairline (e.g. the same value as `specularGlowHeight`). @default 0.07
   */
  specularBottomHeight?: number;
  /**
   * Light catching the top-left and bottom-right corners, like a lens:
   * a soft bloom inside the glass and a brighter glint on the edge there,
   * 0 (off) to 1. `0.1` is a subtle reflection. @default 0
   */
  cornerReflection?: number;
  /**
   * Blurs the page behind the glass by this many points (Android: dp), inside its
   * shape. With `glassStyle: 'clear'` the glass then shows the page softly
   * blurred and bent at the edges, between clear (sharp) and regular
   * (frosted), e.g. `4`. 0 keeps the material's own blur. @default 0
   */
  backdropBlur?: number;
  /**
   * Forces the light or dark material.
   * @default 'system'
   */
  colorScheme?: LiquidColorSchemeSetting;
  /**
   * Android: blur radius of the backdrop in dp.
   * @default 20 for `regular` (a frost like iOS regular glass), 2 for `clear`
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
  blurRadius = glassStyle === 'clear' ? 2 : 20,
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
