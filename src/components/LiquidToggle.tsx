import {
  StyleSheet,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { NativeLiquidSwitch } from '../NativeLiquidGlass';
import type { LiquidColorSchemeSetting } from '../theme';

export type LiquidToggleProps = {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  /** Track color when the toggle is on. Defaults to system green. */
  onTintColor?: ColorValue;
  colorScheme?: LiquidColorSchemeSetting;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Liquid Glass switch, animated natively: `UISwitch` on iOS 26 and a
 * Compose glass lens (AndroidLiquidGlass) on Android. Pressing lifts the thumb
 * into a glass lens that slides over the track, stretches with its speed and
 * settles back into a solid thumb. The thumb can also be dragged.
 */
export function LiquidToggle({
  value,
  onValueChange,
  disabled,
  onTintColor,
  colorScheme = 'system',
  style,
  accessibilityLabel,
  testID,
}: LiquidToggleProps) {
  return (
    <NativeLiquidSwitch
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      value={value}
      disabled={disabled}
      onTintColor={onTintColor}
      colorScheme={colorScheme}
      onValueChange={(event) => onValueChange?.(event.nativeEvent.value)}
      style={[styles.toggle, style]}
    />
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: 64,
    height: 32,
  },
});
