import {
  createContext,
  memo,
  type Context,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type {
  BottomTabBarProps,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import {
  LiquidGlassContainer,
  LiquidGlassView,
  type LiquidGlassStyle,
} from '../LiquidGlassView';
import { NativeLiquidTabBar } from '../NativeLiquidGlass';
import {
  LiquidExpandableSearch,
  type LiquidExpandableSearchProps,
} from '../components/LiquidExpandableSearch';
import {
  useLiquidColors,
  type LiquidColorSchemeSetting,
  type LiquidColors,
} from '../theme';

type HeightCallback = ((height: number) => void) | undefined;

// Reports the tab bar height to `useBottomTabBarHeight()`. The navigator is an
// optional peer dependency, so it is only required when it is installed.
const HeightCallbackContext: Context<HeightCallback> = (() => {
  try {
    return require('@react-navigation/bottom-tabs')
      .BottomTabBarHeightCallbackContext;
  } catch {
    return createContext<HeightCallback>(undefined);
  }
})();

/** Search shown as a glass circle after the bar, like the search tab of iOS 26. */
export type LiquidTabBarSearchOptions = Pick<
  LiquidExpandableSearchProps,
  | 'expanded'
  | 'defaultExpanded'
  | 'onExpandedChange'
  | 'value'
  | 'onChangeText'
  | 'onSubmit'
  | 'placeholder'
>;

export type LiquidBottomTabBarOptions = {
  /** @default 'clear' */
  glassStyle?: LiquidGlassStyle;
  /** Tints the glass of the bar. */
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
  /** Height of the glass capsule. @default 62 */
  height?: number;
  /** Horizontal distance from the screen edges. @default 20 */
  horizontalMargin?: number;
  /** Distance from the bottom edge. Defaults to the bottom safe area. */
  bottomOffset?: number;
  /**
   * Element shown in a separate glass circle after the bar, like the search
   * tab of iOS 26. Wrap it in a `Pressable` to handle presses.
   */
  accessory?: ReactNode;
  /**
   * Adds a search button after the bar that morphs into a search field with
   * a close button, like `LiquidExpandableSearch`. The tabs fade out while
   * searching and the bar rises above the keyboard. Replaces `accessory`.
   */
  search?: LiquidTabBarSearchOptions;
  /**
   * Lifts a glass lens out of the selection pill while pressing, which follows
   * the finger across the tabs and magnifies them. Animated natively.
   * @default true
   */
  lens?: boolean;
  /** Style of the glass capsule. */
  style?: StyleProp<ViewStyle>;
};

export type LiquidBottomTabBarProps = BottomTabBarProps &
  LiquidBottomTabBarOptions;

const ACCESSORY_GAP = 12;
/** Distance between the raised bar and the keyboard. */
const KEYBOARD_GAP = 8;

/**
 * A floating Liquid Glass tab bar for `@react-navigation/bottom-tabs`.
 *
 * Touches and animations are native (UIKit on iOS, Compose on Android):
 * pressing lifts a glass lens out of the selection pill that follows the
 * finger with spring physics, stretches with its speed, magnifies the tabs and
 * settles into the pill on release.
 *
 * ```tsx
 * <Tab.Navigator tabBar={(props) => <LiquidBottomTabBar {...props} />}>
 * ```
 *
 * The bar floats above the screens, so scrollable content should add
 * `useBottomTabBarHeight()` as bottom padding.
 */
export function LiquidBottomTabBar({
  state,
  descriptors,
  navigation,
  insets,
  glassStyle = 'clear',
  glassTintColor: glassTintColorProp,
  blur = 0.8,
  colorScheme = 'system',
  activeTintColor,
  inactiveTintColor,
  selectionColor,
  height = 62,
  horizontalMargin = 20,
  bottomOffset,
  accessory,
  search,
  lens = true,
  style,
}: LiquidBottomTabBarProps) {
  const { colors } = useLiquidColors(colorScheme);
  // A light tint keeps the tabs readable on the clear glass.
  const glassTintColor = glassTintColorProp ?? colors.tabBarGlass;
  const onHeightChange = useContext(HeightCallbackContext);
  const keyboardVisible = useKeyboardVisible();
  const [ownSearchExpanded, setOwnSearchExpanded] = useState(
    search?.defaultExpanded ?? false
  );
  const searching = search != null && (search.expanded ?? ownSearchExpanded);
  const bottom = bottomOffset ?? Math.max(insets.bottom - 8, 12);
  const containerRef = useRef<ComponentRef<typeof View>>(null);
  const lift = useKeyboardLift(searching, containerRef, bottom);

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
  const hidden =
    StyleSheet.flatten(focusedOptions.tabBarStyle as StyleProp<ViewStyle>)
      ?.display === 'none' ||
    (focusedOptions.tabBarHideOnKeyboard === true &&
      keyboardVisible &&
      !searching);

  if (hidden) {
    return null;
  }

  const bar = (
    <NativeLiquidTabBar
      accessibilityRole="tablist"
      selectedIndex={state.index}
      glassStyle={glassStyle}
      glassTintColor={glassTintColor}
      backdropBlur={blur}
      selectionColor={selectionColor ?? colors.tabSelection}
      focusedTintColor={
        activeTintColor ?? focusedOptions.tabBarActiveTintColor ?? colors.tint
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
          <TabItem
            key={route.key}
            options={options}
            title={getTitle(options, route.name)}
            focused={i === state.index}
            colors={colors}
            activeTintColor={
              activeTintColor ?? options.tabBarActiveTintColor ?? colors.tint
            }
            inactiveTintColor={
              inactiveTintColor ??
              options.tabBarInactiveTintColor ??
              colors.label
            }
            onAccessibilityTap={() => selectTab(i)}
          />
        );
      })}
    </NativeLiquidTabBar>
  );

  return (
    <View
      ref={containerRef}
      pointerEvents="box-none"
      onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
      style={[
        styles.container,
        {
          paddingBottom: bottom,
          paddingLeft: horizontalMargin + insets.left,
          paddingRight: horizontalMargin + insets.right,
        },
      ]}
    >
      <Animated.View
        pointerEvents="box-none"
        style={{ transform: [{ translateY: lift }] }}
      >
        {search != null ? (
          <LiquidExpandableSearch
            {...search}
            expanded={searching}
            onExpandedChange={(next) => {
              setOwnSearchExpanded(next);
              search.onExpandedChange?.(next);
            }}
            height={height}
            glassStyle={glassStyle}
            glassTintColor={glassTintColor}
            colorScheme={colorScheme}
          >
            {bar}
          </LiquidExpandableSearch>
        ) : (
          // No merging: the pressed bar and its lens must not fuse with the accessory.
          <LiquidGlassContainer spacing={0} style={styles.row}>
            {bar}
            {accessory != null ? (
              <LiquidGlassView
                interactive
                glassStyle={glassStyle}
                tintColor={glassTintColor}
                colorScheme={colorScheme}
                cornerRadius={height / 2}
                style={[styles.accessory, { width: height, height }]}
              >
                {accessory}
              </LiquidGlassView>
            ) : null}
          </LiquidGlassContainer>
        )}
      </Animated.View>
    </View>
  );
}

function getTitle(options: BottomTabNavigationOptions, routeName: string) {
  if (typeof options.tabBarLabel === 'string') {
    return options.tabBarLabel;
  }

  return options.title ?? routeName;
}

type TabItemProps = {
  options: BottomTabNavigationOptions;
  title: string;
  focused: boolean;
  colors: LiquidColors;
  activeTintColor: string;
  inactiveTintColor: string;
  onAccessibilityTap: () => void;
};

/** A tab's content. Touches and the lift animation are handled by the native bar. */
const TabItem = memo(function TabItemContent({
  options,
  title,
  focused,
  colors,
  activeTintColor,
  inactiveTintColor,
  onAccessibilityTap,
}: TabItemProps) {
  const color = focused ? activeTintColor : inactiveTintColor;
  const showLabel = options.tabBarShowLabel !== false;

  const label =
    typeof options.tabBarLabel === 'function' ? (
      options.tabBarLabel({
        focused,
        color,
        position: 'below-icon',
        children: title,
      })
    ) : (
      <Text
        numberOfLines={1}
        allowFontScaling={options.tabBarAllowFontScaling}
        style={[styles.label, { color }, options.tabBarLabelStyle]}
      >
        {title}
      </Text>
    );

  return (
    <View
      accessible
      accessibilityRole={Platform.OS === 'web' ? 'link' : 'tab'}
      accessibilityState={{ selected: focused }}
      accessibilityLabel={options.tabBarAccessibilityLabel ?? title}
      onAccessibilityTap={onAccessibilityTap}
      testID={options.tabBarButtonTestID}
      style={styles.item}
    >
      <View>
        {options.tabBarIcon?.({ focused, color, size: 24 })}
        {options.tabBarBadge != null ? (
          <View
            style={[
              styles.badge,
              options.tabBarBadgeStyle as StyleProp<ViewStyle>,
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.thumb }]}>
              {options.tabBarBadge}
            </Text>
          </View>
        ) : null}
      </View>
      {showLabel ? label : null}
    </View>
  );
});

/**
 * Raises the bar above the keyboard while `enabled`. Measures where the bar
 * ends up, so it only moves as far as needed when the window already resizes
 * for the keyboard.
 */
function useKeyboardLift(
  enabled: boolean,
  containerRef: RefObject<ComponentRef<typeof View> | null>,
  bottom: number
) {
  const lift = useRef(new Animated.Value(0)).current;
  const keyboardTop = useRef<number | null>(null);

  useEffect(() => {
    const animate = (toValue: number, duration?: number) => {
      Animated.timing(lift, {
        toValue,
        duration: duration || 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };
    const update = (duration?: number) => {
      const top = keyboardTop.current;
      if (!enabled || top == null) {
        animate(0, duration);
        return;
      }
      // The container itself is not transformed, so this is the resting position.
      containerRef.current?.measureInWindow((_x, y, _width, layoutHeight) => {
        const barBottom = y + layoutHeight - bottom;
        animate(Math.min(0, top - KEYBOARD_GAP - barBottom), duration);
      });
    };

    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        keyboardTop.current = event.endCoordinates.screenY;
        update(event.duration);
      }
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (event) => {
        keyboardTop.current = null;
        update(event.duration);
      }
    );
    update();

    return () => {
      show.remove();
      hide.remove();
    };
  }, [enabled, bottom, containerRef, lift]);

  return lift;
}

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setVisible(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setVisible(false)
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    // Matches the inset of the native selection pill.
    paddingHorizontal: 4,
  },
  accessory: {
    marginLeft: ACCESSORY_GAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#FF3B30',
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
