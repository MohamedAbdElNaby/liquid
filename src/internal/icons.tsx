import { I18nManager, StyleSheet, View, type ColorValue } from 'react-native';

// Small glyphs drawn with views so the library has no icon dependency.

type IconProps = {
  color: ColorValue;
  size?: number;
};

export function ChevronLeftIcon({
  color,
  size = 20,
  mirrored = I18nManager.isRTL,
}: IconProps & {
  /** Points right, for a right-to-left layout. Defaults to `I18nManager`. */
  mirrored?: boolean;
}) {
  const arm = size * 0.55;

  return (
    // Points the other way in right-to-left layout, like the system back button.
    <View
      style={[
        styles.center,
        { width: size, height: size },
        mirrored ? styles.mirrored : null,
      ]}
    >
      <View
        style={{
          width: arm,
          height: arm,
          borderLeftWidth: 2.5,
          borderBottomWidth: 2.5,
          borderColor: color,
          borderBottomLeftRadius: 1.5,
          // A transform, not a margin: margins swap sides in right-to-left
          // layout, and the whole icon is already mirrored there.
          transform: [{ translateX: arm * 0.2 }, { rotate: '45deg' }],
        }}
      />
    </View>
  );
}

export function SearchIcon({ color, size = 18 }: IconProps) {
  const lens = size * 0.72;

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: lens,
          height: lens,
          borderRadius: lens / 2,
          borderWidth: 2,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.38,
          height: 2.2,
          borderRadius: 1.1,
          backgroundColor: color,
          right: -size * 0.02,
          bottom: size * 0.1,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

export function ClearIcon({
  color,
  background,
  size = 18,
}: IconProps & { background: ColorValue }) {
  const bar = {
    position: 'absolute' as const,
    width: size * 0.5,
    height: 1.8,
    borderRadius: 0.9,
    backgroundColor: background,
  };

  return (
    <View
      style={[
        styles.center,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    >
      <View style={[bar, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[bar, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
