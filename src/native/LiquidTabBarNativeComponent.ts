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
  /** How much the drop swells while pressed: 0 none, 1 iOS 26, 2 twice as much. */
  lensScale?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
  /** How much the tab under the drop is magnified: 0 none, 1 default. */
  lensMagnification?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
  /** Android: how strongly the drop's rim bends the tabs: 0 none, 1 default. */
  lensRefraction?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
  /** Android: the drop's milky fill: 0 crystal clear, 1 default. */
  lensFrost?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
  /** Android: frosts the resting selection pill, 0 (flat) to 1. */
  selectionBlur?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  /**
   * Scroll position of a pager in tabs (fractional while swiping). The pill
   * follows it while the bar is not touched. Negative values are ignored.
   */
  pagerPosition?: CodegenTypes.WithDefault<CodegenTypes.Float, -1>;
  onTabSelect?: CodegenTypes.DirectEventHandler<TabEvent>;
  onTabLongPress?: CodegenTypes.DirectEventHandler<TabEvent>;
}

export default codegenNativeComponent<NativeProps>('RNLiquidTabBar');
