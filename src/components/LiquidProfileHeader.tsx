import { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIQUID_HEADER_HEIGHT } from '../navigation/LiquidHeader';
import { useLiquidColors, type LiquidColorSchemeSetting } from '../theme';

export type LiquidProfileAction = {
  key: string;
  title: string;
  icon?: ReactNode;
  onPress?: () => void;
};

/** Native- and JS-driven halves of the entrance (corner radius cannot run natively). */
export type LiquidProfileEntrance = {
  progress: Animated.Value;
  radius: Animated.Value;
};

export type LiquidProfileHeaderProps = {
  /** The content offset of the scroll view under the header. */
  scrollY: Animated.Value;
  title: string;
  subtitle?: string;
  /** The profile photo: the hero at first, then the round avatar. */
  image?: ImageSourcePropType;
  /** Buttons at the bottom of the header, like mute, discuss, leave and more. */
  actions?: LiquidProfileAction[];
  /**
   * From `useLiquidProfileEntrance`: the photo grows out of the header's
   * avatar circle into the hero.
   */
  entrance?: LiquidProfileEntrance;
  /** Replaces the subtitle once collapsed, like "17 photos, 124 videos". */
  collapsedSubtitle?: string;
  /** Called when the header collapses into the bar or expands again. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Height of the fade over the content at the top once collapsed. */
  edgeHeight?: number;
  colorScheme?: LiquidColorSchemeSetting;
  style?: StyleProp<ViewStyle>;
};

const AVATAR_SIZE = 92;
const TITLE_HEIGHT = 30;
const SUBTITLE_HEIGHT = 22;
const ACTION_HEIGHT = 60;
/** Scroll distance over which the photo becomes the round avatar. */
const MORPH_DISTANCE = 150;
/** The header's avatar circle (see LiquidHeaderProvider), where the entrance starts. */
const HEADER_AVATAR = 44;
const HEADER_INSET = 16;
/** Steps of the blur that fades in at the bottom of the photo. */
const BLUR_STEPS = 8;
const BLUR_HEIGHT = 190;
/** Steps of the fade over the content at the top once collapsed. */
const EDGE_STEPS = 12;
/** Size of the name once it is in the bar. */
const BAR_TITLE_SCALE = 0.66;

/** Layout of the header for a screen width and top inset. */
export function getLiquidProfileHeaderLayout(
  width: number,
  topInset: number,
  hasActions = true
) {
  const height = Math.round(width * 1.22);
  const actionsTop = height - 16 - ACTION_HEIGHT;
  const titleTop =
    (hasActions ? actionsTop - 18 : height - 20) -
    TITLE_HEIGHT -
    SUBTITLE_HEIGHT;
  const collapsedHeight = topInset + LIQUID_HEADER_HEIGHT;
  return {
    height,
    titleTop,
    actionsTop,
    collapsedHeight,
    collapseDistance: height - collapsedHeight,
  };
}

/** Height of `LiquidProfileHeader`: pad the scroll content with it. */
export function useLiquidProfileHeaderHeight(hasActions = true) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return getLiquidProfileHeaderLayout(width, insets.top, hasActions).height;
}

/**
 * Scroll offsets where the header rests: the photo, the round avatar, and
 * the bar. Pass them to the scroll view's `snapToOffsets` with
 * `snapToEnd={false}`, so a scroll ending between two of them settles on the
 * nearest one and the content below scrolls freely.
 */
export function useLiquidProfileSnapOffsets(hasActions = true) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { collapseDistance } = getLiquidProfileHeaderLayout(
    width,
    insets.top,
    hasActions
  );
  return [0, MORPH_DISTANCE, Math.max(collapseDistance, MORPH_DISTANCE + 1)];
}

/** Plays a profile header's entrance once, when the screen mounts. */
export function useLiquidProfileEntrance(): LiquidProfileEntrance {
  const progress = useRef(new Animated.Value(0)).current;
  const radius = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spring = { stiffness: 240, damping: 30, mass: 1 };
    Animated.parallel([
      Animated.spring(progress, {
        toValue: 1,
        ...spring,
        useNativeDriver: true,
      }),
      Animated.spring(radius, {
        toValue: 1,
        ...spring,
        useNativeDriver: false,
      }),
    ]).start();
  }, [progress, radius]);

  return { progress, radius };
}

/**
 * A profile header like Telegram's on iOS 26. It opens on the full-width
 * photo, its bottom melting into a blur behind the name and a row of
 * buttons. Scrolling turns the photo into a round avatar over the blurred
 * photo and centers the name under it, then shrinks the avatar away and
 * lifts the name into the bar. Pulling down stretches the photo. Everything
 * but the entrance's corner radius runs on the native driver.
 *
 * ```tsx
 * const scrollY = useRef(new Animated.Value(0)).current;
 * <Animated.ScrollView
 *   onScroll={Animated.event(
 *     [{ nativeEvent: { contentOffset: { y: scrollY } } }],
 *     { useNativeDriver: true }
 *   )}
 *   contentContainerStyle={{ paddingTop: useLiquidProfileHeaderHeight() }}
 * />
 * <LiquidProfileHeader scrollY={scrollY} title="…" image={…} />
 * ```
 */
export function LiquidProfileHeader({
  scrollY,
  title,
  subtitle,
  image,
  actions,
  entrance,
  collapsedSubtitle,
  onCollapsedChange,
  edgeHeight,
  colorScheme,
  style,
}: LiquidProfileHeaderProps) {
  const insets = useSafeAreaInsets();
  const { scheme, colors } = useLiquidColors(colorScheme);
  const { width } = useWindowDimensions();
  const hasActions = actions != null && actions.length > 0;
  const layout = getLiquidProfileHeaderLayout(width, insets.top, hasActions);
  const H = layout.height;
  const M = MORPH_DISTANCE;
  const D = Math.max(layout.collapseDistance, M + 1);
  const edge = edgeHeight ?? layout.collapsedHeight + 60;
  const edgeColor = scheme === 'dark' ? '0, 0, 0' : '242, 242, 247';

  // Reports collapsing from the scroll position.
  const onCollapsed = useRef(onCollapsedChange);
  onCollapsed.current = onCollapsedChange;
  useEffect(() => {
    let collapsed = false;
    const id = scrollY.addListener(({ value }) => {
      const next = value > D * 0.85;
      if (next !== collapsed) {
        collapsed = next;
        onCollapsed.current?.(next);
      }
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, D]);

  const clampScroll = (input: number[], output: number[]) =>
    scrollY.interpolate({
      inputRange: input,
      outputRange: output,
      extrapolate: 'clamp',
    });

  // The header moves up with the content, then stays as the bar.
  const lift = clampScroll([0, D], [0, -D]);
  // Pulling down past the top stretches the photo.
  const pull = clampScroll([-240, 0], [240, 0]);
  const stretch = pull.interpolate({
    inputRange: [0, 240],
    outputRange: [1, 1 + 240 / H],
  });

  // Round avatar: just below the bar once the photo has turned into it.
  const avatarTop = M + insets.top + 8;

  // Name: centered over the photo, then under the avatar, then in the bar.
  const titleBlock = TITLE_HEIGHT + SUBTITLE_HEIGHT;
  const titleUnderAvatar = avatarTop + AVATAR_SIZE + 10 - layout.titleTop;
  const titleInBar =
    D + insets.top + (LIQUID_HEADER_HEIGHT - titleBlock) / 2 - layout.titleTop;

  // Entrance: the photo grows out of the header's avatar circle.
  const progress = entrance?.progress ?? ONE;
  const fromX = width - HEADER_INSET - HEADER_AVATAR / 2 - width / 2;
  const fromY = insets.top + LIQUID_HEADER_HEIGHT / 2 - H / 2;
  const photoRadius =
    entrance != null
      ? entrance.radius.interpolate({
          inputRange: [0, 1],
          outputRange: [width / 2, 0],
        })
      : 0;

  // Once collapsed the content shows through, fading out under the bar.
  const collapsedFade = clampScroll([D * 0.7, D], [1, 0]);
  const collapsedShow = clampScroll([D * 0.7, D], [0, 1]);

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, style]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.edge, { height: edge, opacity: collapsedShow }]}
      >
        {Array.from({ length: EDGE_STEPS }, (_, i) => (
          <View
            key={i}
            style={{
              height: edge / EDGE_STEPS,
              backgroundColor: `rgba(${edgeColor}, ${
                0.92 * (1 - i / EDGE_STEPS) ** 1.6
              })`,
            }}
          />
        ))}
      </Animated.View>
      <Animated.View
        pointerEvents="box-none"
        style={[styles.root, { height: H, transform: [{ translateY: lift }] }]}
      >
        {/* Blurred photo: behind the round avatar. */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            {
              opacity: Animated.multiply(progress, collapsedFade),
              transform: [
                { translateY: Animated.multiply(pull, -0.5) },
                { scale: stretch },
              ],
            },
          ]}
        >
          {image != null ? (
            <Image
              source={image}
              blurRadius={40}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View style={styles.backdropShade} />
        </Animated.View>

        {/* The hero photo. Grows in on entrance, fades into the avatar on scroll. */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: clampScroll([0, M * 0.55, M], [1, 0.5, 0]),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [fromX, 0],
                  }),
                },
                {
                  translateY: Animated.add(
                    progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [fromY, 0],
                    }),
                    Animated.multiply(pull, -0.5)
                  ),
                },
                {
                  scale: Animated.multiply(
                    progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [HEADER_AVATAR / width, 1],
                    }),
                    Animated.add(stretch, clampScroll([0, M], [0, -0.25]))
                  ),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.clip,
              { borderRadius: photoRadius },
            ]}
          >
            {image != null ? (
              <Image
                source={image}
                resizeMode="cover"
                style={StyleSheet.absoluteFill}
              />
            ) : null}
            {/* The bottom of the photo melts into its blurred copy, in steps. */}
            {image != null
              ? Array.from({ length: BLUR_STEPS }, (_, i) => {
                  const stepHeight = BLUR_HEIGHT / BLUR_STEPS;
                  const top = H - BLUR_HEIGHT + i * stepHeight;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.blurStep,
                        {
                          top,
                          height: stepHeight + 1,
                          opacity: (i + 1) / BLUR_STEPS,
                        },
                      ]}
                    >
                      <Image
                        source={image}
                        blurRadius={30}
                        resizeMode="cover"
                        style={[
                          styles.blurImage,
                          { top: -top, width, height: H },
                        ]}
                      />
                    </View>
                  );
                })
              : null}
            <View style={styles.photoShade} />
          </Animated.View>
        </Animated.View>

        {/* Round avatar: grows out of the fading photo, then shrinks away. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.avatar,
            {
              top: avatarTop,
              left: (width - AVATAR_SIZE) / 2,
              opacity: clampScroll(
                [M * 0.35, M, D * 0.65, D * 0.8],
                [0, 1, 1, 0]
              ),
              transform: [
                // Falls behind the content a little as it shrinks.
                { translateY: clampScroll([M, D], [0, (D - M) * 0.35]) },
                {
                  scale: clampScroll(
                    [0, M, D * 0.8],
                    [width / AVATAR_SIZE / 1.6, 1, 0.3]
                  ),
                },
              ],
            },
          ]}
        >
          {image != null ? (
            <Image source={image} style={styles.avatarImage} />
          ) : null}
        </Animated.View>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.titleBlock,
            {
              top: layout.titleTop,
              opacity: progress,
              transform: [
                {
                  translateY: Animated.add(
                    clampScroll([0, M, D], [0, titleUnderAvatar, titleInBar]),
                    Animated.multiply(pull, 0.5)
                  ),
                },
                { scale: clampScroll([M, D], [1, BAR_TITLE_SCALE]) },
              ],
            },
          ]}
        >
          <View style={styles.titleMeasure}>
            {/* Over the photo. */}
            <Animated.View style={{ opacity: collapsedFade }}>
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>
              {subtitle != null ? (
                <Text numberOfLines={1} style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </Animated.View>
            {/* In the bar, over the content. */}
            <Animated.View
              style={[styles.barTitle, { opacity: collapsedShow }]}
            >
              <Text
                numberOfLines={1}
                style={[styles.title, { color: colors.label }]}
              >
                {title}
              </Text>
              {(collapsedSubtitle ?? subtitle) != null ? (
                <Text
                  numberOfLines={1}
                  style={[styles.subtitle, { color: colors.secondaryLabel }]}
                >
                  {collapsedSubtitle ?? subtitle}
                </Text>
              ) : null}
            </Animated.View>
          </View>
        </Animated.View>

        {hasActions ? (
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.actions,
              {
                top: layout.actionsTop,
                opacity: Animated.multiply(
                  progress,
                  clampScroll([M, M + (D - M) * 0.4], [1, 0])
                ),
                transform: [
                  {
                    translateY: Animated.add(
                      progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }),
                      Animated.multiply(pull, 0.5)
                    ),
                  },
                  { scale: clampScroll([M, M + (D - M) * 0.4], [1, 0.85]) },
                ],
              },
            ]}
          >
            {actions!.map((action) => (
              <Pressable
                key={action.key}
                accessibilityRole="button"
                accessibilityLabel={action.title}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.action,
                  pressed ? styles.actionPressed : null,
                ]}
              >
                {action.icon}
                <Text numberOfLines={1} style={styles.actionTitle}>
                  {action.title}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const ONE = new Animated.Value(1);

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  clip: {
    overflow: 'hidden',
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  // Wider than the name over the photo, so a longer subtitle fits.
  barTitle: {
    position: 'absolute',
    top: 0,
    left: -160,
    right: -160,
    alignItems: 'center',
  },
  backdrop: {
    overflow: 'hidden',
    backgroundColor: '#3A4A5C',
  },
  backdropShade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  blurStep: {
    position: 'absolute',
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  blurImage: {
    position: 'absolute',
    left: 0,
  },
  // Keeps the white name readable on light photos.
  photoShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BLUR_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  avatar: {
    position: 'absolute',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  titleBlock: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  titleMeasure: {
    maxWidth: '100%',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    height: TITLE_HEIGHT,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 16,
    height: SUBTITLE_HEIGHT,
  },
  actions: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: ACTION_HEIGHT,
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});
