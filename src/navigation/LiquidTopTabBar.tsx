import { memo, useMemo, useRef } from 'react';
import {
  Animated,
  I18nManager,
  Platform,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type {
  MaterialTopTabBarProps,
  MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';
import type { LiquidGlassStyle } from '../LiquidGlassView';
import { NativeLiquidTabBar } from '../NativeLiquidGlass';
import { useLiquidColors, type LiquidColorSchemeSetting } from '../theme';

// Lets the pager's Animated position drive the native `pagerPosition` prop
// without re-rendering React on every frame.
const AnimatedLiquidTabBar =
  Animated.createAnimatedComponent(NativeLiquidTabBar);

/** Height of the floating top tab bar with its default size and margins. */
export const LIQUID_TOP_TAB_BAR_HEIGHT = 60;

export type LiquidTopTabBarOptions = {
  /** @default 'clear' */
  glassStyle?: LiquidGlassStyle;
  /** Tints the glass of the bar. Defaults to the same frost as the bottom tab bar. */
  glassTintColor?: ColorValue;
  /** Frosts the content under the bar, from 0 to 1. @default 0.8 */
  blur?: number;
  /** @default 'system' */
  colorScheme?: LiquidColorSchemeSetting;
  /** Overrides `tabBarActiveTintColor` from the screen options. */
  activeTintColor?: string;
  /** Overrides `tabBarInactiveTintColor` from the screen options. */
  inactiveTintColor?: string;
  /** Color of the pill behind the focused tab. */
  selectionColor?: ColorValue;
  /** Tints the glass of the lens lifted while pressing or dragging. */
  lensTintColor?: ColorValue;
  /**
   * Lifts a glass lens out of the selection pill while pressing, like the
   * bottom tab bar. @default true
   */
  lens?: boolean;
  /** Height of the glass capsule. @default 44 */
  height?: number;
  /**
   * Floats the bar over the pages so content scrolls under the glass, like
   * the bottom tab bar. Pad scrollable content with
   * `LIQUID_TOP_TAB_BAR_HEIGHT`.
   * @default true
   */
  floating?: boolean;
  /** Style of the glass capsule. */
  style?: StyleProp<ViewStyle>;
  /** Style of the view around the capsule (margins). */
  containerStyle?: StyleProp<ViewStyle>;
};

export type LiquidTopTabBarProps = MaterialTopTabBarProps &
  LiquidTopTabBarOptions;

/**
 * A Liquid Glass tab bar for `@react-navigation/material-top-tabs`, with the
 * same native animation as `LiquidBottomTabBar`: press or drag to lift a glass
 * lens that magnifies and tints the tabs under it. While swiping pages, the
 * selection pill follows the pager position.
 *
 * ```tsx
 * <TopTab.Navigator tabBar={(props) => <LiquidTopTabBar {...props} />}>
 * ```
 */
// react-native-pager-view on iOS measures its position from the left edge in
// right-to-left layout.
const MIRRORED_PAGER_POSITION = Platform.OS === 'ios' && I18nManager.isRTL;

export function LiquidTopTabBar({
  state,
  descriptors,
  navigation,
  position: pagerPosition,
  glassStyle = 'clear',
  glassTintColor,
  blur = 0.8,
  colorScheme = 'system',
  activeTintColor,
  inactiveTintColor,
  selectionColor,
  lensTintColor,
  lens = true,
  height = 44,
  floating = true,
  style,
  containerStyle,
}: LiquidTopTabBarProps) {
  const { colors } = useLiquidColors(colorScheme);
  // In right-to-left layout the iOS pager reports its position from the
  // left edge, so the first page (on the right) reads as the last one.
  const position = useMemo(
    () =>
      MIRRORED_PAGER_POSITION && state.routes.length > 1
        ? pagerPosition.interpolate({
            inputRange: [0, state.routes.length - 1],
            outputRange: [state.routes.length - 1, 0],
            extrapolate: 'extend',
          })
        : pagerPosition,
    [pagerPosition, state.routes.length]
  );

  // Native events arrive asynchronously; read the latest navigation state.
  const latest = useRef({ state, navigation });
  latest.current = { state, navigation };

  const selectTab = (index: number) => {
    const { state: current, navigation: nav } = latest.current;
    const route = current.routes[index];
    if (!route) {
      return;
    }
    const event = nav.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (index !== current.index && !event.defaultPrevented) {
      nav.navigate(route.name, route.params);
    }
  };

  const longPressTab = (index: number) => {
    const route = latest.current.state.routes[index];
    if (route) {
      latest.current.navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    }
  };

  const focusedOptions = descriptors[state.routes[state.index]!.key]!.options;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        floating ? styles.floating : null,
        containerStyle,
      ]}
    >
      <AnimatedLiquidTabBar
        accessibilityRole="tablist"
        selectedIndex={state.index}
        pagerPosition={position}
        glassStyle={glassStyle}
        // Same frosted bar and soft pill as the bottom tab bar.
        glassTintColor={glassTintColor ?? colors.tabBarGlass}
        backdropBlur={blur}
        selectionColor={selectionColor ?? colors.tabSelection}
        lensTintColor={lensTintColor ?? colors.topTabLens}
        // The same color as the active label, so the lens and the labels match.
        focusedTintColor={
          activeTintColor ??
          focusedOptions.tabBarActiveTintColor ??
          colors.label
        }
        colorScheme={colorScheme}
        lensEnabled={lens}
        onTabSelect={(event) => selectTab(event.nativeEvent.index)}
        onTabLongPress={(event) => longPressTab(event.nativeEvent.index)}
        style={[styles.bar, { height }, style]}
      >
        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key]!;

          return (
            <TopTabItem
              key={route.key}
              index={i}
              position={position}
              options={options}
              title={getTitle(options, route.name)}
              focused={i === state.index}
              activeTintColor={
                activeTintColor ?? options.tabBarActiveTintColor ?? colors.label
              }
              inactiveTintColor={
                inactiveTintColor ??
                options.tabBarInactiveTintColor ??
                colors.secondaryLabel
              }
              onAccessibilityTap={() => selectTab(i)}
            />
          );
        })}
      </AnimatedLiquidTabBar>
    </View>
  );
}

function getTitle(options: MaterialTopTabNavigationOptions, routeName: string) {
  if (typeof options.tabBarLabel === 'string') {
    return options.tabBarLabel;
  }

  return options.title ?? routeName;
}

type TopTabItemProps = {
  index: number;
  position: Animated.AnimatedInterpolation<number>;
  options: MaterialTopTabNavigationOptions;
  title: string;
  focused: boolean;
  activeTintColor: string;
  inactiveTintColor: string;
  onAccessibilityTap: () => void;
};

/** A tab's content. Touches and the lens are handled by the native bar. */
const TopTabItem = memo(function TopTabItemContent({
  index,
  position,
  options,
  title,
  focused,
  activeTintColor,
  inactiveTintColor,
  onAccessibilityTap,
}: TopTabItemProps) {
  const color = focused ? activeTintColor : inactiveTintColor;
  // The label takes the active color as the pill passes under it while swiping.
  // An active copy fades in over the inactive one: opacity runs on the native
  // driver on both platforms, while animated text colors go stale on iOS.
  const activeOpacity = position.interpolate({
    inputRange: [index - 1, index, index + 1],
    outputRange: [0, 1, 0],
    extrapolate: 'clamp',
  });
  const labelProps = {
    numberOfLines: 1,
    allowFontScaling: options.tabBarAllowFontScaling,
  };

  return (
    <View
      accessible
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={options.tabBarAccessibilityLabel ?? title}
      onAccessibilityTap={onAccessibilityTap}
      testID={options.tabBarButtonTestID}
      style={styles.item}
    >
      {options.tabBarShowIcon && options.tabBarIcon
        ? options.tabBarIcon({ focused, color })
        : null}
      {options.tabBarShowLabel !== false ? (
        typeof options.tabBarLabel === 'function' ? (
          options.tabBarLabel({ focused, color, children: title })
        ) : (
          <View>
            <Text
              {...labelProps}
              style={[
                styles.label,
                { color: inactiveTintColor },
                options.tabBarLabelStyle,
              ]}
            >
              {title}
            </Text>
            <Animated.View
              style={[StyleSheet.absoluteFill, { opacity: activeOpacity }]}
            >
              <Text
                {...labelProps}
                style={[
                  styles.label,
                  { color: activeTintColor },
                  options.tabBarLabelStyle,
                ]}
              >
                {title}
              </Text>
            </Animated.View>
          </View>
        )
      ) : null}
      {options.tabBarBadge?.()}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  floating: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  bar: {
    flexDirection: 'row',
    // Matches the inset of the native selection pill.
    paddingHorizontal: 4,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  // One weight for every state: changing it reflows the text and flickers.
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 4,
  },
});
