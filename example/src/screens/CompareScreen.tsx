import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  Animated,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
  type ColorValue,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GlassButtonV2,
  GlassHeaderV2,
  GlassShapeV2,
  GlassTabBarV2,
  LiquidBottomTabBar,
  LiquidButton,
  LiquidGlassView,
  LiquidIconButton,
  LiquidSegmentedControl,
  LiquidSlider,
  useLiquidNavigationHeader,
  type GlassTabBarV2Item,
} from '@mohamed_abd_elnaby/react-native-liquid';
import type { RootStackParamList } from '../../App';
import { PHOTOS } from '../data';
import { ComposeIcon, PlusIcon, SearchIcon } from '../HeaderIcons';
import { ContactsIcon, DiscoverIcon, HomeIcon, LabIcon } from '../TabIcons';
import { CompareController } from './CompareController';
import { CompareMorph } from './CompareMorph';
import { GlassControls, useGlassLook } from './GlassControls';

type Props = NativeStackScreenProps<RootStackParamList, 'Compare'>;
type Example = NonNullable<
  NonNullable<RootStackParamList['Compare']>['example']
>;
type Scheme = 'light' | 'dark';
type Background = 'photo' | 'colors' | 'plain';
type Live = 'v1' | 'v2';

const EXAMPLES: { key: Example; title: string; subtitle: string }[] = [
  {
    key: 'buttons',
    title: 'Buttons',
    subtitle: 'Text, icon and prominent; regular ↔ clear, refraction, shine',
  },
  {
    key: 'shape',
    title: 'Shape / card',
    subtitle: 'Rounded glass with content',
  },
  { key: 'tabbar', title: 'Tab bar', subtitle: 'Lozenge and press feedback' },
  {
    key: 'morph',
    title: 'Morph & merge',
    subtitle: 'Glass that melts together and pulls apart',
  },
  {
    key: 'bars',
    title: 'Header & scrolling',
    subtitle: 'Scroll edge (fade or blur) and fixed bars, live v1 or v2',
  },
  {
    key: 'controller',
    title: 'Bars controller',
    subtitle: 'Top and bottom tabs: glass sliders and every option live',
  },
];

const TABS = [
  { key: 'home', title: 'Home', Icon: HomeIcon },
  { key: 'discover', title: 'Discover', Icon: DiscoverIcon, badge: 3 },
  { key: 'contacts', title: 'Contacts', Icon: ContactsIcon },
  { key: 'lab', title: 'Lab', Icon: LabIcon },
];

const V2_ITEMS: GlassTabBarV2Item[] = TABS.map(
  ({ key, title, Icon, badge }) => ({
    key,
    title,
    badge,
    icon: (focused, color) => (
      <Icon color={color as string} size={24} focused={focused} />
    ),
  }),
);

// The toggles are shared by every Compare screen, so Dark set on the list
// stays on in each example.
type Settings = { scheme: Scheme; background: Background; reduced: boolean };
let settings: Settings = {
  scheme: 'light',
  background: 'photo',
  reduced: false,
};
const listeners = new Set<() => void>();

function useSettings() {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => settings,
  );
}

function updateSettings(next: Partial<Settings>) {
  settings = { ...settings, ...next };
  listeners.forEach(listener => listener());
}

/**
 * Current (v1) and new (v2) components side by side, one screen per example,
 * over a photo, colours or a plain page, in light and dark, with a Reduce
 * Transparency simulation. Without an `example` param it lists the examples.
 */
export function CompareScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const example = route.params?.example;
  const { scheme, background, reduced } = useSettings();
  const [live, setLive] = useState<Live>('v2');
  const [edge, setEdge] = useState<'auto' | 'fade' | 'blur'>('auto');
  const [edgeBlur, setEdgeBlur] = useState(24);
  const [edgeStrength, setEdgeStrength] = useState(1);
  const [edgeHeight, setEdgeHeight] = useState(28);
  const [headerSpacing, setHeaderSpacing] = useState(0);
  const [look, setLook] = useGlassLook();
  const [tab, setTab] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );

  const dark = scheme === 'dark';
  const label = dark ? '#FFFFFF' : '#000000';
  const secondary = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const page = dark ? '#000000' : '#F2F2F7';
  const reduceTransparency = reduced ? 'on' : 'system';
  const liveBars = example === 'bars';
  const title = EXAMPLES.find(item => item.key === example)?.title ?? 'Compare';

  // v1 header (the shared one from LiquidHeaderProvider) only while v1 is live.
  useLiquidNavigationHeader(
    navigation,
    liveBars && live === 'v1'
      ? {
          title,
          glass: { colorScheme: scheme },
          right: [
            { key: 'plus', icon: <PlusIcon color={label} /> },
            { key: 'compose', icon: <ComposeIcon color={label} /> },
          ],
        }
      : { backButton: false },
  );

  const backButton = (
    <GlassButtonV2
      icon={<Text style={[styles.chevron, { color: label }]}>‹</Text>}
      accessibilityLabel="Back"
      onPress={navigation.goBack}
      colorScheme={scheme}
      reduceTransparency={reduceTransparency}
    />
  );

  const backdrop = (
    <>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      {background === 'photo' ? (
        <Image
          source={{ uri: PHOTOS[4]!.image }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
    </>
  );

  if (example === 'controller') {
    return (
      <View style={[styles.screen, { backgroundColor: page }]}>
        {backdrop}
        <CompareController
          scheme={scheme}
          reduceTransparency={reduceTransparency}
          label={label}
          onBack={navigation.goBack}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: page }]}>
      {backdrop}
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: insets.top + 64,
          paddingBottom: insets.bottom + (liveBars ? 200 : 40),
        }}
      >
        <Text style={[styles.largeTitle, { color: label }]}>{title}</Text>

        <Panel dark={dark}>
          <Row label="Appearance" color={label}>
            <LiquidSegmentedControl
              segments={['Light', 'Dark']}
              selectedIndex={dark ? 1 : 0}
              onChange={i =>
                updateSettings({ scheme: i === 1 ? 'dark' : 'light' })
              }
              colorScheme={scheme}
              style={styles.segmented}
            />
          </Row>
          <Row label="Background" color={label}>
            <LiquidSegmentedControl
              segments={['Photo', 'Colors', 'Plain']}
              selectedIndex={['photo', 'colors', 'plain'].indexOf(background)}
              onChange={i =>
                updateSettings({
                  background: (['photo', 'colors', 'plain'] as const)[i]!,
                })
              }
              colorScheme={scheme}
              style={styles.segmented}
            />
          </Row>
          {liveBars ? (
            <Row label="Live bars" color={label}>
              <LiquidSegmentedControl
                segments={['v1', 'v2']}
                selectedIndex={live === 'v1' ? 0 : 1}
                onChange={i => setLive(i === 0 ? 'v1' : 'v2')}
                colorScheme={scheme}
                style={styles.segmented}
              />
            </Row>
          ) : null}
          {liveBars && live === 'v2' ? (
            <Row label="Header edge (v2)" color={label}>
              <LiquidSegmentedControl
                segments={['Auto', 'Fade', 'Blur']}
                selectedIndex={['auto', 'fade', 'blur'].indexOf(edge)}
                onChange={i => setEdge((['auto', 'fade', 'blur'] as const)[i]!)}
                colorScheme={scheme}
                style={styles.segmented}
              />
            </Row>
          ) : null}
          {liveBars && live === 'v2' ? (
            <>
              <Row
                label={`Edge blur ${Math.round(edgeBlur)} (Blur)`}
                color={label}
              >
                <LiquidSlider
                  value={edgeBlur}
                  minimumValue={0}
                  maximumValue={48}
                  onValueChange={setEdgeBlur}
                  colorScheme={scheme}
                  accessibilityLabel="Edge blur radius"
                />
              </Row>
              <Row
                label={`Edge strength ${edgeStrength.toFixed(2)} (Fade, Blur)`}
                color={label}
              >
                <LiquidSlider
                  value={edgeStrength}
                  minimumValue={0}
                  maximumValue={1}
                  onValueChange={setEdgeStrength}
                  colorScheme={scheme}
                  accessibilityLabel="Edge strength"
                />
              </Row>
              <Row
                label={`Edge height ${Math.round(edgeHeight)} (Fade, Blur)`}
                color={label}
              >
                <LiquidSlider
                  value={edgeHeight}
                  minimumValue={0}
                  maximumValue={96}
                  onValueChange={setEdgeHeight}
                  colorScheme={scheme}
                  accessibilityLabel="Edge height"
                />
              </Row>
              <Row
                label={`Header buttons merge ${Math.round(headerSpacing)}`}
                color={label}
              >
                <LiquidSlider
                  value={headerSpacing}
                  minimumValue={0}
                  maximumValue={24}
                  onValueChange={setHeaderSpacing}
                  colorScheme={scheme}
                  accessibilityLabel="Header buttons merge distance"
                />
              </Row>
            </>
          ) : null}
          <Row label="Reduce Transparency (simulated, v2)" color={label}>
            <Switch
              value={reduced}
              onValueChange={value => updateSettings({ reduced: value })}
            />
          </Row>
        </Panel>

        {example == null ? (
          <View style={styles.section}>
            {EXAMPLES.map(item => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                onPress={() =>
                  navigation.push('Compare', { example: item.key })
                }
                style={[
                  styles.item,
                  { backgroundColor: dark ? '#1C1C1E' : '#FFFFFF' },
                ]}
              >
                <View style={styles.itemBody}>
                  <Text style={[styles.itemText, { color: label }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: secondary }]}>
                    {item.subtitle}
                  </Text>
                </View>
                <Text style={[styles.disclosure, { color: secondary }]}>›</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {example === 'buttons' ? (
          <Section title="Buttons" color={label}>
            <Side label="v1" color={label}>
              <View style={styles.buttons}>
                <LiquidButton title="Edit" colorScheme={scheme} />
                <LiquidIconButton colorScheme={scheme} accessibilityLabel="Add">
                  <PlusIcon color={label} />
                </LiquidIconButton>
                <LiquidIconButton
                  colorScheme={scheme}
                  tintColor="#0A84FF"
                  accessibilityLabel="Compose"
                >
                  <ComposeIcon color="#FFFFFF" />
                </LiquidIconButton>
              </View>
            </Side>
            <Side label="v2" color={label}>
              <View style={styles.buttons}>
                <GlassButtonV2
                  clarity={look.clarity}
                  refraction={look.refraction}
                  shine={look.shine}
                  title="Edit"
                  colorScheme={scheme}
                  reduceTransparency={reduceTransparency}
                />
                <GlassButtonV2
                  clarity={look.clarity}
                  refraction={look.refraction}
                  shine={look.shine}
                  icon={<PlusIcon color={label} />}
                  accessibilityLabel="Add"
                  colorScheme={scheme}
                  reduceTransparency={reduceTransparency}
                />
                <GlassButtonV2
                  clarity={look.clarity}
                  refraction={look.refraction}
                  shine={look.shine}
                  icon={<ComposeIcon color="#FFFFFF" />}
                  tintColor="#0A84FF"
                  accessibilityLabel="Compose"
                  colorScheme={scheme}
                  reduceTransparency={reduceTransparency}
                />
              </View>
            </Side>
            <GlassControls
              look={look}
              onChange={setLook}
              scheme={scheme}
              color={label}
            />
          </Section>
        ) : null}

        {example === 'morph' ? (
          <CompareMorph
            scheme={scheme}
            reduceTransparency={reduceTransparency}
            label={label}
          />
        ) : null}

        {example === 'shape' ? (
          <Section title="Shape / card" color={label}>
            <Side label="v1" color={label}>
              <LiquidGlassView
                cornerRadius={22}
                colorScheme={scheme}
                style={styles.card}
              >
                <Text style={[styles.cardText, { color: label }]}>
                  Glass card
                </Text>
              </LiquidGlassView>
            </Side>
            <Side label="v2" color={label}>
              <GlassShapeV2
                cornerRadius={22}
                colorScheme={scheme}
                reduceTransparency={reduceTransparency}
                style={styles.card}
              >
                <Text style={[styles.cardText, { color: label }]}>
                  Glass card
                </Text>
              </GlassShapeV2>
            </Side>
          </Section>
        ) : null}

        {example === 'tabbar' ? (
          <Section title="Tab bar" color={label}>
            <Text style={[styles.sideLabel, styles.chip, { color: label }]}>
              v1
            </Text>
            <View style={styles.barBox}>
              <LiquidBottomTabBar
                {...mockTabBarProps(tab, setTab, label)}
                colorScheme={scheme}
                bottomOffset={8}
              />
            </View>
            <Text style={[styles.sideLabel, styles.chip, { color: label }]}>
              v2
            </Text>
            <View style={styles.barBox}>
              <GlassTabBarV2
                items={V2_ITEMS}
                selectedIndex={tab}
                onSelect={setTab}
                colorScheme={scheme}
                reduceTransparency={reduceTransparency}
                bottomOffset={8}
                trailing={{
                  icon: <SearchIcon color={label} />,
                  onPress: () => {},
                  accessibilityLabel: 'Search',
                }}
              />
            </View>
          </Section>
        ) : null}

        {liveBars ? (
          <Section title="Scrolling content" color={label}>
            {PHOTOS.concat(PHOTOS).map((photo, i) => (
              <View
                key={`${photo.id}-${i}`}
                style={[
                  styles.item,
                  {
                    backgroundColor:
                      background === 'colors'
                        ? photo.color
                        : dark
                          ? '#1C1C1E'
                          : '#FFFFFF',
                  },
                ]}
              >
                {background !== 'colors' ? (
                  <Image source={{ uri: photo.image }} style={styles.thumb} />
                ) : null}
                <Text
                  style={[
                    styles.itemText,
                    { color: background === 'colors' ? '#FFFFFF' : label },
                  ]}
                >
                  {photo.title}
                </Text>
              </View>
            ))}
          </Section>
        ) : null}
      </Animated.ScrollView>

      {!liveBars ? (
        <GlassHeaderV2
          scrollY={scrollY}
          titleAppearsAt={40}
          colorScheme={scheme}
          reduceTransparency={reduceTransparency}
          title={
            <Text style={[styles.inlineTitle, { color: label }]}>{title}</Text>
          }
          left={backButton}
        />
      ) : live === 'v2' ? (
        <>
          <GlassHeaderV2
            edge={edge}
            edgeBlurRadius={edgeBlur}
            edgeStrength={edgeStrength}
            edgeHeight={edgeHeight}
            spacing={headerSpacing}
            scrollY={scrollY}
            titleAppearsAt={40}
            colorScheme={scheme}
            reduceTransparency={reduceTransparency}
            title={
              <Text style={[styles.inlineTitle, { color: label }]}>
                {title}
              </Text>
            }
            left={backButton}
            right={
              <>
                <GlassButtonV2
                  icon={<PlusIcon color={label} />}
                  accessibilityLabel="Add"
                  colorScheme={scheme}
                  reduceTransparency={reduceTransparency}
                />
                <GlassButtonV2
                  icon={<ComposeIcon color="#FFFFFF" />}
                  tintColor="#0A84FF"
                  accessibilityLabel="Compose"
                  colorScheme={scheme}
                  reduceTransparency={reduceTransparency}
                />
              </>
            }
          />
          <GlassTabBarV2
            items={V2_ITEMS}
            selectedIndex={tab}
            onSelect={setTab}
            colorScheme={scheme}
            reduceTransparency={reduceTransparency}
            accessory={
              <Text style={[styles.accessoryText, { color: label }]}>
                Not Playing
              </Text>
            }
            trailing={{
              icon: <SearchIcon color={label} />,
              onPress: () => {},
              accessibilityLabel: 'Search',
            }}
          />
        </>
      ) : (
        <LiquidBottomTabBar
          {...mockTabBarProps(tab, setTab, label)}
          insets={insets}
          colorScheme={scheme}
        />
      )}
    </View>
  );
}

/** The parts of BottomTabBarProps that LiquidBottomTabBar reads, outside a navigator. */
function mockTabBarProps(
  index: number,
  setIndex: (index: number) => void,
  color: string,
): BottomTabBarProps {
  const routes = TABS.map(({ key }) => ({ key, name: key }));
  const descriptors = Object.fromEntries(
    TABS.map(({ key, title, Icon, badge }) => [
      key,
      {
        options: {
          title,
          tabBarBadge: badge,
          tabBarIcon: (props: {
            focused: boolean;
            color: string;
            size: number;
          }) => <Icon {...props} color={props.color ?? color} />,
        },
      },
    ]),
  );
  return {
    state: {
      key: 'compare-tabs',
      index,
      routeNames: routes.map(route => route.name),
      routes,
      type: 'tab',
      stale: false,
      history: [],
      preloadedRouteKeys: [],
    },
    descriptors,
    navigation: {
      emit: () => ({ defaultPrevented: false }),
      navigate: (name: string) =>
        setIndex(
          Math.max(
            0,
            routes.findIndex(route => route.name === name),
          ),
        ),
    },
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  } as unknown as BottomTabBarProps;
}

function Panel({ dark, children }: { dark: boolean; children: ReactNode }) {
  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: dark
            ? 'rgba(28,28,30,0.92)'
            : 'rgba(255,255,255,0.92)',
        },
      ]}
    >
      {children}
    </View>
  );
}

function Row({
  label,
  color,
  children,
}: {
  label: string;
  color: ColorValue;
  children: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      {children}
    </View>
  );
}

function Section({
  title,
  color,
  children,
}: {
  title: string;
  color: ColorValue;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, styles.chip, { color }]}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

function Side({
  label,
  color,
  children,
}: {
  label: string;
  color: ColorValue;
  children: ReactNode;
}) {
  return (
    <View style={styles.side}>
      <Text style={[styles.sideLabel, styles.chip, { color }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  panel: {
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 14,
    gap: 10,
  },
  row: {
    gap: 6,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  segmented: {
    alignSelf: 'stretch',
  },
  section: {
    marginTop: 24,
    marginHorizontal: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  // A neutral grey chip reads in both appearances over any background.
  chip: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(128, 128, 128, 0.35)',
  },
  side: {
    gap: 6,
  },
  sideLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  card: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    fontSize: 20,
    fontWeight: '700',
  },
  barBox: {
    height: 80,
    marginHorizontal: -16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 16,
  },
  itemBody: {
    flex: 1,
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  itemSubtitle: {
    fontSize: 13,
  },
  disclosure: {
    fontSize: 26,
    paddingRight: 6,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  itemText: {
    fontSize: 17,
    fontWeight: '600',
  },
  inlineTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 30,
    lineHeight: 32,
    marginTop: -3,
  },
  accessoryText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
