import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  type ColorValue,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useLiquidColorScheme, type LiquidColorSchemeSetting } from '../theme';
import { GLASS_BUTTON_V2_SIZE } from './GlassButtonV2';
import { GlassShapeV2 } from './GlassShapeV2';
import { useReduceMotion } from './accessibility';

const INSET = 4;

export type GlassTopTabsV2Item = {
  key: string;
  title: string;
  accessibilityLabel?: string;
};

export type GlassTopTabsV2Props = {
  items: GlassTopTabsV2Item[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Selected title colour. @default black (light) / white (dark) */
  activeTintColor?: ColorValue;
  /** Other titles. @default a secondary grey */
  inactiveTintColor?: ColorValue;
  /** Fills the capsule's glass with a colour. */
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
  /** Capsule height in points; keep at least 44 (iOS) / 48 (Android) to touch. @default 44 / 48 */
  height?: number;
  colorScheme?: LiquidColorSchemeSetting;
  reduceTransparency?: 'system' | 'on' | 'off';
  style?: StyleProp<ViewStyle>;
};

/**
 * Glass top tabs like the iOS 26 Photos switcher (Years, Months, All): a
 * capsule of titles with a lozenge that springs to the selected one on the
 * native driver, and press feedback.
 */
export const GlassTopTabsV2 = memo(function GlassTopTabsV2Impl({
  items,
  selectedIndex,
  onSelect,
  activeTintColor,
  inactiveTintColor,
  tintColor,
  variant = 'regular',
  clarity,
  refraction,
  shine,
  height = GLASS_BUTTON_V2_SIZE,
  colorScheme = 'system',
  reduceTransparency = 'system',
  style,
}: GlassTopTabsV2Props) {
  const dark = useLiquidColorScheme(colorScheme) === 'dark';
  const glass = { clarity, refraction, shine };
  const reduceMotion = useReduceMotion();
  const active = activeTintColor ?? (dark ? '#FFFFFF' : '#000000');
  const inactive =
    inactiveTintColor ??
    (dark ? 'rgba(235, 235, 245, 0.6)' : 'rgba(60, 60, 67, 0.6)');

  const [width, setWidth] = useState(0);
  const tabWidth = items.length > 0 ? (width - INSET * 2) / items.length : 0;
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
            outputRange: [INSET, INSET + (items.length - 1) * tabWidth],
            extrapolate: 'clamp',
          })
        : INSET,
    [position, items.length, tabWidth]
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width),
    []
  );

  return (
    <GlassShapeV2
      shape="capsule"
      variant={variant}
      {...glass}
      tintColor={tintColor}
      colorScheme={colorScheme}
      reduceTransparency={reduceTransparency}
      onLayout={onLayout}
      accessibilityRole="tablist"
      style={[styles.bar, { height }, style]}
    >
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.lozenge,
            dark ? styles.lozengeDark : styles.lozengeLight,
            {
              width: tabWidth,
              borderRadius: (height - INSET * 2) / 2,
              transform: [{ translateX: lozengeX }],
            },
          ]}
        />
      ) : null}
      {items.map((item, index) => (
        <TopTab
          key={item.key}
          item={item}
          index={index}
          focused={index === selectedIndex}
          color={index === selectedIndex ? active : inactive}
          onSelect={onSelect}
          reduceMotion={reduceMotion}
        />
      ))}
    </GlassShapeV2>
  );
});

const TopTab = memo(function TopTabImpl({
  item,
  index,
  focused,
  color,
  onSelect,
  reduceMotion,
}: {
  item: GlassTopTabsV2Item;
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
      onPressIn={() => press(0.92)}
      onPressOut={() => press(1)}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={item.accessibilityLabel ?? item.title}
      style={styles.tab}
    >
      <Animated.Text
        numberOfLines={1}
        style={[
          styles.title,
          focused && styles.titleFocused,
          { color, transform: [{ scale }] },
        ]}
      >
        {item.title}
      </Animated.Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingHorizontal: INSET,
  },
  lozenge: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    left: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lozengeDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  lozengeLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.07)',
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
  },
  titleFocused: {
    fontWeight: '600',
  },
});
