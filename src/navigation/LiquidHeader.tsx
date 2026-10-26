import type { ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type ColorValue,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiquidGlassView, type LiquidGlassStyle } from '../LiquidGlassView';
import { LiquidIconButton } from '../components/LiquidButton';
import { ChevronLeftIcon } from '../internal/icons';
import { useLiquidColors, type LiquidColorSchemeSetting } from '../theme';

/** Height of the header content, without the top safe area. */
export const LIQUID_HEADER_HEIGHT = 56;

/**
 * The subset of header options read by `LiquidHeader`. Options from
 * native-stack, stack, bottom-tabs and drawer navigators are compatible.
 */
export type LiquidHeaderOptions = {
  title?: string;
  headerTitle?:
    string | ((props: { children: string; tintColor?: string }) => ReactNode);
  headerTitleAlign?: 'left' | 'center';
  headerTitleStyle?: Animated.WithAnimatedValue<StyleProp<TextStyle>>;
  headerTintColor?: string;
  headerLeft?: (props: {
    tintColor?: string;
    canGoBack: boolean;
    label?: string;
  }) => ReactNode;
  headerRight?: (props: {
    tintColor?: string;
    canGoBack: boolean;
  }) => ReactNode;
  headerBackTitle?: string;
};

/** The props React Navigation passes to a custom `header`. */
export type LiquidHeaderNavigationProps = {
  navigation: { goBack: () => void };
  route: { key: string; name: string };
  options: LiquidHeaderOptions;
  back?: { title: string | undefined };
};

export type LiquidHeaderConfig = {
  /**
   * `floating` renders separate glass controls over the content (iOS 26).
   * `bar` renders a full-width glass bar.
   * @default 'floating'
   */
  variant?: 'floating' | 'bar';
  /** @default 'regular' */
  glassStyle?: LiquidGlassStyle;
  /** Tints the glass controls or bar. */
  glassTintColor?: ColorValue;
  /** @default 'system' */
  colorScheme?: LiquidColorSchemeSetting;
  /** Style of the outer header view. */
  style?: StyleProp<ViewStyle>;
};

export type LiquidHeaderProps = LiquidHeaderNavigationProps &
  LiquidHeaderConfig;

/**
 * A Liquid Glass header for React Navigation.
 *
 * ```tsx
 * <Stack.Navigator
 *   screenOptions={{
 *     header: (props) => <LiquidHeader {...props} />,
 *     headerTransparent: true,
 *   }}
 * >
 * ```
 *
 * Use `headerTransparent: true` so content scrolls under the glass, and pad
 * the content with `useLiquidHeaderHeight()`.
 */
export function LiquidHeader({
  navigation,
  route,
  options,
  back,
  variant = 'floating',
  glassStyle,
  glassTintColor,
  colorScheme,
  style,
}: LiquidHeaderProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useLiquidColors(colorScheme);
  const floating = variant === 'floating';
  const tintColor = options.headerTintColor ?? colors.label;
  const canGoBack = back != null;
  const titleText = getHeaderTitle(options, route.name);
  const centered = options.headerTitleAlign !== 'left';

  const title =
    typeof options.headerTitle === 'function' ? (
      options.headerTitle({ children: titleText, tintColor })
    ) : (
      <Animated.Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[styles.title, { color: tintColor }, options.headerTitleStyle]}
      >
        {titleText}
      </Animated.Text>
    );

  const left = options.headerLeft ? (
    options.headerLeft({
      tintColor,
      canGoBack,
      label: options.headerBackTitle ?? back?.title,
    })
  ) : canGoBack ? (
    <LiquidIconButton
      accessibilityLabel={options.headerBackTitle ?? back?.title ?? 'Back'}
      glassStyle={glassStyle}
      tintColor={glassTintColor}
      colorScheme={colorScheme}
      onPress={navigation.goBack}
    >
      <ChevronLeftIcon color={tintColor} />
    </LiquidIconButton>
  ) : null;

  const rightContent = options.headerRight?.({ tintColor, canGoBack });
  const right =
    rightContent != null && floating ? (
      <LiquidGlassView
        glassStyle={glassStyle}
        tintColor={glassTintColor}
        colorScheme={colorScheme}
        cornerRadius={22}
        style={styles.rightCapsule}
      >
        {rightContent}
      </LiquidGlassView>
    ) : (
      rightContent
    );

  const content = (
    <View
      pointerEvents="box-none"
      style={[
        styles.row,
        { paddingLeft: insets.left + 16, paddingRight: insets.right + 16 },
      ]}
    >
      <View pointerEvents="box-none" style={[styles.side, styles.left]}>
        {left}
      </View>
      <View
        pointerEvents="box-none"
        style={[
          styles.titleContainer,
          centered ? styles.titleCentered : styles.titleLeft,
        ]}
      >
        {title}
      </View>
      <View pointerEvents="box-none" style={[styles.side, styles.right]}>
        {right}
      </View>
    </View>
  );

  if (floating) {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.header, { paddingTop: insets.top }, style]}
      >
        {content}
      </View>
    );
  }

  return (
    <LiquidGlassView
      glassStyle={glassStyle}
      tintColor={glassTintColor}
      colorScheme={colorScheme}
      cornerRadius={0}
      shadow={false}
      style={[styles.header, { paddingTop: insets.top }, style]}
    >
      {content}
    </LiquidGlassView>
  );
}

/** Returns the title the way React Navigation resolves it. */
export function getHeaderTitle(options: LiquidHeaderOptions, fallback: string) {
  return typeof options.headerTitle === 'string'
    ? options.headerTitle
    : (options.title ?? fallback);
}

/** Total height of `LiquidHeader`, including the top safe area. */
export function useLiquidHeaderHeight() {
  return useSafeAreaInsets().top + LIQUID_HEADER_HEIGHT;
}

/**
 * Returns a `header` render function with the given configuration.
 *
 * ```tsx
 * screenOptions={{ header: createLiquidHeader({ variant: 'bar' }) }}
 * ```
 */
export function createLiquidHeader(config: LiquidHeaderConfig = {}) {
  return function Header(props: LiquidHeaderNavigationProps) {
    return <LiquidHeader {...props} {...config} />;
  };
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
  },
  row: {
    height: LIQUID_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  left: {
    justifyContent: 'flex-start',
  },
  right: {
    marginLeft: 'auto',
    justifyContent: 'flex-end',
  },
  titleContainer: {
    justifyContent: 'center',
  },
  titleCentered: {
    position: 'absolute',
    left: 72,
    right: 72,
    top: 0,
    bottom: 0,
    alignItems: 'center',
  },
  titleLeft: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  rightCapsule: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
