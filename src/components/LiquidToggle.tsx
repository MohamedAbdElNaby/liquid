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
  /** Track color when the toggle is off. Defaults to a translucent gray. */
  offTintColor?: ColorValue;
  /** Color of the thumb at rest. Defaults to white. */
  thumbTintColor?: ColorValue;
  /** Tints the clear glass lens the thumb turns into while pressed. */
  lensTintColor?: ColorValue;
  colorScheme?: LiquidColorSchemeSetting;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Liquid Glass switch, animated natively (UIKit on iOS, Compose with
 * AndroidLiquidGlass on Android). Pressing turns the thumb into a clear glass
 * lens that grows past the track and refracts it, slides over while the track
 * fills with color, stretches with its speed and settles back into a solid
 * thumb. The thumb can also be dragged. Every part can be recolored.
 */
export function LiquidToggle({
  value,
  onValueChange,
  disabled,
  onTintColor,
  offTintColor,
  thumbTintColor,
  lensTintColor,
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
      offTintColor={offTintColor}
      thumbTintColor={thumbTintColor}
      lensTintColor={lensTintColor}
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
