import { memo, useMemo, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiquidGlassView } from '../LiquidGlassView';
import { NativeLiquidScrollEdgeContainer } from '../NativeLiquidGlass';
import { useLiquidColorScheme, type LiquidColorSchemeSetting } from '../theme';
import { GlassGroupV2 } from './GlassGroupV2';

/** Row height under the status bar (buttons are 44/48 high, centred). */
export const GLASS_HEADER_V2_HEIGHT = 52;
/** How far the scroll-edge band reaches below the row, then fades out. */
const EDGE_FADE = 28;
/** Scroll distance over which the band fades in. */
const EDGE_REVEAL = 24;

export type GlassHeaderV2Props = {
  /** Shown in the middle (e.g. a `Text`); it can fade in with `titleAppearsAt`. */
  title?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  /**
   * The screen's scroll offset as an `Animated.Value` driven by a native
   * `Animated.event`. It reveals the scroll edge and the title on the UI thread.
   */
  scrollY?: Animated.Value;
  /** Scroll offset at which the title has faded in (e.g. under a large title). */
  titleAppearsAt?: number;
  /**
   * The band behind the buttons when content scrolls under them.
   * - `auto`: iOS 26 extends the system scroll edge of the scroll view under
   *   the header down behind it (native, exact); elsewhere `fade`.
   * - `fade`: the page colour under the status bar, fading out below the
   *   buttons. Costs nothing per frame.
   * - `blur`: a glass band that blurs the content and fades out. Closer to
   *   iOS, but it samples the page on every scroll frame (about 7 ms a frame
   *   on a mid-range Android phone), so it is opt-in.
   * @default 'auto'
   */
  edge?: 'auto' | 'fade' | 'blur' | 'none';
  /** `blur` edge: blur radius in points / dp. @default 24 */
  edgeBlurRadius?: number;
  /** `fade` and `blur` edges: 0 (invisible) to 1 (full). @default 1 */
  edgeStrength?: number;
  /** `fade` and `blur` edges: how far the band reaches below the buttons. @default 28 */
  edgeHeight?: number;
  /**
   * Header buttons closer than this melt together (GlassGroupV2), like the
   * grouped buttons of an iOS 26 toolbar. @default 0
   */
  spacing?: number;
  colorScheme?: LiquidColorSchemeSetting;
  reduceTransparency?: 'system' | 'on' | 'off';
  style?: StyleProp<ViewStyle>;
};

/**
 * A floating iOS 26 header: glass buttons over the page, no bar behind them
 * until content scrolls under them.
 */
export const GlassHeaderV2 = memo(function GlassHeaderV2Impl({
  title,
  left,
  right,
  scrollY,
  titleAppearsAt,
  edge = 'auto',
  edgeBlurRadius = 24,
  edgeStrength = 1,
  edgeHeight = EDGE_FADE,
  spacing = 0,
  colorScheme = 'system',
  reduceTransparency = 'system',
  style,
}: GlassHeaderV2Props) {
  const insets = useSafeAreaInsets();
  const dark = useLiquidColorScheme(colorScheme) === 'dark';
  const height = insets.top + GLASS_HEADER_V2_HEIGHT;
  const bandHeight = height + Math.max(edgeHeight, 0);
  const strength = Math.min(Math.max(edgeStrength, 0), 1);
  const systemEdge = edge === 'auto' && Platform.OS === 'ios';
  const band =
    edge === 'blur' || edge === 'fade'
      ? edge
      : edge === 'auto' && !systemEdge
        ? 'fade'
        : null;
  // Solid to just under the buttons, then gone at the bottom of the band.
  const solidUntil = Math.round(((height - 8) / bandHeight) * 100);

  // A fade, not a slide: Android's glass samples the page at its laid-out
  // position, so a moving band would blur the wrong strip.
  const bandOpacity = useMemo(
    () =>
      scrollY?.interpolate({
        inputRange: [0, EDGE_REVEAL],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    [scrollY]
  );
  const titleOpacity = useMemo(
    () =>
      scrollY != null && titleAppearsAt != null
        ? scrollY.interpolate({
            inputRange: [titleAppearsAt - 16, titleAppearsAt],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          })
        : 1,
    [scrollY, titleAppearsAt]
  );

  const opaque = reduceTransparency === 'on';
  return (
    <NativeLiquidScrollEdgeContainer
      extendScrollEdge={systemEdge}
      // The native view only looks for a scroll view while a key is set.
      screenKey={systemEdge ? 'glass-header-v2' : undefined}
      pointerEvents="box-none"
      style={[
        styles.container,
        { height: systemEdge ? height : bandHeight },
        style,
      ]}
    >
      {band != null ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            bandOpacity != null && { opacity: bandOpacity },
          ]}
        >
          {opaque ? (
            <View
              style={[
                styles.band,
                dark ? styles.opaqueDark : styles.opaqueLight,
                { height },
              ]}
            />
          ) : band === 'fade' ? (
            <View
              style={[
                styles.band,
                {
                  height: bandHeight,
                  backgroundImage: `linear-gradient(to bottom, ${
                    dark
                      ? `rgba(0, 0, 0, ${0.82 * strength})`
                      : `rgba(242, 242, 247, ${0.86 * strength})`
                  } ${solidUntil}%, transparent 100%)`,
                },
              ]}
            />
          ) : (
            // One glass layer: no lens, rim or shadow, fading into the page.
            <LiquidGlassView
              glassStyle="regular"
              colorScheme={colorScheme}
              // Strong enough that text under the buttons stops reading, as
              // on iOS, then it fades out with the band.
              blurRadius={edgeBlurRadius}
              highlight={false}
              shadow={false}
              refractionHeight={0}
              refractionAmount={0}
              tintColor={
                dark
                  ? `rgba(0, 0, 0, ${0.35 * strength})`
                  : `rgba(255, 255, 255, ${0.55 * strength})`
              }
              fadeBottom={Math.max(edgeHeight, 0) + 12}
              fadeCurve="ease"
              style={[styles.band, { height: bandHeight, opacity: strength }]}
            />
          )}
        </Animated.View>
      ) : null}
      <GlassGroupV2
        pointerEvents="box-none"
        spacing={spacing}
        colorScheme={colorScheme}
        reduceTransparency={reduceTransparency}
        style={[
          styles.row,
          {
            marginTop: insets.top,
            paddingLeft: 16 + insets.left,
            paddingRight: 16 + insets.right,
          },
        ]}
      >
        <View pointerEvents="box-none" style={styles.side}>
          {left}
        </View>
        <Animated.View
          pointerEvents="box-none"
          style={[styles.title, { opacity: titleOpacity }]}
        >
          {title}
        </Animated.View>
        <View pointerEvents="box-none" style={[styles.side, styles.end]}>
          {right}
        </View>
      </GlassGroupV2>
    </NativeLiquidScrollEdgeContainer>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  opaqueDark: {
    backgroundColor: '#1C1C1E',
  },
  opaqueLight: {
    backgroundColor: '#F7F7F9',
  },
  row: {
    height: GLASS_HEADER_V2_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  end: {
    justifyContent: 'flex-end',
  },
  title: {
    flexShrink: 1,
    alignItems: 'center',
  },
});
