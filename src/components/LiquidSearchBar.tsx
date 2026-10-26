import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { LiquidGlassView, type LiquidGlassStyle } from '../LiquidGlassView';
import { ClearIcon, SearchIcon } from '../internal/icons';
import { useLiquidColors, type LiquidColorSchemeSetting } from '../theme';

export type LiquidSearchBarProps = Omit<TextInputProps, 'style'> & {
  glassStyle?: LiquidGlassStyle;
  colorScheme?: LiquidColorSchemeSetting;
  /** @default 44 */
  height?: number;
  /** Style of the glass capsule. */
  style?: StyleProp<ViewStyle>;
  /** Style of the text input. */
  inputStyle?: TextInputProps['style'];
  /** Called after the clear button empties the field. */
  onClear?: () => void;
};

export function LiquidSearchBar({
  glassStyle,
  colorScheme,
  height = 44,
  style,
  inputStyle,
  onClear,
  value,
  defaultValue,
  onChangeText,
  placeholder = 'Search',
  ...rest
}: LiquidSearchBarProps) {
  const { colors } = useLiquidColors(colorScheme);
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '');
  const text = value ?? uncontrolled;

  const change = (next: string) => {
    if (value === undefined) {
      setUncontrolled(next);
    }
    onChangeText?.(next);
  };

  return (
    <LiquidGlassView
      glassStyle={glassStyle}
      colorScheme={colorScheme}
      cornerRadius={height / 2}
      style={[
        styles.container,
        { height, paddingHorizontal: height / 3 },
        style,
      ]}
    >
      <SearchIcon color={colors.secondaryLabel} />
      <TextInput
        returnKeyType="search"
        clearButtonMode="never"
        placeholderTextColor={colors.secondaryLabel}
        selectionColor={colors.tint}
        {...rest}
        placeholder={placeholder}
        value={text}
        onChangeText={change}
        style={[styles.input, { color: colors.label }, inputStyle]}
      />
      {text.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear text"
          hitSlop={10}
          onPress={() => {
            change('');
            onClear?.();
          }}
        >
          <ClearIcon color={colors.secondaryLabel} background={colors.thumb} />
        </Pressable>
      ) : null}
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 17,
    marginHorizontal: 8,
    paddingVertical: 0,
  },
});
