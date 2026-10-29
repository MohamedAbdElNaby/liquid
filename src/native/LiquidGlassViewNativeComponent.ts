import {
  codegenNativeComponent,
  type ColorValue,
  type ViewProps,
  type CodegenTypes,
} from 'react-native';

export interface NativeProps extends ViewProps {
  /**
   * `regular` is the standard glass material, `clear` is more transparent
   * and best suited for media-rich backgrounds.
   */
  glassStyle?: CodegenTypes.WithDefault<'regular' | 'clear', 'regular'>;
  /** Tints the glass material. */
  glassTintColor?: ColorValue;
  /** Reacts to touches with the native interactive glass behavior (iOS 26+). */
  interactive?: CodegenTypes.WithDefault<boolean, false>;
  /** Corner radius of the glass shape. Clamped to half of the smallest side. */
  cornerRadius?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  /** Animates size and position changes as a liquid morph. */
  morph?: CodegenTypes.WithDefault<boolean, false>;
  /** iOS: fades the glass out over this many points at its bottom edge. */
  fadeBottom?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  /** Forces the light or dark appearance of the material. */
  colorScheme?: CodegenTypes.WithDefault<'system' | 'light' | 'dark', 'system'>;
  /**
   * A specular rim along the edge: brightest on the top-left and bottom-right
   * curves, fading along the sides, like iOS 26 glass. Off when unset.
   */
  rimColor?: ColorValue;
  /** Width of the rim in points. */
  rimWidth?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
  /** iOS: how bright the rim stays along the sides (0 = gone, 1 = even all round). */
  rimSideOpacity?: CodegenTypes.WithDefault<CodegenTypes.Float, 0.35>;
  /** iOS: a soft white reflection across the top of the glass, 0 (off) to 1. */
  sheenOpacity?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;

  // Android only (AndroidLiquidGlass by Kyant0)
  blurRadius?: CodegenTypes.WithDefault<CodegenTypes.Float, 3>;
  refractionHeight?: CodegenTypes.WithDefault<CodegenTypes.Float, 12>;
  refractionAmount?: CodegenTypes.WithDefault<CodegenTypes.Float, 24>;
  chromaticAberration?: CodegenTypes.WithDefault<boolean, false>;
  depthEffect?: CodegenTypes.WithDefault<boolean, false>;
  highlight?: CodegenTypes.WithDefault<boolean, true>;
  shadow?: CodegenTypes.WithDefault<boolean, true>;
}

export default codegenNativeComponent<NativeProps>('RNLiquidGlassView');
