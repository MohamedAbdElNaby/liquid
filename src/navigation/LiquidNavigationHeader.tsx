import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiquidGlassContainer } from '../LiquidGlassView';
import { MorphGlass } from '../components/LiquidButton';
import { ChevronLeftIcon } from '../internal/icons';
import { useLiquidColors, type LiquidColorSchemeSetting } from '../theme';
import { LIQUID_HEADER_HEIGHT } from './LiquidHeader';

/** A glass button in the header: a circle for an icon, a capsule with a title. */
export type LiquidHeaderItem = {
  /**
   * Identifies the content. When the item in the same place changes key
   * between screens, its glass morphs and the content blurs across.
   * Defaults to the title.
   */
  key?: string;
  title?: string;
  icon?: ReactNode;
  /** Custom content that fills the circle, such as an avatar image. */
  content?: ReactNode;
  onPress?: () => void;
  /** Tints the glass, like a prominent compose button. */
  tintColor?: ColorValue;
  accessibilityLabel?: string;
  /**
   * Takes the free width of the bar, like a search field. Changing a circle
   * in the same place into a stretched item makes it stretch out.
   */
  stretch?: boolean;
};

export type LiquidNavigationHeaderOptions = {
  title?: string;
  /** Shows the title and this line in a glass capsule, like a chat header. */
  subtitle?: string;
  onTitlePress?: () => void;
  /** Shown on the left when there is no back button, e.g. Edit. */
  left?: LiquidHeaderItem;
  /** Glass buttons on the right, from left to right. */
  right?: LiquidHeaderItem[];
  /** Defaults to `navigation.canGoBack()`. */
  backButton?: boolean;
};

/** The parts of a React Navigation `navigation` object the header uses. */
export type LiquidHeaderNavigation = {
  canGoBack: () => boolean;
  goBack: () => void;
  isFocused: () => boolean;
  addListener: (event: 'focus' | 'blur', callback: () => void) => () => void;
};

type ActiveHeader = {
  id: string;
  options: LiquidNavigationHeaderOptions;
  back: boolean;
  goBack: () => void;
};

type HeaderStore = {
  show: (header: ActiveHeader) => void;
  hide: (id: string) => void;
};

const HeaderContext = createContext<HeaderStore | null>(null);

export type LiquidHeaderProviderProps = {
  children: ReactNode;
  colorScheme?: LiquidColorSchemeSetting;
  style?: StyleProp<ViewStyle>;
};

/**
 * Draws one floating glass header over a navigator, for screens that call
 * `useLiquidNavigationHeader`. The header stays on screen while screens are
 * pushed and popped, and its buttons morph between them like iOS 26: an
 * Edit capsule becomes the back button, two circles become one, and the
 * content blurs across.
 *
 * ```tsx
 * <LiquidHeaderProvider>
 *   <Stack.Navigator screenOptions={{ headerShown: false }}>…</Stack.Navigator>
 * </LiquidHeaderProvider>
 * ```
 */
export function LiquidHeaderProvider({
  children,
  colorScheme,
  style,
}: LiquidHeaderProviderProps) {
  const [active, setActive] = useState<ActiveHeader | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const store = useMemo<HeaderStore>(
    () => ({
      show: (header) => {
        if (hideTimer.current != null) {
          clearTimeout(hideTimer.current);
          hideTimer.current = null;
        }
        setActive(header);
      },
      hide: (id) => {
        // The next screen usually takes over in the same moment; wait a
        // little so the header morphs instead of disappearing in between.
        if (hideTimer.current != null) {
          clearTimeout(hideTimer.current);
        }
        hideTimer.current = setTimeout(() => {
          hideTimer.current = null;
          setActive((current) => (current?.id === id ? null : current));
        }, 80);
      },
    }),
    []
  );

  return (
    <HeaderContext.Provider value={store}>
      <View style={[styles.root, style]}>
        {children}
        <FloatingHeader header={active} colorScheme={colorScheme} />
      </View>
    </HeaderContext.Provider>
  );
}

/**
 * Shows the provider's floating header while this screen is focused.
 * Pass the screen's `navigation`. Pad the content with
 * `useLiquidHeaderHeight()`.
 */
export function useLiquidNavigationHeader(
  navigation: LiquidHeaderNavigation,
  options: LiquidNavigationHeaderOptions
) {
  const store = useContext(HeaderContext);
  if (store == null) {
    throw new Error(
      'useLiquidNavigationHeader must be used inside a LiquidHeaderProvider.'
    );
  }
  const id = useId();
  const latest = useRef(options);
  latest.current = options;
  const [focused, setFocused] = useState(() => navigation.isFocused());

  useEffect(() => {
    const focus = navigation.addListener('focus', () => setFocused(true));
    const blur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      focus();
      blur();
    };
  }, [navigation]);

  const show = useCallback(() => {
    store.show({
      id,
      options: latest.current,
      back: latest.current.backButton ?? navigation.canGoBack(),
      goBack: navigation.goBack,
    });
  }, [id, navigation, store]);

  // Re-shown whenever the options change while focused.
  useEffect(() => {
    if (focused) {
      show();
    }
  });

  useEffect(() => {
    if (!focused) {
      store.hide(id);
    }
    return () => store.hide(id);
  }, [focused, id, store]);
}

const SLOT_SIZE = 44;
/** Point of a button's exit where it has merged into its neighbour. */
const MERGED = 0.45;
/** Halfway into its neighbour, where a sliding drop is stretched most. */
const LIQUID_PEAK = (MERGED + 1) / 2;
const SLOT_GAP = 8;
/**
 * Glass closer than this fuses. Below the gap, so buttons rest apart and
 * melt together only when one slides into its neighbour.
 */
const MERGE_SPACING = 6;

function FloatingHeader({
  header,
  colorScheme,
}: {
  header: ActiveHeader | null;
  colorScheme?: LiquidColorSchemeSetting;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useLiquidColors(colorScheme);
  const options = header?.options;
  const right = options?.right ?? [];
  // Keeps a place for every button seen, so removed ones can animate out.
  // Buttons fill the places from the right: when there are fewer, the
  // outermost ones morph into the new buttons and the inner ones shrink away.
  const slotCount = useRef(0);
  slotCount.current = Math.max(slotCount.current, right.length);
  const firstSlot = slotCount.current - right.length;

  const left: LiquidHeaderItem | undefined = header?.back
    ? {
        key: 'liquid-back',
        icon: <ChevronLeftIcon color={colors.label} />,
        onPress: header.goBack,
        accessibilityLabel: 'Back',
      }
    : options?.left;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.header,
        { paddingTop: insets.top, height: insets.top + LIQUID_HEADER_HEIGHT },
      ]}
    >
      <View pointerEvents="box-none" style={styles.bar}>
        <Presence float>
          {left != null ? (
            <HeaderButton item={left} colorScheme={colorScheme} />
          ) : null}
        </Presence>
        <LiquidGlassContainer
          pointerEvents="box-none"
          spacing={MERGE_SPACING}
          style={styles.right}
        >
          {Array.from({ length: slotCount.current }, (_, i) => {
            const item = right[i - firstSlot];
            return (
              <Presence
                key={i}
                style={[
                  styles.rightSlot,
                  item?.stretch ? styles.stretchSlot : null,
                ]}
                // Every button but the outermost slides into its right-hand
                // neighbour as it goes, so their glass melts together.
                slide={i < slotCount.current - 1 ? SLOT_SIZE + SLOT_GAP : 0}
              >
                {item != null ? (
                  <HeaderButton item={item} colorScheme={colorScheme} />
                ) : null}
              </Presence>
            );
          })}
        </LiquidGlassContainer>
      </View>
      <View
        pointerEvents="box-none"
        style={[styles.titleLayer, { top: insets.top }]}
      >
        <Presence>
          {options?.subtitle != null ? (
            <MorphGlass
              colorScheme={colorScheme}
              cornerRadius={SLOT_SIZE / 2}
              contentKey={`${options.title}\n${options.subtitle}`}
              onPress={options.onTitlePress}
              accessibilityRole="header"
              contentStyle={styles.titleCapsule}
            >
              <Text
                numberOfLines={1}
                style={[styles.capsuleTitle, { color: colors.label }]}
              >
                {options.title}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.subtitle, { color: colors.secondaryLabel }]}
              >
                {options.subtitle}
              </Text>
            </MorphGlass>
          ) : null}
        </Presence>
        {options?.subtitle == null && options?.title != null ? (
          <FadeIn key={options.title}>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={[styles.title, { color: colors.label }]}
            >
              {options.title}
            </Text>
          </FadeIn>
        ) : null}
      </View>
    </View>
  );
}

function HeaderButton({
  item,
  colorScheme,
}: {
  item: LiquidHeaderItem;
  colorScheme?: LiquidColorSchemeSetting;
}) {
  const { colors } = useLiquidColors(colorScheme);
  const tinted = item.tintColor != null;
  const labelColor = tinted ? '#FFFFFF' : colors.label;

  return (
    <MorphGlass
      colorScheme={colorScheme}
      tintColor={item.tintColor}
      cornerRadius={SLOT_SIZE / 2}
      contentKey={item.key ?? item.title ?? ''}
      onPress={item.onPress}
      accessibilityLabel={item.accessibilityLabel ?? item.title}
      style={item.stretch ? styles.stretchSlot : undefined}
      contentStyle={[
        styles.button,
        item.title != null ? styles.capsule : null,
        item.stretch
          ? styles.stretched
          : item.content != null
            ? styles.filled
            : null,
      ]}
    >
      {item.content}
      {item.icon}
      {item.title != null ? (
        <Text
          numberOfLines={1}
          style={[
            styles.buttonTitle,
            { color: labelColor },
            item.icon != null ? styles.titleWithIcon : null,
          ]}
        >
          {item.title}
        </Text>
      ) : null}
    </MorphGlass>
  );
}

/**
 * Keeps its child on screen while it shrinks away after being removed, and
 * grows a new child in. The child itself stays mounted while it changes, so
 * its glass can morph. Only the scale animates: glass stops drawing under a
 * parent whose opacity changes.
 */
function Presence({
  children,
  style,
  slide = 0,
  float = false,
}: {
  children: ReactElement | null;
  style?: StyleProp<ViewStyle>;
  /**
   * Leaves the layout as soon as it starts to go, so its neighbours take the
   * space in the same motion instead of after it is gone.
   */
  float?: boolean;
  /** Horizontal distance the child moves while hidden. */
  slide?: number;
}) {
  const visible = children != null;
  const liquid = Platform.OS === 'android' && slide !== 0;
  const last = useRef(children);
  if (children != null) {
    last.current = children;
  }
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
    Animated.spring(progress, {
      toValue: visible ? 1 : 0,
      // Slower on Android, so the stretching drop can be seen.
      stiffness: liquid ? 130 : 200,
      damping: liquid ? 22 : 26,
      mass: 1,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
      }
    });
  }, [visible, progress, liquid]);

  if (!visible && !mounted) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[
        style,
        float && !visible ? styles.floating : null,
        {
          transform: [
            // First it slides into its neighbour at full size, so their
            // glass visibly melts together, then the merged drop shrinks.
            {
              translateX: progress.interpolate({
                inputRange: [MERGED, 1],
                outputRange: [slide, 0],
                extrapolate: 'clamp',
              }),
            },
            // Android glass can't fuse two shapes, so a sliding drop
            // stretches along its path and squeezes, like liquid pulled into
            // its neighbour.
            {
              scaleX: progress.interpolate({
                inputRange: [0, MERGED, 0.6, LIQUID_PEAK, 0.92, 1],
                outputRange: liquid
                  ? [0.01, 0.92, 1.5, 1.6, 1.2, 1]
                  : [0.01, 0.92, 0.94, 0.96, 0.99, 1],
                extrapolate: 'clamp',
              }),
            },
            {
              scaleY: progress.interpolate({
                inputRange: [0, MERGED, 0.6, LIQUID_PEAK, 0.92, 1],
                outputRange: liquid
                  ? [0.01, 0.92, 0.8, 0.74, 0.9, 1]
                  : [0.01, 0.92, 0.94, 0.96, 0.99, 1],
                extrapolate: 'clamp',
              }),
            },
          ],
        },
      ]}
    >
      {children ?? last.current}
    </Animated.View>
  );
}

function FadeIn({ children }: { children: ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        opacity: progress,
        transform: [
          {
            scale: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.92, 1],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bar: {
    height: LIQUID_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  right: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  rightSlot: {
    marginLeft: SLOT_GAP,
  },
  stretchSlot: {
    flex: 1,
  },
  floating: {
    position: 'absolute',
    left: 16,
  },
  stretched: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 14,
  },
  titleLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: LIQUID_HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  titleCapsule: {
    height: SLOT_SIZE,
    maxWidth: 220,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  button: {
    minWidth: SLOT_SIZE,
    height: SLOT_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsule: {
    paddingHorizontal: 16,
  },
  filled: {
    width: SLOT_SIZE,
    borderRadius: SLOT_SIZE / 2,
    overflow: 'hidden',
  },
  buttonTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  titleWithIcon: {
    marginLeft: 6,
  },
});
