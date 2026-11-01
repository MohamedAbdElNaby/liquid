import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { LiquidSlider } from '@mohamed_abd_elnaby/react-native-liquid';

export type GlassLook = { clarity: number; refraction: number; shine: number };

export const DEFAULT_GLASS_LOOK: GlassLook = {
  clarity: 0,
  refraction: 1,
  shine: 1,
};

export function useGlassLook() {
  return useState<GlassLook>(DEFAULT_GLASS_LOOK);
}

type SetLook = (update: (look: GlassLook) => GlassLook) => void;

/**
 * Sliders for the v2 glass material: Regular ↔ Clear, refraction and shine.
 * Android draws every value; iOS's system glass has only regular and clear,
 * so there the first slider snaps and the other two have no effect.
 */
export function GlassControls({
  look,
  onChange,
  scheme,
  color,
}: {
  look: GlassLook;
  /** A state setter: each slider updates only its own field. */
  onChange: SetLook;
  scheme: 'light' | 'dark';
  color: string;
}) {
  const ios = Platform.OS === 'ios';
  const setClarity = useCallback(
    (clarity: number) => onChange(prev => ({ ...prev, clarity })),
    [onChange],
  );
  const setRefraction = useCallback(
    (refraction: number) => onChange(prev => ({ ...prev, refraction })),
    [onChange],
  );
  const setShine = useCallback(
    (shine: number) => onChange(prev => ({ ...prev, shine })),
    [onChange],
  );
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color }]}>
        Regular ↔ Clear{' '}
        {ios
          ? look.clarity >= 0.5
            ? '(clear)'
            : '(regular)'
          : `${Math.round(look.clarity * 100)}%`}
      </Text>
      <LiquidSlider
        value={look.clarity}
        minimumValue={0}
        maximumValue={1}
        onValueChange={setClarity}
        colorScheme={scheme}
        accessibilityLabel="Regular to clear glass"
      />
      <Text style={[styles.label, { color }]}>
        Refraction {Math.round(look.refraction * 100)}%
        {ios ? ' (Android only)' : ''}
      </Text>
      <LiquidSlider
        value={look.refraction}
        minimumValue={0}
        maximumValue={1}
        onValueChange={setRefraction}
        colorScheme={scheme}
        accessibilityLabel="Refraction"
      />
      <Text style={[styles.label, { color }]}>
        Shine {Math.round(look.shine * 100)}%{ios ? ' (Android only)' : ''}
      </Text>
      <LiquidSlider
        value={look.shine}
        minimumValue={0}
        maximumValue={1}
        onValueChange={setShine}
        colorScheme={scheme}
        accessibilityLabel="Shine"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
