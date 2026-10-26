import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type ColorValue,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LiquidGlassView, type LiquidGlassStyle } from '../LiquidGlassView';
import { SelectionPill } from '../internal/SelectionPill';
import { useSpringValue } from '../internal/animations';
import { useLiquidColors, type LiquidColorSchemeSetting } from '../theme';

export type LiquidSegmentedControlProps = {
  segments: string[];
  selectedIndex: number;
  onChange?: (index: number) => void;
  /** @default 36 */
  height?: number;
  glassStyle?: LiquidGlassStyle;
  colorScheme?: LiquidColorSchemeSetting;
  /** Text color of the selected segment. */
  activeTintColor?: ColorValue;
  /** Text color of the other segments. */
  inactiveTintColor?: ColorValue;
  /** Color of the sliding selection pill. */
  selectionColor?: ColorValue;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
};

const INSET = 3;

export function LiquidSegmentedControl({
  segments,
  selectedIndex,
  onChange,
  height = 36,
  glassStyle,
  colorScheme,
  activeTintColor,
  inactiveTintColor,
  selectionColor,
  disabled,
  style,
  textStyle,
  testID,
}: LiquidSegmentedControlProps) {
  const { colors } = useLiquidColors(colorScheme);
  const [width, setWidth] = useState(0);
  const index = useSpringValue(selectedIndex);
  const itemWidth = segments.length > 0 ? width / segments.length : 0;

  return (
    <LiquidGlassView
      accessibilityRole="tablist"
      testID={testID}
      glassStyle={glassStyle}
      colorScheme={colorScheme}
      cornerRadius={height / 2}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[
        styles.container,
        { height },
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <SelectionPill
        index={index}
        itemWidth={itemWidth}
        height={height}
        inset={INSET}
        color={selectionColor ?? colors.selection}
      />
      {segments.map((segment, i) => {
        const selected = i === selectedIndex;

        return (
          <Pressable
            key={`${segment}-${i}`}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => {
              if (!selected) {
                onChange?.(i);
              }
            }}
            style={styles.segment}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: selected
                    ? (activeTintColor ?? colors.label)
                    : (inactiveTintColor ?? colors.secondaryLabel),
                },
                selected ? styles.selectedLabel : null,
                textStyle,
              ]}
            >
              {segment}
            </Text>
          </Pressable>
        );
      })}
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedLabel: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.45,
  },
});
