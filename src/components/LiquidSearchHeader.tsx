import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { NativeLiquidSearch } from '../NativeLiquidGlass';
import type { LiquidGlassStyle } from '../LiquidGlassView';
import type { LiquidColorSchemeSetting } from '../theme';

export type LiquidSearchHeaderProps = {
  /** Controls the state. Leave undefined to let the component manage it. */
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  /** @default 'Search' */
  placeholder?: string;
  /**
   * The header row above the field, such as a title between two buttons. It
   * fades up and away while searching.
   */
  children?: ReactNode;
  /** Height of the header row. @default 52 */
  headerHeight?: number;
  /** Height of the field and the close button. @default 44 */
  fieldHeight?: number;
  glassStyle?: LiquidGlassStyle;
  glassTintColor?: ColorValue;
  colorScheme?: LiquidColorSchemeSetting;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A header row with a full-width glass search field under it, like the
 * Contacts screen of Telegram on iOS 26. Tapping the field raises it into the
 * header row while the row fades away and a close button slides in, all
 * animated natively. The content below moves up with it.
 *
 * To hide a floating tab bar while searching, set
 * `tabBarStyle: { display: 'none' }` from `onExpandedChange`.
 */
export function LiquidSearchHeader({
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search',
  children,
  headerHeight = 52,
  fieldHeight = 44,
  glassStyle = 'regular',
  glassTintColor,
  colorScheme = 'system',
  style,
  testID,
}: LiquidSearchHeaderProps) {
  const [ownExpanded, setOwnExpanded] = useState(defaultExpanded);
  const [ownText, setOwnText] = useState('');
  const isExpanded = expanded ?? ownExpanded;
  const text = value ?? ownText;
  const restingHeight = headerHeight + fieldHeight + FIELD_BOTTOM_SPACE;

  // The content below follows the field as the header shrinks. Only the
  // height animates; the native view keeps its resting size.
  const progress = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(progress, {
      toValue: isExpanded ? 1 : 0,
      ...FIELD_SPRING,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, progress]);

  return (
    <Animated.View
      style={[
        {
          height: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [restingHeight, headerHeight],
          }),
        },
        style,
      ]}
    >
      <NativeLiquidSearch
        testID={testID}
        variant="bar"
        headerHeight={headerHeight}
        fieldHeight={fieldHeight}
        expanded={isExpanded}
        placeholder={placeholder}
        text={text}
        glassStyle={glassStyle}
        glassTintColor={glassTintColor}
        colorScheme={colorScheme}
        onExpandedChange={(event) => {
          const next = event.nativeEvent.expanded;
          if (expanded === undefined) {
            setOwnExpanded(next);
          }
          onExpandedChange?.(next);
        }}
        onChangeText={(event) => {
          const next = event.nativeEvent.text;
          if (value === undefined) {
            setOwnText(next);
          }
          onChangeText?.(next);
        }}
        onSearchSubmit={(event) => onSubmit?.(event.nativeEvent.text)}
        style={{ height: restingHeight }}
      >
        <View style={[styles.row, { height: headerHeight }]}>{children}</View>
      </NativeLiquidSearch>
    </Animated.View>
  );
}

// Space under the resting field, as in the native view.
const FIELD_BOTTOM_SPACE = 8;

// The native field's spring (0.42 s, bounce 0.08) as stiffness and damping.
const FIELD_SPRING = { stiffness: 224, damping: 27.5, mass: 1 };

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
