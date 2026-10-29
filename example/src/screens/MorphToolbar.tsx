import { useState } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme } from 'react-native';
import {
  LiquidGlassContainer,
  LiquidGlassView,
  LiquidMenu,
} from '@mohamed_abd_elnaby/react-native-liquid';

const SIZE = 44;

/**
 * Two glass buttons that morph into each other, like the Photos app toolbar:
 * [≡] [Select]  <->  [≡ •••] [✕]
 */
export function MorphToolbar() {
  const [selecting, setSelecting] = useState(false);
  const mode = useColorScheme() ?? 'light';

  return (
    // Spacing below the gap: the glass fuses only while the buttons morph.
    <LiquidGlassContainer spacing={8} style={styles.row}>
      <LiquidGlassView
        morph
        interactive
        colorScheme={mode}
        cornerRadius={SIZE / 2}
        style={[styles.glass, selecting ? styles.wide : styles.round]}
      >
        <Text style={styles.icon}>≡</Text>
        {selecting ? (
          <LiquidMenu
            bare
            colorScheme={mode}
            accessibilityLabel="More actions"
            items={[
              { title: 'Share', systemImage: 'square.and.arrow.up' },
              { title: 'Duplicate', systemImage: 'plus.square.on.square' },
              {
                title: 'Add to Album',
                systemImage: 'rectangle.stack.badge.plus',
              },
              { title: 'Delete', systemImage: 'trash', destructive: true },
            ]}
            style={styles.menu}
          >
            <Text style={styles.icon}>•••</Text>
          </LiquidMenu>
        ) : null}
      </LiquidGlassView>
      <LiquidGlassView
        morph
        interactive
        colorScheme={mode}
        cornerRadius={SIZE / 2}
        style={[styles.glass, selecting ? styles.round : styles.select]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setSelecting(value => !value)}
          style={styles.fill}
        >
          <Text style={selecting ? styles.icon : styles.label}>
            {selecting ? '✕' : 'Select'}
          </Text>
        </Pressable>
      </LiquidGlassView>
    </LiquidGlassContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
  },
  glass: {
    height: SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  round: {
    width: SIZE,
  },
  wide: {
    width: 104,
  },
  select: {
    width: 92,
  },
  menu: {
    width: 52,
    height: SIZE,
  },
  fill: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
