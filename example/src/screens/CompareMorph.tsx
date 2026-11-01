import { useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import {
  GlassButtonV2,
  GlassGroupV2,
  GLASS_BUTTON_V2_SIZE,
  LiquidSlider,
} from '@mohamed_abd_elnaby/react-native-liquid';
import { ComposeIcon, PlusIcon, SearchIcon } from '../HeaderIcons';
import { MorphToolbar } from './MorphToolbar';

type Props = {
  scheme: 'light' | 'dark';
  reduceTransparency: 'system' | 'on';
  label: string;
};

const SIZE = GLASS_BUTTON_V2_SIZE;
const STEP = SIZE + 12;

/**
 * Glass that merges and pulls apart: v1's morphing toolbar, then v2 groups
 * (GlassGroupV2) where buttons slide out of one another or move together.
 */
export function CompareMorph({ scheme, reduceTransparency, label }: Props) {
  const [spacing, setSpacing] = useState(10);
  const [gap, setGap] = useState(24);
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    Animated.spring(progress, {
      toValue: next ? 1 : 0,
      stiffness: 220,
      damping: 22,
      mass: 1,
      useNativeDriver: true,
    }).start();
  };

  const actions = [
    { key: 'search', icon: <SearchIcon color={label} />, label: 'Search' },
    { key: 'compose', icon: <ComposeIcon color={label} />, label: 'Compose' },
    { key: 'add', icon: <PlusIcon color={label} />, label: 'Add' },
  ];
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={styles.wrap}>
      <Text style={[styles.chip, { color: label }]}>v1 · toolbar morph</Text>
      <View style={styles.v1}>
        <MorphToolbar />
      </View>

      <Text style={[styles.chip, { color: label }]}>v2 · slide out</Text>
      <GlassGroupV2
        spacing={spacing}
        colorScheme={scheme}
        reduceTransparency={reduceTransparency}
        style={styles.cluster}
      >
        {actions.map((action, i) => (
          <Animated.View
            key={action.key}
            pointerEvents={open ? 'auto' : 'none'}
            style={[
              styles.slot,
              {
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, (i + 1) * STEP],
                    }),
                  },
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <GlassButtonV2
              icon={
                // Hidden under the main button until the cluster opens.
                <Animated.View style={{ opacity: progress }}>
                  {action.icon}
                </Animated.View>
              }
              accessibilityLabel={action.label}
              colorScheme={scheme}
              reduceTransparency={reduceTransparency}
            />
          </Animated.View>
        ))}
        <View style={styles.slot}>
          <GlassButtonV2
            icon={
              <Animated.View style={{ transform: [{ rotate }] }}>
                <PlusIcon color="#FFFFFF" />
              </Animated.View>
            }
            tintColor="#0A84FF"
            accessibilityLabel={open ? 'Close actions' : 'Show actions'}
            onPress={toggle}
            colorScheme={scheme}
            reduceTransparency={reduceTransparency}
          />
        </View>
      </GlassGroupV2>

      <Text style={[styles.chip, { color: label }]}>v2 · move together</Text>
      <GlassGroupV2
        spacing={spacing}
        colorScheme={scheme}
        reduceTransparency={reduceTransparency}
        style={styles.pair}
      >
        <GlassButtonV2
          title="Edit"
          colorScheme={scheme}
          reduceTransparency={reduceTransparency}
        />
        <View style={{ width: gap }} />
        <GlassButtonV2
          icon={<PlusIcon color={label} />}
          accessibilityLabel="Add"
          colorScheme={scheme}
          reduceTransparency={reduceTransparency}
        />
      </GlassGroupV2>

      <Text style={[styles.sliderLabel, { color: label }]}>
        Gap {Math.round(gap)}
      </Text>
      <LiquidSlider
        value={gap}
        minimumValue={0}
        maximumValue={60}
        onValueChange={setGap}
        colorScheme={scheme}
        accessibilityLabel="Gap between the buttons"
      />
      <Text style={[styles.sliderLabel, { color: label }]}>
        Merge distance (spacing) {Math.round(spacing)}
      </Text>
      <LiquidSlider
        value={spacing}
        minimumValue={0}
        maximumValue={40}
        onValueChange={setSpacing}
        colorScheme={scheme}
        accessibilityLabel="Merge distance"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 24,
    marginHorizontal: 16,
    gap: 10,
  },
  chip: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: 'rgba(128, 128, 128, 0.35)',
  },
  v1: {
    alignItems: 'flex-start',
  },
  cluster: {
    height: SIZE + 8,
    width: SIZE + 3 * STEP + 8,
  },
  slot: {
    position: 'absolute',
    left: 4,
    top: 4,
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 4,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
});
