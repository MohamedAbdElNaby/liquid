import {
  codegenNativeComponent,
  type ColorValue,
  type ViewProps,
  type CodegenTypes,
} from 'react-native';

type ValueChangeEvent = Readonly<{ value: boolean }>;

export interface NativeProps extends ViewProps {
  value?: CodegenTypes.WithDefault<boolean, false>;
  disabled?: CodegenTypes.WithDefault<boolean, false>;
  onTintColor?: ColorValue;
  colorScheme?: CodegenTypes.WithDefault<'system' | 'light' | 'dark', 'system'>;
  onValueChange?: CodegenTypes.DirectEventHandler<ValueChangeEvent>;
}

export default codegenNativeComponent<NativeProps>('RNLiquidSwitch');
