import {
  codegenNativeComponent,
  type ColorValue,
  type ViewProps,
  type CodegenTypes,
} from 'react-native';

type ValueEvent = Readonly<{ value: CodegenTypes.Float }>;

export interface NativeProps extends ViewProps {
  value?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  minimumValue?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  maximumValue?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
  step?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  disabled?: CodegenTypes.WithDefault<boolean, false>;
  minimumTrackTintColor?: ColorValue;
  colorScheme?: CodegenTypes.WithDefault<'system' | 'light' | 'dark', 'system'>;
  onValueChange?: CodegenTypes.DirectEventHandler<ValueEvent>;
  onSlidingStart?: CodegenTypes.DirectEventHandler<ValueEvent>;
  onSlidingComplete?: CodegenTypes.DirectEventHandler<ValueEvent>;
}

export default codegenNativeComponent<NativeProps>('RNLiquidSlider');
