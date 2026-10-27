import type { ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export type LiquidStickyViewProps = {
  /** The content offset of the scroll view. */
  scrollY: Animated.Value;
  /** Where the view sits in the scroll content, from its top. */
  offset: number;
  /** Where it stops on screen, e.g. under a header. */
  pinTop: number;
  children: ReactNode;
  style?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
};

/**
 * Scrolls with the content, then stays under a header, like the Media and
 * Links control of a Telegram profile. Place it over the scroll view and
 * leave a gap of its height in the content at `offset`. Runs on the native
 * driver.
 */
export function LiquidStickyView({
  scrollY,
  offset,
  pinTop,
  children,
  style,
}: LiquidStickyViewProps) {
  const travel = Math.max(offset - pinTop, 1);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.sticky,
        {
          transform: [
            {
              translateY: scrollY.interpolate({
                inputRange: [0, travel],
                outputRange: [offset, offset - travel],
                extrapolateLeft: 'extend',
                extrapolateRight: 'clamp',
              }),
            },
          ],
        },
      ]}
    >
      {/* Its own view, so a transform in `style` can't replace the pinning. */}
      <Animated.View pointerEvents="box-none" style={style}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sticky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
