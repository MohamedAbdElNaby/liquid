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
  /** Track color when on. */
  onTintColor?: ColorValue;
  /** Track color when off. */
  offTintColor?: ColorValue;
  /** Color of the resting thumb. */
  thumbTintColor?: ColorValue;
  /** Tints the glass lens the thumb turns into while pressed. */
  lensTintColor?: ColorValue;
  colorScheme?: CodegenTypes.WithDefault<'system' | 'light' | 'dark', 'system'>;
  onValueChange?: CodegenTypes.DirectEventHandler<ValueChangeEvent>;
}

export default codegenNativeComponent<NativeProps>('RNLiquidSwitch');
