import {
  codegenNativeComponent,
  type ViewProps,
  type CodegenTypes,
} from 'react-native';

export interface NativeProps extends ViewProps {
  /**
   * iOS 26+: hides the system's top scroll edge effect (the blur under the
   * status bar) on every scroll view while this view is mounted.
   */
  hideTopEdge?: CodegenTypes.WithDefault<boolean, false>;
}

export default codegenNativeComponent<NativeProps>('RNLiquidScrollEdge');
