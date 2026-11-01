import {
  codegenNativeComponent,
  type ColorValue,
  type ViewProps,
  type CodegenTypes,
} from 'react-native';

export interface NativeProps extends ViewProps {
  /** `regular` frosts what is behind; `clear` lets more of it through. */
  glassStyle?: CodegenTypes.WithDefault<'regular' | 'clear', 'regular'>;
  /** Fills the glass with this colour (a prominent button). */
  tintColor?: ColorValue;
  /** Corner radius in points; values over half the shortest side make a capsule. */
  cornerRadius?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  /** Forces the light or dark material. */
  colorScheme?: CodegenTypes.WithDefault<'system' | 'light' | 'dark', 'system'>;
  /** Swells and brightens while pressed. */
  interactive?: CodegenTypes.WithDefault<boolean, false>;
  /**
   * `system` follows iOS's Reduce Transparency setting (Android has none, so
   * it means `off` there); `on` always draws an opaque fill instead of glass.
   */
  reduceTransparency?: CodegenTypes.WithDefault<
    'system' | 'on' | 'off',
    'system'
  >;
  /**
   * Android: drawn by the enclosing GlassGroupV2 (with its neighbours) instead
   * of by this view. iOS groups glass natively and ignores it.
   */
  grouped?: CodegenTypes.WithDefault<boolean, false>;
  /**
   * Android: 0 = regular to 1 = clear, continuously (less blur and frost).
   * Below 0, `glassStyle` decides. iOS picks the nearer system style.
   */
  clarity?: CodegenTypes.WithDefault<CodegenTypes.Float, -1>;
  /** Android: how strongly the page bends at the rim, 0 to 1. iOS: system. */
  refraction?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
  /** Android: brightness of the lit rim, 0 to 1. iOS: system. */
  shine?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
}

export default codegenNativeComponent<NativeProps>('RNLiquidGlassV2');
