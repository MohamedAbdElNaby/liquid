import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import {
  LiquidBottomTabBar,
  type LiquidBottomTabBarOptions,
} from './LiquidBottomTabBar';
import {
  LiquidTopTabBar,
  type LiquidTopTabBarOptions,
} from './LiquidTopTabBar';

/**
 * Returns a `tabBar` render function for bottom tabs.
 *
 * ```tsx
 * <Tab.Navigator tabBar={createLiquidBottomTabBar({ accessory: <Search /> })}>
 * ```
 */
export function createLiquidBottomTabBar(
  options: LiquidBottomTabBarOptions = {}
) {
  return function TabBar(props: BottomTabBarProps) {
    return <LiquidBottomTabBar {...props} {...options} />;
  };
}

/** Returns a `tabBar` render function for material top tabs. */
export function createLiquidTopTabBar(options: LiquidTopTabBarOptions = {}) {
  return function TabBar(props: MaterialTopTabBarProps) {
    return <LiquidTopTabBar {...props} {...options} />;
  };
}
