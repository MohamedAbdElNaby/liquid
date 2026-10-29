import {
  Animated,
  I18nManager,
  StyleSheet,
  type ColorValue,
} from 'react-native';

type Props = {
  /** Animated index of the selected item (may be fractional while swiping). */
  index: Animated.Value | Animated.AnimatedInterpolation<number>;
  itemWidth: number;
  height: number;
  inset: number;
  color: ColorValue;
};

/** The highlight that slides behind the selected tab or segment. */
export function SelectionPill({
  index,
  itemWidth,
  height,
  inset,
  color,
}: Props) {
  if (itemWidth <= 0) {
    return null;
  }

  const pillHeight = height - inset * 2;
  // `left` becomes `right` in right-to-left layout, but transforms don't flip.
  const translateX = Animated.multiply(
    Animated.add(Animated.multiply(index, itemWidth), inset),
    I18nManager.isRTL ? -1 : 1
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pill,
        {
          top: inset,
          width: itemWidth - inset * 2,
          height: pillHeight,
          borderRadius: pillHeight / 2,
          backgroundColor: color,
          transform: [{ translateX }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    left: 0,
  },
});
