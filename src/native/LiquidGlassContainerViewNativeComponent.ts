import {
  codegenNativeComponent,
  type ViewProps,
  type CodegenTypes,
} from 'react-native';

export interface NativeProps extends ViewProps {
  /**
   * Distance at which glass children start to merge into each other (iOS 26+).
   */
  spacing?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
}

export default codegenNativeComponent<NativeProps>(
  'RNLiquidGlassContainerView'
);
