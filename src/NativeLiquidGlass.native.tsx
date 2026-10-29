import { type ComponentType } from 'react';
import { useColorScheme } from 'react-native';
import LiquidGlassViewNativeComponent from './native/LiquidGlassViewNativeComponent';
import LiquidSwitchNativeComponent from './native/LiquidSwitchNativeComponent';
import LiquidSliderNativeComponent from './native/LiquidSliderNativeComponent';
import LiquidTabBarNativeComponent from './native/LiquidTabBarNativeComponent';
import LiquidMenuNativeComponent from './native/LiquidMenuNativeComponent';
import LiquidSearchNativeComponent from './native/LiquidSearchNativeComponent';

export { default as NativeLiquidGlassContainerView } from './native/LiquidGlassContainerViewNativeComponent';
export { default as NativeLiquidScrollEdge } from './native/LiquidScrollEdgeNativeComponent';
export { default as NativeLiquidScrollEdgeContainer } from './native/LiquidScrollEdgeContainerNativeComponent';

type SchemeProps = { colorScheme?: 'system' | 'light' | 'dark' };

/**
 * Passes `'system'` to the native view as the current `'light'` or `'dark'`.
 * React Native sees app-level overrides (`Appearance.setColorScheme`) that
 * Android's Compose views are never told about, so resolving it here keeps
 * every component in step with the app's theme on both platforms.
 */
function withResolvedColorScheme<P extends SchemeProps>(
  Native: ComponentType<P>
): ComponentType<P> {
  function ResolvedColorScheme(props: P) {
    const system = useColorScheme();
    const scheme =
      props.colorScheme === 'light' || props.colorScheme === 'dark'
        ? props.colorScheme
        : system === 'dark'
          ? 'dark'
          : 'light';

    // `ref` is a regular prop in React 19, so it reaches the native view.
    return <Native {...props} colorScheme={scheme} />;
  }

  return ResolvedColorScheme;
}

export const NativeLiquidGlassView = withResolvedColorScheme(
  LiquidGlassViewNativeComponent
);
export const NativeLiquidSwitch = withResolvedColorScheme(
  LiquidSwitchNativeComponent
);
export const NativeLiquidSlider = withResolvedColorScheme(
  LiquidSliderNativeComponent
);
export const NativeLiquidTabBar = withResolvedColorScheme(
  LiquidTabBarNativeComponent
);
export const NativeLiquidMenu = withResolvedColorScheme(
  LiquidMenuNativeComponent
);
export const NativeLiquidSearch = withResolvedColorScheme(
  LiquidSearchNativeComponent
);
