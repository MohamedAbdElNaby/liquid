import {
  StyleSheet,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { NativeLiquidSlider } from '../NativeLiquidGlass';
import type { LiquidColorSchemeSetting } from '../theme';

export type LiquidSliderProps = {
  value: number;
  /** @default 0 */
  minimumValue?: number;
  /** @default 1 */
  maximumValue?: number;
  /** Snaps the value to multiples of `step`. `0` means continuous. @default 0 */
  step?: number;
  onValueChange?: (value: number) => void;
  onSlidingStart?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  disabled?: boolean;
  /** Color of the filled part of the track. */
  tintColor?: ColorValue;
  colorScheme?: LiquidColorSchemeSetting;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Liquid Glass slider, animated natively: `UISlider` on iOS 26 and a Compose
 * glass lens (AndroidLiquidGlass) on Android. Dragging lifts the thumb into a
 * glass lens that shows the track through it.
 */
export function LiquidSlider({
  value,
  minimumValue = 0,
  maximumValue = 1,
  step = 0,
  onValueChange,
  onSlidingStart,
  onSlidingComplete,
  disabled,
  tintColor,
  colorScheme = 'system',
  style,
  accessibilityLabel,
  testID,
}: LiquidSliderProps) {
  return (
    <NativeLiquidSlider
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: minimumValue, max: maximumValue, now: value }}
      testID={testID}
      value={value}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      disabled={disabled}
      minimumTrackTintColor={tintColor}
      colorScheme={colorScheme}
      onValueChange={(event) => onValueChange?.(event.nativeEvent.value)}
      onSlidingStart={(event) => onSlidingStart?.(event.nativeEvent.value)}
      onSlidingComplete={(event) =>
        onSlidingComplete?.(event.nativeEvent.value)
      }
      style={[styles.slider, style]}
    />
  );
}

const styles = StyleSheet.create({
  slider: {
    height: 36,
  },
});
