import { useMemo, type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { NativeLiquidMenu } from '../NativeLiquidGlass';
import type { LiquidGlassStyle } from '../LiquidGlassView';
import type { LiquidColorSchemeSetting } from '../theme';

export type LiquidMenuItem = {
  /** Identifies the item in `onSelect`. Defaults to the title. */
  id?: string;
  title: string;
  subtitle?: string;
  /** iOS: SF Symbol name shown next to the title. */
  systemImage?: string;
  destructive?: boolean;
  disabled?: boolean;
  /** Shows a checkmark. */
  checked?: boolean;
  onPress?: () => void;
  /** Turns the item into a submenu that expands inside the menu. */
  children?: LiquidMenuItem[];
  /** iOS: shows the children as an inline section instead of a submenu. */
  inline?: boolean;
};

export type LiquidMenuProps = {
  items: LiquidMenuItem[];
  /** Title shown at the top of the menu. */
  title?: string;
  /** Content of the glass button, usually an icon or an avatar. */
  children?: ReactNode;
  /** Diameter of the button when `style` sets no size. @default 44 */
  size?: number;
  /** Android: width of the menu. @default 250 */
  menuWidth?: number;
  /**
   * Draws no glass behind the trigger, for a menu button placed inside
   * another glass view such as a toolbar capsule.
   * @default false
   */
  bare?: boolean;
  glassStyle?: LiquidGlassStyle;
  colorScheme?: LiquidColorSchemeSetting;
  onSelect?: (id: string) => void;
  onOpenChange?: (open: boolean) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
};

type SerializedItem = Omit<LiquidMenuItem, 'onPress' | 'children'> & {
  id: string;
  children?: SerializedItem[];
};

function serialize(
  items: LiquidMenuItem[],
  handlers: Map<string, () => void>,
  prefix = ''
) {
  return items.map((item, index): SerializedItem => {
    const id = item.id ?? `${prefix}${index}:${item.title}`;
    if (item.onPress) {
      handlers.set(id, item.onPress);
    }
    return {
      id,
      title: item.title,
      subtitle: item.subtitle,
      systemImage: item.systemImage,
      destructive: item.destructive,
      disabled: item.disabled,
      checked: item.checked,
      inline: item.inline,
      children: item.children
        ? serialize(item.children, handlers, `${id}/`)
        : undefined,
    };
  });
}

/**
 * A glass button whose glass morphs into a menu, animated natively. On iOS it
 * is the system button menu (iOS 26 morphs the button into the menu and
 * expands submenus in place); on Android the glass panel grows out of the
 * button with spring physics and submenus expand inline.
 */
export function LiquidMenu({
  items,
  title,
  children,
  size = 44,
  menuWidth = 250,
  bare = false,
  glassStyle = 'regular',
  colorScheme = 'system',
  onSelect,
  onOpenChange,
  style,
  accessibilityLabel,
  testID,
}: LiquidMenuProps) {
  const { json, handlers } = useMemo(() => {
    const map = new Map<string, () => void>();
    return { json: JSON.stringify(serialize(items, map)), handlers: map };
  }, [items]);

  return (
    <NativeLiquidMenu
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      items={json}
      title={title}
      menuWidth={menuWidth}
      bare={bare}
      glassStyle={glassStyle}
      colorScheme={colorScheme}
      onItemSelect={(event) => {
        const id = event.nativeEvent.id;
        handlers.get(id)?.();
        onSelect?.(id);
      }}
      onOpenChange={(event) => onOpenChange?.(event.nativeEvent.open)}
      style={[styles.button, { width: size, height: size }, style]}
    >
      {children}
    </NativeLiquidMenu>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
