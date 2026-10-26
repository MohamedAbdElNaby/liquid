import {
  codegenNativeComponent,
  type ColorValue,
  type ViewProps,
  type CodegenTypes,
} from 'react-native';

type TabEvent = Readonly<{ index: CodegenTypes.Int32 }>;

/**
 * Native tab bar. Each React child is one tab item. The bar draws the glass,
 * the selection pill and the drag lens, handles touches and animates the
 * items natively.
 */
export interface NativeProps extends ViewProps {
  selectedIndex?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  glassStyle?: CodegenTypes.WithDefault<'regular' | 'clear', 'regular'>;
  glassTintColor?: ColorValue;
  selectionColor?: ColorValue;
  /** Color of the tab content seen through the lens, like the focused tab. */
  focusedTintColor?: ColorValue;
  /** Tints the glass of the lens. Defaults to a light fill. */
  lensTintColor?: ColorValue;
  /** Frosts the content under the bar, from 0 (none) to 1. Most visible with clear glass. */
  backdropBlur?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  colorScheme?: CodegenTypes.WithDefault<'system' | 'light' | 'dark', 'system'>;
  lensEnabled?: CodegenTypes.WithDefault<boolean, true>;
  /**
   * Scroll position of a pager in tabs (fractional while swiping). The pill
   * follows it while the bar is not touched. Negative values are ignored.
   */
  pagerPosition?: CodegenTypes.WithDefault<CodegenTypes.Float, -1>;
  onTabSelect?: CodegenTypes.DirectEventHandler<TabEvent>;
  onTabLongPress?: CodegenTypes.DirectEventHandler<TabEvent>;
}

export default codegenNativeComponent<NativeProps>('RNLiquidTabBar');
