import {
  codegenNativeComponent,
  type ColorValue,
  type ViewProps,
  type CodegenTypes,
} from 'react-native';

export interface NativeProps extends ViewProps {
  /** iOS: blur radius at full strength, in points. */
  maxBlurRadius?: CodegenTypes.WithDefault<CodegenTypes.Float, 20>;
  /** iOS: a colour over the blur that fades out with it, e.g. a white frost. */
  blurTintColor?: ColorValue;
  /** iOS: how many points at the bottom fade out; 0 fades over the whole height. */
  fadeHeight?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  /** iOS: how the blur and tint fade, in a straight line or along an S-curve. */
  fadeCurve?: CodegenTypes.WithDefault<'linear' | 'ease', 'ease'>;
}

export default codegenNativeComponent<NativeProps>('RNLiquidProgressiveBlur');
