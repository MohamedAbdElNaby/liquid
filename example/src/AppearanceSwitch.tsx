import { useState } from 'react';
import { Appearance, type StyleProp, type ViewStyle } from 'react-native';
import { LiquidSegmentedControl } from '@mohamed_abd_elnaby/react-native-liquid';

const MODES = ['system', 'light', 'dark'] as const;
type Mode = (typeof MODES)[number];

// Kept outside the component so the choice survives the screen remounting.
let currentMode: Mode = 'system';

/**
 * Switches the whole app between the system theme, light and dark.
 *
 * `Appearance.setColorScheme` overrides the theme for the app, native views
 * included, so every Liquid component left on its default
 * `colorScheme="system"` follows it, as does `useColorScheme()`.
 */
export function AppearanceSwitch({ style }: { style?: StyleProp<ViewStyle> }) {
  const [mode, setMode] = useState<Mode>(currentMode);

  const select = (index: number) => {
    const next = MODES[index]!;
    currentMode = next;
    setMode(next);
    Appearance.setColorScheme(next === 'system' ? 'auto' : next);
  };

  return (
    <LiquidSegmentedControl
      segments={['System', 'Light', 'Dark']}
      selectedIndex={MODES.indexOf(mode)}
      onChange={select}
      style={style}
    />
  );
}
