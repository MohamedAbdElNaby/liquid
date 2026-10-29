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
  Easing,
  I18nManager,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiquidGlassContainer, LiquidGlassView } from '../LiquidGlassView';
import {
  NativeLiquidScrollEdge,
  NativeLiquidScrollEdgeContainer,
} from '../NativeLiquidGlass';
import { MorphGlass } from '../components/LiquidButton';
import {
  LiquidExpandableSearch,
  type LiquidExpandableSearchProps,
} from '../components/LiquidExpandableSearch';
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

/** The look of a glass shape in the header. */
export type LiquidHeaderGlass = {
  /** @default 'regular' */
  glassStyle?: 'regular' | 'clear';
  /** Pins the light or dark material. Defaults to the provider's. */
  colorScheme?: LiquidColorSchemeSetting;
  /** Tints the glass, e.g. `rgba(255, 255, 255, 0.3)` for a whiter frost. */
  tintColor?: ColorValue;
  /**
   * A specular rim along the edge, brightest on the top-left and bottom-right
   * curves like iOS 26 glass, so the edge reads on any background.
   */
  rimColor?: ColorValue;
  /** @default 1 */
  rimWidth?: number;
  /** iOS: how bright the rim stays along the sides, 0 to 1. @default 0.35 */
  rimSideOpacity?: number;
  /** The rim on the side away from the light, e.g. a faint dark line so the highlight reads on white. */
  rimShadeColor?: ColorValue;
  /** A hairline all round the glass under the rim, so the rim's light shines against an edge on white. */
  rimEdgeColor?: ColorValue;
  /** Where the rim shines: on the diagonal curves, or along the top and bottom edges. */
  rimGradient?: 'diagonal' | 'vertical';
  /** iOS: a soft white reflection across the top of the glass, 0 to 1. */
  sheenOpacity?: number;
  /** The iOS 26 light-glass edge: hairline, white glow inside the top, white line along the bottom. */
  specularEdge?: boolean;
  /** Android: how blurry the glass is, in dp (iOS glass has a fixed blur). */
  blurRadius?: number;
};

/**
 * Glass behind the header buttons, from the top of the screen down, that melts
 * into the content below (native `fadeBottom`, iOS and Android), like the
 * edge of iOS 26 Photos.
 */
export type LiquidHeaderEdgeGlass = {
  /** @default 'regular' */
  glassStyle?: 'regular' | 'clear';
  /** Defaults to the provider's. */
  colorScheme?: LiquidColorSchemeSetting;
  /** Tints the glass, e.g. a white frost or a dark dim. */
  tintColor?: ColorValue;
  /** Android: blur in dp. */
  blurRadius?: number;
  /** Height below the status bar. @default header height + 30 */
  height?: number;
  /** How many points at the bottom fade out. @default the whole height below the status bar */
  fadeHeight?: number;
};

export type LiquidNavigationHeaderOptions = {
  title?: string;
  /** Shows the title and this line in a glass capsule, like a chat header. */
  subtitle?: string;
  onTitlePress?: () => void;
  /** Shown on the left when there is no back button, e.g. Edit. */
  left?: LiquidHeaderItem;
  /**
   * Glass buttons on the right, from left to right. They fill the places
   * from the right edge. A `null` keeps its place empty instead, so the
   * buttons stay where they are: `[closeButton, null]` after pressing the
   * first of two buttons merges the second into it and puts the new button
   * where the pressed one was.
   */
  right?: (LiquidHeaderItem | null)[];
  /** Defaults to whether the screen can go back in a stack (not in tabs). */
  backButton?: boolean;
  /** Replaces the back button's chevron, e.g. your own icon. */
  backIcon?: ReactNode;
  /**
   * Replaces the title text, e.g. your own `Text` with the app's font. Use
   * `title` too when the title changes, so the capsule morphs across.
   */
  titleComponent?: ReactNode;
  /** Replaces the subtitle text, like `titleComponent`. */
  subtitleComponent?: ReactNode;
  /** Merged into the title text style: font family, weight, size, color. */
  titleStyle?: StyleProp<TextStyle>;
  /** Merged into the subtitle text style. */
  subtitleStyle?: StyleProp<TextStyle>;
  /**
   * `center` (default) puts the title in the middle of the bar. `leading`
   * puts it in a glass capsule right after the back (or `left`) button, in
   * the same glass: pressing one swells it into the other.
   */
  titlePosition?: 'center' | 'leading';
  /**
   * Draws a centered title in a glass capsule even without a subtitle.
   * A subtitle or `titlePosition: 'leading'` always use the capsule.
   */
  titleCapsule?: boolean;
  /**
   * Lines the title and subtitle up inside their capsule: `start` (the back
   * button's side), `center` (default) or `end`.
   */
  titleAlign?: 'start' | 'center' | 'end';
  /** The glass of every button and the title capsule in this header. */
  glass?: LiquidHeaderGlass;
  /** Overrides `glass` for the back button. */
  backGlass?: LiquidHeaderGlass;
  /**
   * Overrides `glass` for the title capsule, or `false` to draw the title
   * (and subtitle) as plain text with no glass behind it.
   */
  titleGlass?: LiquidHeaderGlass | false;
  /**
   * Drawn across the top of the screen behind the header buttons, e.g. your
   * own glass under the status bar. It covers the system's scroll edge
   * effect there; without it, that native effect shows.
   */
  edge?: ReactNode;
  /**
   * Built-in glass behind the buttons that melts into the content (`true` for
   * the defaults, or its options). Ignored when `edge` is given.
   */
  edgeGlass?: boolean | LiquidHeaderEdgeGlass;
  /**
   * A search circle at the trailing edge that morphs into a field with a
   * close button, like `LiquidExpandableSearch`. The other buttons and the
   * title fade out while searching.
   */
  search?: LiquidHeaderSearch;
};

export type LiquidHeaderSearch = Pick<
  LiquidExpandableSearchProps,
  | 'expanded'
  | 'onExpandedChange'
  | 'value'
  | 'onChangeText'
  | 'onSubmit'
  | 'placeholder'
>;

/** The parts of a React Navigation `navigation` object the header uses. */
export type LiquidHeaderNavigation = {
  canGoBack: () => boolean;
  goBack: () => void;
  isFocused: () => boolean;
  /**
   * `beforeRemove` tells a screen being popped from one being covered, so a
   * header with no header to morph into leaves the way its screen does.
   * `transitionStart` (native stack) lets it leave as its screen starts to,
   * on Android, where `blur` only comes once the screen is gone.
   */
  addListener: (
    event: 'focus' | 'blur' | 'beforeRemove' | 'transitionStart',
    callback: (event: {
      data?: { closing?: boolean };
      defaultPrevented?: boolean;
    }) => void
  ) => () => void;
  getState?: () => { type?: string } | undefined;
};

/**
 * How a screen comes or goes: `push` comes in from the trailing edge (and
 * `pop` leaves toward it), `reveal` comes back from under the screen being
 * popped (and `cover` goes under the screen being pushed).
 */
type ScreenMove = 'push' | 'reveal' | 'pop' | 'cover';

type ActiveHeader = {
  id: string;
  options: LiquidNavigationHeaderOptions;
  back: boolean;
  goBack: () => void;
  enter?: ScreenMove;
};

type HeaderStore = {
  show: (header: ActiveHeader) => void;
  hide: (id: string, exit?: ScreenMove) => void;
};

/**
 * The header follows its screen in and out when there is no other header
 * to morph into, with the timing of the iOS stack transition. Android stacks
 * cross-fade quickly instead, so there the header fades with its screen.
 */
const SLIDES_WITH_SCREEN = Platform.OS === 'ios';
const SCREEN_SLIDE_MS = 500;
const SCREEN_FADE_MS = 180;
/** How long a hidden header waits for the next screen's header. */
const HIDE_DELAY_MS = 80;
const SCREEN_SLIDE_EASING = Easing.bezier(0.3, 0.85, 0.35, 1);
/** Where the screen is when the header starts leaving, HIDE_DELAY_MS in. */
const EXIT_START = HIDE_DELAY_MS / SCREEN_SLIDE_MS;
/** The rest of the screen's curve, from EXIT_START on. */
const EXIT_EASING = (t: number) => {
  const from = SCREEN_SLIDE_EASING(EXIT_START);
  const at = SCREEN_SLIDE_EASING(EXIT_START + t * (1 - EXIT_START));
  return (at - from) / (1 - from);
};

/**
 * True while the header comes in with its screen: its buttons are already
 * full size, they ride in instead of growing.
 */
const SlidingInContext = createContext(false);

const HeaderContext = createContext<HeaderStore | null>(null);

export type LiquidHeaderProviderProps = {
  children: ReactNode;
  colorScheme?: LiquidColorSchemeSetting;
  /**
   * Lays the header out left-to-right or right-to-left: the back button and
   * a leading title go on the right in `rtl`. Defaults to `I18nManager`; set
   * it when the app flips its layout itself instead of with `forceRTL`.
   */
  direction?: 'ltr' | 'rtl';
  /**
   * iOS 26+: `false` turns off the system's scroll edge effect (the blur and
   * whitening under the status bar) on every scroll view while the provider
   * is mounted, e.g. when screens draw their own `edge`.
   * @default true
   */
  scrollEdgeEffect?: boolean;
  /**
   * iOS 26+: extends the system scroll edge effect of the screen's scroll view
   * down behind the floating header, like a navigation bar (the content under
   * it blurs progressively and keeps its colours).
   * @default true
   */
  extendScrollEdge?: boolean;
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
  direction,
  scrollEdgeEffect = true,
  extendScrollEdge = true,
  style,
}: LiquidHeaderProviderProps) {
  const [active, setActive] = useState<ActiveHeader | null>(null);
  const activeRef = useRef<ActiveHeader | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Moves the whole header (buttons, title, edge) with its screen.
  const slide = useRef(new Animated.Value(0)).current;
  // Android: fades the whole header with its screen instead.
  const fade = useRef(new Animated.Value(1)).current;
  const exiting = useRef(false);
  // A new header that slides in, or one that slid out, is remounted, so its
  // buttons neither grow in nor shrink away on top of the slide.
  const [generation, setGeneration] = useState(0);
  const [slidingIn, setSlidingIn] = useState(false);
  const { width } = useWindowDimensions();
  const widthRef = useRef(width);
  widthRef.current = width;

  const store = useMemo<HeaderStore>(() => {
    const setHeader = (header: ActiveHeader | null) => {
      activeRef.current = header;
      setActive(header);
    };
    // Where a screen is when off screen in the native stack: new screens
    // come in from the trailing edge, which is the left one in RTL.
    const offset = (move: ScreenMove) =>
      widthRef.current *
      (I18nManager.isRTL ? -1 : 1) *
      (move === 'push' || move === 'pop' ? 1 : -1);
    const run = (
      toValue: number,
      duration: number,
      easing: (t: number) => number,
      done?: () => void,
      value = slide
    ) =>
      Animated.timing(value, {
        toValue,
        duration,
        easing,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          done?.();
        }
      });

    return {
      show: (header) => {
        if (hideTimer.current != null) {
          clearTimeout(hideTimer.current);
          hideTimer.current = null;
        }
        const fromNothing = activeRef.current == null;
        if (exiting.current) {
          // Another header takes over while this one leaves: morph instead.
          exiting.current = false;
          slide.stopAnimation();
          slide.setValue(0);
          fade.stopAnimation();
          fade.setValue(1);
        } else if (fromNothing && header.enter) {
          // Nothing to morph from: come in with the screen.
          setGeneration((value) => value + 1);
          setSlidingIn(true);
          const done = () => setSlidingIn(false);
          if (SLIDES_WITH_SCREEN) {
            slide.setValue(offset(header.enter));
            run(0, SCREEN_SLIDE_MS, SCREEN_SLIDE_EASING, done);
          } else {
            // The screen starts to fade in a frame or two after its focus.
            fade.setValue(0);
            Animated.timing(fade, {
              toValue: 1,
              duration: SCREEN_FADE_MS,
              delay: 50,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start(done);
          }
        } else if (fromNothing) {
          // Put back here, not when the last header left: it would show
          // again for a frame before being unmounted.
          slide.setValue(0);
          fade.setValue(1);
        }
        setHeader(header);
      },
      hide: (id, exit) => {
        // The next screen usually takes over in the same moment; wait a
        // little so the header morphs instead of disappearing in between.
        if (hideTimer.current != null) {
          clearTimeout(hideTimer.current);
          hideTimer.current = null;
        }
        const done = () => {
          if (exiting.current) {
            exiting.current = false;
            setHeader(null);
            setGeneration((value) => value + 1);
          }
        };
        if (!SLIDES_WITH_SCREEN && exit != null) {
          if (activeRef.current?.id !== id || exiting.current) {
            return;
          }
          // Android: fade out at once, on the UI thread, since the JS thread
          // is often busy with the next screen. The fade starts slowly, so
          // a header that takes over right away stops it before it shows.
          exiting.current = true;
          run(0, SCREEN_FADE_MS, Easing.in(Easing.cubic), done, fade);
          return;
        }
        hideTimer.current = setTimeout(() => {
          hideTimer.current = null;
          if (activeRef.current?.id !== id) {
            return;
          }
          if (exit == null) {
            setHeader(null);
            return;
          }
          // Nothing to morph into: leave with the screen, from where the
          // screen already is after the wait.
          exiting.current = true;
          slide.setValue(offset(exit) * SCREEN_SLIDE_EASING(EXIT_START));
          run(offset(exit), SCREEN_SLIDE_MS - HIDE_DELAY_MS, EXIT_EASING, done);
        }, HIDE_DELAY_MS);
      },
    };
  }, [slide, fade]);

  return (
    <HeaderContext.Provider value={store}>
      <View style={[styles.root, style]}>
        {children}
        {/* iOS hides its scroll edge effect; a no-op on Android (no such effect). */}
        {!scrollEdgeEffect ? (
          <NativeLiquidScrollEdge
            hideTopEdge
            pointerEvents="none"
            style={styles.scrollEdgeSwitch}
          />
        ) : null}
        <Animated.View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFill,
            SLIDES_WITH_SCREEN
              ? { transform: [{ translateX: slide }] }
              : { opacity: fade },
          ]}
        >
          <SlidingInContext.Provider value={slidingIn}>
            <FloatingHeader
              key={generation}
              header={active}
              colorScheme={colorScheme}
              direction={direction}
              extendScrollEdge={extendScrollEdge}
            />
          </SlidingInContext.Provider>
        </Animated.View>
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
  // A screen shown before comes back from under the one being popped; a
  // new one is pushed. One being removed is popped; else it is covered.
  const shownBefore = useRef(false);
  const removing = useRef(false);

  useEffect(() => {
    const focus = navigation.addListener('focus', () => setFocused(true));
    const blur = navigation.addListener('blur', () => setFocused(false));
    const beforeRemove = navigation.addListener('beforeRemove', (event) => {
      removing.current = true;
      if (!SLIDES_WITH_SCREEN) {
        // Android: leave as the pop starts, unless a later listener keeps
        // the screen.
        Promise.resolve().then(() => {
          if (event.defaultPrevented) {
            removing.current = false;
          } else {
            setFocused(false);
          }
        });
      }
    });
    const transitionStart = navigation.addListener(
      'transitionStart',
      (event) => {
        if (!SLIDES_WITH_SCREEN && event.data?.closing) {
          setFocused(false);
        }
      }
    );
    return () => {
      focus();
      blur();
      beforeRemove();
      transitionStart();
    };
  }, [navigation]);

  const show = useCallback(() => {
    store.show({
      id,
      options: latest.current,
      // Tab navigators can go back to the previous tab, which is no reason
      // for a back button.
      back:
        latest.current.backButton ??
        (navigation.canGoBack() && navigation.getState?.()?.type !== 'tab'),
      goBack: navigation.goBack,
      enter: shownBefore.current ? 'reveal' : 'push',
    });
  }, [id, navigation, store]);

  // Re-shown whenever the options change while focused.
  useEffect(() => {
    if (focused) {
      show();
    }
  });

  useEffect(() => {
    if (focused) {
      shownBefore.current = true;
      return;
    }
    if (shownBefore.current) {
      store.hide(id, removing.current ? 'pop' : 'cover');
    }
  }, [focused, id, store]);

  useEffect(() => () => store.hide(id, 'pop'), [id, store]);
}

export type LiquidNavigationHeaderProps = LiquidNavigationHeaderOptions & {
  /** The screen's `navigation`. */
  navigation: LiquidHeaderNavigation;
};

/**
 * `useLiquidNavigationHeader` as a component: put it anywhere in a screen and
 * pass the same options as props. It renders nothing itself; the provider's
 * floating header shows these options while the screen is focused.
 *
 * ```tsx
 * <LiquidNavigationHeader
 *   navigation={navigation}
 *   title="Measures"
 *   titlePosition="leading"
 *   glass={{ glassStyle: 'regular', tintColor: 'rgba(255, 255, 255, 0.3)' }}
 * />
 * ```
 */
export function LiquidNavigationHeader({
  navigation,
  ...options
}: LiquidNavigationHeaderProps) {
  useLiquidNavigationHeader(navigation, options);
  return null;
}

const SLOT_SIZE = 44;
/** Larger than half of any capsule's height, so the glass is a full pill. */
const CAPSULE_RADIUS = 999;
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
  direction,
  extendScrollEdge,
}: {
  header: ActiveHeader | null;
  colorScheme?: LiquidColorSchemeSetting;
  direction?: 'ltr' | 'rtl';
  extendScrollEdge?: boolean;
}) {
  const isRTL = direction != null ? direction === 'rtl' : I18nManager.isRTL;
  const insets = useSafeAreaInsets();
  const { colors } = useLiquidColors(colorScheme);
  const options = header?.options;
  const search = options?.search;
  const [ownSearching, setOwnSearching] = useState(false);
  const searching = search != null && (search.expanded ?? ownSearching);
  const right = options?.right ?? [];
  // Keeps a place for every button seen, so removed ones can animate out.
  // Buttons fill the places from the right: when there are fewer, the
  // outermost ones morph into the new buttons and the inner ones shrink away.
  const slotCount = useRef(0);
  slotCount.current = Math.max(slotCount.current, right.length);
  const firstSlot = slotCount.current - right.length;
  // With a null in the list, items keep their places from the left.
  const explicit = right.includes(null);
  const slots = Array.from(
    { length: slotCount.current },
    (_, i) => (explicit ? right[i] : right[i - firstSlot]) ?? null
  );
  // Slots are laid out right to left in RTL, but transforms don't flip.
  const slideDistance = (SLOT_SIZE + SLOT_GAP) * (isRTL ? -1 : 1);
  // A button that goes away slides into a neighbour that stays (the pressed
  // one), and one that comes back grows out of a neighbour that was already
  // there. Buttons that all come back together grow in place. The direction
  // is decided when a button comes or goes, so later renders can't change it
  // mid-animation.
  const previousSlots = useRef<(LiquidHeaderItem | null)[]>([]);
  const slides = useRef<number[]>([]);
  slots.forEach((item, i) => {
    const before = previousSlots.current[i] ?? null;
    if ((before == null) === (item == null)) {
      return;
    }
    const stays = (j: number) =>
      slots[j] != null && (item == null || previousSlots.current[j] != null);
    if (stays(i + 1)) {
      slides.current[i] = slideDistance;
    } else if (stays(i - 1)) {
      slides.current[i] = -slideDistance;
    } else if (item == null) {
      // Everything goes: slide toward the trailing edge while shrinking.
      slides.current[i] = i < slotCount.current - 1 ? slideDistance : 0;
    } else {
      slides.current[i] = 0;
    }
  });
  previousSlots.current = slots;
  const slideFor = (i: number) => slides.current[i] ?? 0;

  const glass = options?.glass;
  const titleGlass =
    options?.titleGlass === false ? null : { ...glass, ...options?.titleGlass };
  const left: LiquidHeaderItem | undefined = header?.back
    ? {
        key: 'liquid-back',
        icon: options?.backIcon ?? (
          <ChevronLeftIcon color={colors.label} mirrored={isRTL} />
        ),
        onPress: header.goBack,
        accessibilityLabel: 'Back',
      }
    : options?.left;

  const hasTitle = options?.title != null || options?.titleComponent != null;
  const hasSubtitle =
    options?.subtitle != null || options?.subtitleComponent != null;
  const leadingTitle =
    options?.titlePosition === 'leading' && hasTitle && !searching;
  const inCapsule = hasSubtitle || options?.titleCapsule === true;
  const titleContent =
    options?.titleComponent ??
    (options?.title != null ? (
      <Text
        numberOfLines={1}
        style={[
          leadingTitle || inCapsule ? styles.capsuleTitle : styles.title,
          { color: colors.label },
          options.titleStyle,
        ]}
      >
        {options.title}
      </Text>
    ) : null);
  const subtitleContent =
    options?.subtitleComponent ??
    (options?.subtitle != null ? (
      <Text
        numberOfLines={1}
        style={[
          styles.subtitle,
          { color: colors.secondaryLabel },
          options.subtitleStyle,
        ]}
      >
        {options.subtitle}
      </Text>
    ) : null);
  const titleAlignStyle = {
    alignItems:
      options?.titleAlign === 'start'
        ? ('flex-start' as const)
        : options?.titleAlign === 'end'
          ? ('flex-end' as const)
          : ('center' as const),
  };
  const titleCapsule = (leading: boolean) =>
    titleGlass == null ? (
      // No glass: the same box, so the title sits where the capsule would.
      <Pressable
        accessibilityRole="header"
        disabled={options?.onTitlePress == null}
        onPress={options?.onTitlePress}
        style={[
          styles.titleCapsule,
          leading ? styles.titleCapsuleLeading : null,
          titleAlignStyle,
          leading ? styles.leadingTitle : null,
        ]}
      >
        {titleContent}
        {subtitleContent}
      </Pressable>
    ) : (
      <MorphGlass
        glassStyle={titleGlass.glassStyle}
        tintColor={titleGlass.tintColor}
        rimColor={titleGlass.rimColor}
        rimSideOpacity={titleGlass.rimSideOpacity}
        rimShadeColor={titleGlass.rimShadeColor}
        rimEdgeColor={titleGlass.rimEdgeColor}
        rimGradient={titleGlass.rimGradient}
        sheenOpacity={titleGlass.sheenOpacity}
        specularEdge={titleGlass.specularEdge}
        blurRadius={titleGlass.blurRadius}
        rimWidth={titleGlass.rimWidth}
        colorScheme={titleGlass.colorScheme ?? colorScheme}
        // Larger than half its height: a full pill even with a subtitle.
        cornerRadius={CAPSULE_RADIUS}
        contentKey={`${options?.title ?? ''}\n${options?.subtitle ?? ''}`}
        onPress={options?.onTitlePress}
        accessibilityRole="header"
        style={leading ? styles.leadingTitle : undefined}
        contentStyle={[
          styles.titleCapsule,
          leading ? styles.titleCapsuleLeading : null,
          titleAlignStyle,
        ]}
      >
        {titleContent}
        {subtitleContent}
      </MorphGlass>
    );

  const leftButton = (
    <Presence float={!leadingTitle}>
      {left != null ? (
        <HeaderButton
          item={left}
          colorScheme={colorScheme}
          glass={header?.back ? { ...glass, ...options?.backGlass } : glass}
        />
      ) : null}
    </Presence>
  );

  const buttons = (
    <>
      {leadingTitle ? (
        // The back button and the title share one glass: pressing either
        // swells it until they melt together, like neighbouring buttons.
        <LiquidGlassContainer
          pointerEvents="box-none"
          spacing={MERGE_SPACING}
          style={styles.leading}
        >
          {leftButton}
          <View
            pointerEvents="box-none"
            style={[
              styles.leadingTitleSlot,
              left != null ? styles.afterButton : null,
            ]}
          >
            {titleCapsule(true)}
          </View>
        </LiquidGlassContainer>
      ) : (
        leftButton
      )}
      <LiquidGlassContainer
        pointerEvents="box-none"
        spacing={MERGE_SPACING}
        style={styles.right}
      >
        {slots.map((item, i) => {
          return (
            <Presence
              key={i}
              style={[
                styles.rightSlot,
                item?.stretch ? styles.stretchSlot : null,
              ]}
              // Slides into a neighbour as it goes, so their glass melts.
              slide={slideFor(i)}
              keepSpace={explicit && item == null}
            >
              {item != null ? (
                <HeaderButton
                  item={item}
                  colorScheme={colorScheme}
                  glass={glass}
                />
              ) : null}
            </Presence>
          );
        })}
      </LiquidGlassContainer>
    </>
  );

  return (
    <NativeLiquidScrollEdgeContainer
      extendScrollEdge={extendScrollEdge}
      screenKey={header?.id}
      pointerEvents="box-none"
      style={[
        styles.header,
        direction != null ? { direction } : null,
        { paddingTop: insets.top, height: insets.top + LIQUID_HEADER_HEIGHT },
      ]}
    >
      {options?.edge != null ? (
        // The screen's edge, behind the buttons: from the very top of the
        // screen, whatever height the element gives itself.
        <View pointerEvents="none" style={styles.edge}>
          {options.edge}
        </View>
      ) : options?.edgeGlass ? (
        <HeaderEdgeGlass
          top={insets.top}
          colorScheme={colorScheme}
          options={options.edgeGlass === true ? {} : options.edgeGlass}
        />
      ) : null}
      <View pointerEvents="box-none" style={styles.bar}>
        {search != null ? (
          <LiquidExpandableSearch
            {...search}
            expanded={searching}
            onExpandedChange={(next) => {
              setOwnSearching(next);
              search.onExpandedChange?.(next);
            }}
            height={SLOT_SIZE}
            colorScheme={colorScheme}
            style={styles.searchBar}
          >
            {buttons}
          </LiquidExpandableSearch>
        ) : (
          buttons
        )}
      </View>
      <View
        pointerEvents="box-none"
        style={[styles.titleLayer, { top: insets.top }]}
      >
        {/* The capsule and the plain title have layers of their own, so one
            shrinking away never pushes the other out of the center. */}
        <View pointerEvents="box-none" style={styles.titleSlot}>
          <Presence>
            {!leadingTitle && inCapsule && hasTitle && !searching
              ? titleCapsule(false)
              : null}
          </Presence>
        </View>
        <View pointerEvents="box-none" style={styles.titleSlot}>
          {!leadingTitle && !inCapsule && hasTitle && !searching ? (
            <FadeIn key={options?.title ?? 'title'}>
              <View accessibilityRole="header">{titleContent}</View>
            </FadeIn>
          ) : null}
        </View>
      </View>
    </NativeLiquidScrollEdgeContainer>
  );
}

function HeaderEdgeGlass({
  top,
  colorScheme,
  options,
}: {
  top: number;
  colorScheme?: LiquidColorSchemeSetting;
  options: LiquidHeaderEdgeGlass;
}) {
  const below = options.height ?? LIQUID_HEADER_HEIGHT + 30;
  const height = top + below;
  return (
    <View pointerEvents="none" style={[styles.edge, { height }]}>
      <LiquidGlassView
        glassStyle={options.glassStyle ?? 'regular'}
        colorScheme={options.colorScheme ?? colorScheme}
        tintColor={options.tintColor}
        blurRadius={options.blurRadius}
        // Solid under the status bar, then melts into the content.
        fadeBottom={options.fadeHeight ?? below}
        style={{ height }}
      />
    </View>
  );
}

function HeaderButton({
  item,
  colorScheme,
  glass,
}: {
  item: LiquidHeaderItem;
  colorScheme?: LiquidColorSchemeSetting;
  glass?: LiquidHeaderGlass;
}) {
  const scheme = glass?.colorScheme ?? colorScheme;
  const { colors } = useLiquidColors(scheme);
  // Only an item's own tint (a prominent button) turns its label white; the
  // header's glass tint is a frost behind the usual label colour.
  const tinted = item.tintColor != null;
  const labelColor = tinted ? '#FFFFFF' : colors.label;

  return (
    <MorphGlass
      glassStyle={glass?.glassStyle}
      colorScheme={scheme}
      tintColor={item.tintColor ?? glass?.tintColor}
      rimColor={glass?.rimColor}
      rimSideOpacity={glass?.rimSideOpacity}
      rimShadeColor={glass?.rimShadeColor}
      rimEdgeColor={glass?.rimEdgeColor}
      rimGradient={glass?.rimGradient}
      sheenOpacity={glass?.sheenOpacity}
      specularEdge={glass?.specularEdge}
      blurRadius={glass?.blurRadius}
      rimWidth={glass?.rimWidth}
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
  keepSpace = false,
}: {
  children: ReactElement | null;
  style?: StyleProp<ViewStyle>;
  /**
   * Leaves the layout as soon as it starts to go, so its neighbours take the
   * space in the same motion instead of after it is gone.
   */
  float?: boolean;
  /** Keeps an empty place of a button's size once gone. */
  keepSpace?: boolean;
  /** Horizontal distance the child moves while hidden. */
  slide?: number;
}) {
  const visible = children != null;
  const liquid = Platform.OS === 'android' && slide !== 0;
  const last = useRef(children);
  if (children != null) {
    last.current = children;
  }
  // Starts hidden even when mounted visible, so a button in a new place grows
  // in; full size when the whole header slides in with its screen.
  const slidingIn = useContext(SlidingInContext);
  const progress = useRef(
    new Animated.Value(slidingIn && visible ? 1 : 0)
  ).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }
    Animated.spring(progress, {
      toValue: visible ? 1 : 0,
      // Slower on Android, so the stretching drop can be seen.
      stiffness: Platform.OS === 'android' ? 110 : 200,
      damping: Platform.OS === 'android' ? 21 : 26,
      mass: 1,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
      }
    });
  }, [visible, progress]);

  if (!visible && !mounted) {
    return keepSpace ? <View style={[style, styles.emptySlot]} /> : null;
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
  scrollEdgeSwitch: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  edge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
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
    marginStart: SLOT_GAP,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  leadingTitleSlot: {
    flexShrink: 1,
  },
  afterButton: {
    marginStart: SLOT_GAP,
  },
  leadingTitle: {
    flexShrink: 1,
  },
  stretchSlot: {
    flex: 1,
  },
  emptySlot: {
    width: SLOT_SIZE,
    height: SLOT_SIZE,
  },
  searchBar: {
    flex: 1,
  },
  floating: {
    position: 'absolute',
    start: 16,
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
  titleSlot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  titleCapsule: {
    // Grows for a title over a subtitle in a tall font.
    minHeight: SLOT_SIZE,
    maxWidth: 220,
    paddingHorizontal: 18,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCapsuleLeading: {
    maxWidth: undefined,
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
    marginStart: 6,
  },
});
