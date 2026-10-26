import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { NativeLiquidSearch } from '../NativeLiquidGlass';
import type { LiquidGlassStyle } from '../LiquidGlassView';
import type { LiquidColorSchemeSetting } from '../theme';

export type LiquidExpandableSearchProps = {
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
   * Content shown next to the search button while collapsed, such as a title
   * and other buttons. It fades out as the field expands.
   */
  children?: ReactNode;
  /** Height of the button and the field. @default 44 */
  height?: number;
  glassStyle?: LiquidGlassStyle;
  glassTintColor?: ColorValue;
  colorScheme?: LiquidColorSchemeSetting;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A round glass search button that morphs into a search field with a
 * separate close button, animated natively. On iOS 26 the field and the close
 * button share a glass container, so the glass stretches between them as they
 * separate.
 */
export function LiquidExpandableSearch({
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search',
  children,
  height = 44,
  glassStyle = 'regular',
  glassTintColor,
  colorScheme = 'system',
  style,
  testID,
}: LiquidExpandableSearchProps) {
  const [ownExpanded, setOwnExpanded] = useState(defaultExpanded);
  const [ownText, setOwnText] = useState('');
  const isExpanded = expanded ?? ownExpanded;
  const text = value ?? ownText;

  return (
    <NativeLiquidSearch
      testID={testID}
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
      // Children are laid out next to the button, not under it.
      style={[
        styles.container,
        { height, paddingRight: height + SEARCH_GAP },
        style,
      ]}
    >
      {children}
    </NativeLiquidSearch>
  );
}

// Distance between the expanded field and its close button, as in the native views.
const SEARCH_GAP = 16;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
