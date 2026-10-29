import { useState } from 'react';
import {
  Alert,
  DevSettings,
  I18nManager,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LiquidSegmentedControl } from '@mohamed_abd_elnaby/react-native-liquid';

/**
 * Switches the app between left-to-right and right-to-left layout. React
 * Native applies the direction on the next launch, so this reloads the app
 * (debug builds) or asks for a restart (release builds).
 */
export function DirectionSwitch({ style }: { style?: StyleProp<ViewStyle> }) {
  const [rtl, setRtl] = useState(I18nManager.isRTL);

  const select = (index: number) => {
    const next = index === 1;
    if (next === I18nManager.isRTL) {
      return;
    }
    setRtl(next);
    I18nManager.allowRTL(next);
    I18nManager.forceRTL(next);
    if (__DEV__) {
      DevSettings.reload();
    } else {
      Alert.alert(
        'Restart the app',
        'The new direction applies on the next launch.',
      );
    }
  };

  return (
    <LiquidSegmentedControl
      segments={['LTR', 'RTL']}
      selectedIndex={rtl ? 1 : 0}
      onChange={select}
      style={style}
    />
  );
}
