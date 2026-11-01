import {
  codegenNativeComponent,
  type ViewProps,
  type CodegenTypes,
} from 'react-native';

/**
 * Android only: draws the grouped v2 glass inside it in one pass, melting
 * neighbours closer than `spacing`. iOS uses RNLiquidGlassContainerView.
 */
export interface NativeProps extends ViewProps {
  /** Distance under which neighbouring glass melts together, in dp. */
  spacing?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  colorScheme?: CodegenTypes.WithDefault<'system' | 'light' | 'dark', 'system'>;
  glassStyle?: CodegenTypes.WithDefault<'regular' | 'clear', 'regular'>;
  reduceTransparency?: CodegenTypes.WithDefault<
    'system' | 'on' | 'off',
    'system'
  >;
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

export default codegenNativeComponent<NativeProps>('RNLiquidGlassGroupV2');
