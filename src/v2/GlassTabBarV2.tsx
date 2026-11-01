import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLiquidColorScheme, type LiquidColorSchemeSetting } from '../theme';
import { GlassGroupV2 } from './GlassGroupV2';
import { GlassShapeV2 } from './GlassShapeV2';
import { useReduceMotion } from './accessibility';

/** Measured on iOS 26 (references/ANALYSIS.md). */
const BAR_HEIGHT = 54;
const SIDE_MARGIN = 19;
const LOZENGE_INSET = 4;
const GAP = 10;
/** How far the content scrolls down before the bar is fully minimised. */
const MINIMIZE_DISTANCE = 80;

export type GlassTabBarV2Item = {
  key: string;
  title: string;
  /** Receives whether the tab is selected and the colour to draw it in. */
  icon: (focused: boolean, color: ColorValue) => ReactNode;
  /** A red badge: a number or short text. */
  badge?: number | string;
  accessibilityLabel?: string;
};

export type GlassTabBarV2Props = {
  items: GlassTabBarV2Item[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /**
   * The scroll offset of the screen's scroll view, from
   * `Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })`.
   * Only used with `minimizeOnScroll`.
   */
  scrollY?: Animated.Value;
  /**
   * Scrolling down minimises the bar (the selected tab as a circle,
   * `accessory` as a pill, `trailing` as a circle) and scrolling up expands
   * it, all on the UI thread. Needs `scrollY`. @default false
   */
  minimizeOnScroll?: boolean;
  /**
   * A mini player: above the bar, or between the circles while minimised
   * (`minimizeOnScroll`).
   */
  accessory?: ReactNode;
  /** A separate glass circle after the bar (a search button). */
  trailing?: {
    icon: ReactNode;
    onPress: () => void;
    accessibilityLabel: string;
  };
  /** Selected tab tint. @default '#0A84FF' */
  activeTintColor?: ColorValue;
  /** Colour of the unselected tabs. @default black (light) / white (dark) */
  inactiveTintColor?: ColorValue;
  /** Fills the bar's glass with a colour. */
  tintColor?: ColorValue;
  /** @default 'regular' */
  variant?: 'regular' | 'clear';
  /**
   * 0 = regular to 1 = clear. Android: continuous (less blur and frost).
   * iOS: the nearer system style. Overrides `variant`.
   */
  clarity?: number;
  /** Android: how strongly the page bends at the rim, 0 to 1. @default 1 */
  refraction?: number;
  /** Android: brightness of the lit rim, 0 to 1. @default 1 */
  shine?: number;
  /** Titles under the icons. @default true */
  showLabels?: boolean;
  /** Bar height in points. @default 54 (iOS 26) */
  height?: number;
  /** Space between the screen edges and the bar. @default 19 (iOS 26) */
  sideMargin?: number;
  colorScheme?: LiquidColorSchemeSetting;
  reduceTransparency?: 'system' | 'on' | 'off';
  /** Distance from the bottom edge. Defaults to the iOS 26 placement over the home indicator. */
  bottomOffset?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A floating glass tab bar like iOS 26: a capsule with a lozenge that springs
 * to the selected tab (native driver), press feedback, and (opt-in) minimise
 * on scroll. The bar and its trailing circle are one glass group.
 */
export const GlassTabBarV2 = memo(function GlassTabBarV2Impl({
  items,
  selectedIndex,
  onSelect,
  scrollY,
  minimizeOnScroll = false,
  accessory,
  trailing,
  activeTintColor = '#0A84FF',
  inactiveTintColor,
  tintColor,
  variant = 'regular',
  clarity,
  refraction,
  shine,
  showLabels = true,
  height = BAR_HEIGHT,
  sideMargin = SIDE_MARGIN,
  colorScheme = 'system',
  reduceTransparency = 'system',
  bottomOffset,
  style,
}: GlassTabBarV2Props) {
  const insets = useSafeAreaInsets();
  const dark = useLiquidColorScheme(colorScheme) === 'dark';
  const glass = { clarity, refraction, shine };
  const reduceMotion = useReduceMotion();
  const inactive = inactiveTintColor ?? (dark ? '#FFFFFF' : '#000000');
  const bottom =
    bottomOffset ??
    (Platform.OS === 'android'
      ? insets.bottom + 12
      : Math.max(insets.bottom - 14, 12));

  const [barWidth, setBarWidth] = useState(0);
  const tabWidth =
    items.length > 0 ? (barWidth - LOZENGE_INSET * 2) / items.length : 0;
  const position = useRef(new Animated.Value(selectedIndex)).current;

  useEffect(() => {
    const animation = reduceMotion
      ? Animated.timing(position, {
          toValue: selectedIndex,
          duration: 0,
          useNativeDriver: true,
        })
      : Animated.spring(position, {
          toValue: selectedIndex,
          stiffness: 260,
          damping: 26,
          mass: 1,
          useNativeDriver: true,
        });
    animation.start();
    return () => animation.stop();
  }, [position, selectedIndex, reduceMotion]);

  const lozengeX = useMemo(
    () =>
      items.length > 1
        ? position.interpolate({
            inputRange: [0, items.length - 1],
            outputRange: [
              LOZENGE_INSET,
              LOZENGE_INSET + (items.length - 1) * tabWidth,
            ],
            extrapolate: 'clamp',
          })
        : LOZENGE_INSET,
    [position, items.length, tabWidth]
  );

  // 0 = expanded, 1 = minimised. diffClamp: down minimises, up expands.
  // The offset is clamped at 0 first: iOS rubber-bands past the top, and the
  // way back to 0 would otherwise count as scrolling down. It also keeps the
  // bar expanded at the top, since diffClamp can't then exceed the offset.
  const minimized = useMemo(
    () =>
      scrollY == null || !minimizeOnScroll
        ? null
        : Animated.diffClamp(
            scrollY.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
              extrapolateLeft: 'clamp',
            }),
            0,
            MINIMIZE_DISTANCE
          ).interpolate({
            inputRange: [0, MINIMIZE_DISTANCE],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          }),
    [scrollY, minimizeOnScroll]
  );
  const away = height + bottom + 24;
  const expandedTranslate = minimized?.interpolate({
    inputRange: [0, 1],
    outputRange: [0, away],
  });
  const minimizedTranslate = minimized?.interpolate({
    inputRange: [0, 1],
    outputRange: [away, 0],
  });

  const onBarLayout = useCallback(
    (event: LayoutChangeEvent) => setBarWidth(event.nativeEvent.layout.width),
    []
  );

  const lozengeColor = dark ? 'rgba(0, 0, 0, 0.32)' : 'rgba(0, 0, 0, 0.07)';
  const lozengeEdge = dark
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(0, 0, 0, 0.04)';
  const selected = items[selectedIndex];

  const trailingCircle =
    trailing != null ? (
      <GlassShapeV2
        shape="capsule"
        interactive
        variant={variant}
        {...glass}
        colorScheme={colorScheme}
        reduceTransparency={reduceTransparency}
        style={{ width: height, height }}
      >
        <Pressable
          onPress={trailing.onPress}
          accessibilityRole="button"
          accessibilityLabel={trailing.accessibilityLabel}
          style={styles.center}
        >
          {trailing.icon}
        </Pressable>
      </GlassShapeV2>
    ) : null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          paddingBottom: bottom,
          paddingLeft: sideMargin + insets.left,
          paddingRight: sideMargin + insets.right,
        },
        style,
      ]}
    >
      <Animated.View
        style={
          expandedTranslate != null && {
            transform: [{ translateY: expandedTranslate }],
          }
        }
      >
        <GlassGroupV2
          colorScheme={colorScheme}
          variant={variant}
          {...glass}
          reduceTransparency={reduceTransparency}
          style={styles.column}
        >
          {accessory != null && minimized == null ? (
            // Without minimising, the accessory floats above the bar, like the
            // iOS 26 Music mini player.
            <GlassShapeV2
              shape="capsule"
              variant={variant}
              {...glass}
              colorScheme={colorScheme}
              reduceTransparency={reduceTransparency}
              style={[
                styles.accessory,
                styles.accessoryAbove,
                { height: height - 6 },
              ]}
            >
              {accessory}
            </GlassShapeV2>
          ) : null}
          <View style={styles.row}>
            <GlassShapeV2
              shape="capsule"
              variant={variant}
              {...glass}
              tintColor={tintColor}
              colorScheme={colorScheme}
              reduceTransparency={reduceTransparency}
              onLayout={onBarLayout}
              accessibilityRole="tablist"
              style={[styles.bar, { height }]}
            >
              {barWidth > 0 ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.lozenge,
                    {
                      borderRadius: (height - LOZENGE_INSET * 2) / 2,
                      width: tabWidth,
                      backgroundColor: lozengeColor,
                      borderColor: lozengeEdge,
                      transform: [{ translateX: lozengeX }],
                    },
                  ]}
                />
              ) : null}
              {items.map((item, index) => (
                <Tab
                  key={item.key}
                  item={item}
                  index={index}
                  focused={index === selectedIndex}
                  color={index === selectedIndex ? activeTintColor : inactive}
                  onSelect={onSelect}
                  reduceMotion={reduceMotion}
                  showLabel={showLabels}
                />
              ))}
            </GlassShapeV2>
            {trailingCircle}
          </View>
        </GlassGroupV2>
      </Animated.View>

      {minimizedTranslate != null && selected != null ? (
        <Animated.View
          style={[
            styles.minimizedRow,
            {
              bottom,
              left: sideMargin + insets.left,
              right: sideMargin + insets.right,
              transform: [{ translateY: minimizedTranslate }],
            },
          ]}
        >
          <GlassGroupV2
            colorScheme={colorScheme}
            variant={variant}
            {...glass}
            reduceTransparency={reduceTransparency}
            style={styles.row}
          >
            <GlassShapeV2
              shape="capsule"
              interactive
              variant={variant}
              {...glass}
              colorScheme={colorScheme}
              reduceTransparency={reduceTransparency}
              style={{ width: height, height }}
            >
              <Pressable
                onPress={() => onSelect(selectedIndex)}
                accessibilityRole="tab"
                accessibilityState={{ selected: true }}
                accessibilityLabel={
                  selected.accessibilityLabel ?? selected.title
                }
                style={styles.center}
              >
                {selected.icon(true, activeTintColor)}
              </Pressable>
            </GlassShapeV2>
            {accessory != null ? (
              <GlassShapeV2
                shape="capsule"
                variant={variant}
                {...glass}
                colorScheme={colorScheme}
                reduceTransparency={reduceTransparency}
                style={[styles.accessory, { height: height - 6 }]}
              >
                {accessory}
              </GlassShapeV2>
            ) : (
              <View style={styles.spacer} />
            )}
            {trailingCircle}
          </GlassGroupV2>
        </Animated.View>
      ) : null}
    </View>
  );
});

const Tab = memo(function TabImpl({
  item,
  index,
  focused,
  color,
  onSelect,
  reduceMotion,
  showLabel,
}: {
  showLabel: boolean;
  item: GlassTabBarV2Item;
  index: number;
  focused: boolean;
  color: ColorValue;
  onSelect: (index: number) => void;
  reduceMotion: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = (to: number) => {
    if (reduceMotion) {
      return;
    }
    Animated.spring(scale, {
      toValue: to,
      stiffness: 420,
      damping: 24,
      useNativeDriver: true,
    }).start();
  };
  return (
    <Pressable
      onPress={() => onSelect(index)}
      onPressIn={() => press(0.9)}
      onPressOut={() => press(1)}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={item.accessibilityLabel ?? item.title}
      style={styles.tab}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale }] }]}>
        <View>
          {item.icon(focused, color)}
          {item.badge != null ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          ) : null}
        </View>
        {showLabel ? (
          <Text numberOfLines={1} style={[styles.label, { color }]}>
            {item.title}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  column: {
    gap: 8,
  },
  accessoryAbove: {
    flex: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
  },
  minimizedRow: {
    position: 'absolute',
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: LOZENGE_INSET,
  },
  lozenge: {
    position: 'absolute',
    top: LOZENGE_INSET,
    bottom: LOZENGE_INSET,
    left: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessory: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  spacer: {
    flex: 1,
  },
});
