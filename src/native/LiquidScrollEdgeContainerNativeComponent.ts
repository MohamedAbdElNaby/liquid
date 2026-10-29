import {
  codegenNativeComponent,
  type ViewProps,
  type CodegenTypes,
} from 'react-native';

export interface NativeProps extends ViewProps {
  /**
   * iOS 26+: extends the system scroll edge effect of the scroll view under
   * this view down behind it, like a navigation bar.
   */
  extendScrollEdge?: CodegenTypes.WithDefault<boolean, true>;
  /** Changes when the screen under it changes, so it finds its scroll view again. */
  screenKey?: string;
}

export default codegenNativeComponent<NativeProps>(
  'RNLiquidScrollEdgeContainer'
);
