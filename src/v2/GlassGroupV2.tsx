import { createContext, memo, useContext } from 'react';
import { Platform, type ViewProps } from 'react-native';
import {
  NativeLiquidGlassContainerView,
  NativeLiquidGlassGroupV2,
} from '../NativeLiquidGlass';
import type { LiquidColorSchemeSetting } from '../theme';

const GroupContext = createContext(false);

/** Whether a v2 shape is drawn by an enclosing GlassGroupV2 (Android). */
export function useInGlassGroupV2() {
  return useContext(GroupContext);
}

export type GlassGroupV2Props = ViewProps & {
  /**
   * Glass closer than this (points / dp) melts into its neighbours, and pulls
   * apart again as it moves away: animate the children's position or size to
   * morph them. 0 keeps every shape separate (still one pass on Android).
   * @default 0
   */
  spacing?: number;
  /** Android: the material of the whole group. @default 'system' */
  colorScheme?: LiquidColorSchemeSetting;
  /** Android: @default 'regular' */
  variant?: 'regular' | 'clear';
  /** Android: @default 'system' */
  reduceTransparency?: 'system' | 'on' | 'off';
  /**
   * 0 = regular to 1 = clear. Android: continuous (less blur and frost).
   * iOS: the nearer system style. Overrides `variant`.
   */
  clarity?: number;
  /** Android: how strongly the page bends at the rim, 0 to 1. @default 1 */
  refraction?: number;
  /** Android: brightness of the lit rim, 0 to 1. @default 1 */
  shine?: number;
};

/**
 * Groups v2 glass (GlassShapeV2, GlassButtonV2) so neighbours merge and morph
 * into each other, like an iOS 26 glass container. iOS: the system container
 * effect. Android: the group draws all its glass in one pass over one
 * backdrop (up to 8 shapes), which is also cheaper than separate glass.
 */
export const GlassGroupV2 = memo(function GlassGroupV2Impl({
  spacing = 0,
  colorScheme = 'system',
  variant = 'regular',
  reduceTransparency = 'system',
  clarity,
  refraction = 1,
  shine = 1,
  ...rest
}: GlassGroupV2Props) {
  if (Platform.OS === 'ios') {
    return <NativeLiquidGlassContainerView {...rest} spacing={spacing} />;
  }
  if (Platform.OS !== 'android') {
    return <NativeLiquidGlassGroupV2 {...rest} />;
  }
  return (
    <GroupContext.Provider value={true}>
      <NativeLiquidGlassGroupV2
        {...rest}
        spacing={spacing}
        colorScheme={colorScheme}
        glassStyle={variant}
        reduceTransparency={reduceTransparency}
        clarity={clarity ?? -1}
        refraction={refraction}
        shine={shine}
      />
    </GroupContext.Provider>
  );
});
