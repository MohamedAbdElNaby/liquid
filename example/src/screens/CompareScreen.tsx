import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ColorValue,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GlassHeaderV2,
  LiquidBottomTabBar,
  LiquidButton,
  LiquidIconButton,
  LiquidSegmentedControl,
  LiquidSlider,
  useLiquidNavigationHeader,
} from '@mohamed_abd_elnaby/react-native-liquid';
import type { RootStackParamList } from '../../App';
import { PHOTOS } from '../data';
import { ComposeIcon, PlusIcon } from '../HeaderIcons';
import { ContactsIcon, DiscoverIcon, HomeIcon, LabIcon } from '../TabIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'Compare'>;
type Scheme = 'light' | 'dark';
type Background = 'photo' | 'colors' | 'plain';
type Edge = 'auto' | 'fade' | 'blur';

const TABS = [
  { key: 'home', title: 'Home', Icon: HomeIcon },
  { key: 'discover', title: 'Discover', Icon: DiscoverIcon, badge: 3 },
  { key: 'contacts', title: 'Contacts', Icon: ContactsIcon },
  { key: 'lab', title: 'Lab', Icon: LabIcon },
];

/**
 * The v1 navigation header and GlassHeaderV2 over the same scrolling page, in
 * light and dark, over a photo, colours or a plain page. The header buttons
 * are v1 glass buttons with the Blur % and White % sliders.
 */
export function CompareScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [scheme, setScheme] = useState<Scheme>('light');
  const [background, setBackground] = useState<Background>('photo');
  const [live, setLive] = useState<'v1' | 'v2'>('v2');
  const [edge, setEdge] = useState<Edge>('auto');
  const [edgeBlur, setEdgeBlur] = useState(24);
  const [edgeStrength, setEdgeStrength] = useState(1);
  const [edgeHeight, setEdgeHeight] = useState(28);
  const [useBlur, setUseBlur] = useState(false);
  const [blurPercent, setBlurPercent] = useState(50);
  const [white, setWhite] = useState(0);
  const [muted, setMuted] = useState(false);
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
  const page = dark ? '#000000' : '#F2F2F7';
  const glass = {
    blur: useBlur ? blurPercent / 100 : undefined,
    frost: white / 100,
  };

  // The v1 header (the shared one from LiquidHeaderProvider) only while v1 is live.
  useLiquidNavigationHeader(
    navigation,
    live === 'v1'
      ? {
          title: 'Header',
          glass: { colorScheme: scheme, ...glass },
          right: [
            { key: 'plus', icon: <PlusIcon color={label} /> },
            { key: 'compose', icon: <ComposeIcon color={label} /> },
          ],
        }
      : { backButton: false },
  );

  return (
    <View style={[styles.screen, { backgroundColor: page }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      {background === 'photo' ? (
        <Image
          source={{ uri: PHOTOS[4]!.image }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: insets.top + 64,
          paddingBottom: insets.bottom + 120,
        }}
      >
        <Text style={[styles.largeTitle, { color: label }]}>Header</Text>

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
          <Row label="Appearance" color={label}>
            <LiquidSegmentedControl
              segments={['Light', 'Dark']}
              selectedIndex={dark ? 1 : 0}
              onChange={i => setScheme(i === 1 ? 'dark' : 'light')}
              colorScheme={scheme}
            />
          </Row>
          <Row label="Background" color={label}>
            <LiquidSegmentedControl
              segments={['Photo', 'Colors', 'Plain']}
              selectedIndex={['photo', 'colors', 'plain'].indexOf(background)}
              onChange={i =>
                setBackground((['photo', 'colors', 'plain'] as const)[i]!)
              }
              colorScheme={scheme}
            />
          </Row>
          <Row label="Header" color={label}>
            <LiquidSegmentedControl
              segments={['v1', 'v2']}
              selectedIndex={live === 'v1' ? 0 : 1}
              onChange={i => setLive(i === 0 ? 'v1' : 'v2')}
              colorScheme={scheme}
            />
          </Row>

          <Text style={[styles.heading, { color: label }]}>
            Buttons glass (header and below)
          </Text>
          <Row label="Glass" color={label}>
            <LiquidSegmentedControl
              segments={['Regular', 'Blur %']}
              selectedIndex={useBlur ? 1 : 0}
              onChange={i => setUseBlur(i === 1)}
              colorScheme={scheme}
            />
          </Row>
          <Slider
            label={`Blur ${Math.round(blurPercent)}%`}
            value={blurPercent}
            max={100}
            onChange={value => {
              setBlurPercent(value);
              setUseBlur(true);
            }}
            scheme={scheme}
            color={label}
          />
          <Slider
            label={`White ${Math.round(white)}%`}
            value={white}
            max={100}
            onChange={setWhite}
            scheme={scheme}
            color={label}
          />
          <View style={styles.buttons}>
            <LiquidButton title="Edit" colorScheme={scheme} {...glass} />
            <LiquidIconButton
              accessibilityLabel="Add"
              colorScheme={scheme}
              {...glass}
            >
              <PlusIcon color={label} />
            </LiquidIconButton>
            <LiquidButton
              morph
              title={muted ? 'Unmute' : 'Mute'}
              onPress={() => setMuted(value => !value)}
              colorScheme={scheme}
              {...glass}
            />
          </View>

          {live === 'v2' ? (
            <>
              <Text style={[styles.heading, { color: label }]}>
                Scroll edge (v2)
              </Text>
              <Row label="Edge" color={label}>
                <LiquidSegmentedControl
                  segments={['Auto', 'Fade', 'Blur']}
                  selectedIndex={['auto', 'fade', 'blur'].indexOf(edge)}
                  onChange={i =>
                    setEdge((['auto', 'fade', 'blur'] as const)[i]!)
                  }
                  colorScheme={scheme}
                />
              </Row>
              <Slider
                label={`Edge blur ${Math.round(edgeBlur)} (Blur)`}
                value={edgeBlur}
                max={48}
                onChange={setEdgeBlur}
                scheme={scheme}
                color={label}
              />
              <Slider
                label={`Edge strength ${Math.round(edgeStrength * 100)}%`}
                value={edgeStrength * 100}
                max={100}
                onChange={value => setEdgeStrength(value / 100)}
                scheme={scheme}
                color={label}
              />
              <Slider
                label={`Edge height ${Math.round(edgeHeight)}`}
                value={edgeHeight}
                max={96}
                onChange={setEdgeHeight}
                scheme={scheme}
                color={label}
              />
            </>
          ) : null}
        </View>

        <View style={styles.list}>
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
        </View>
      </Animated.ScrollView>

      {live === 'v2' ? (
        <GlassHeaderV2
          edge={edge}
          edgeBlurRadius={edgeBlur}
          edgeStrength={edgeStrength}
          edgeHeight={edgeHeight}
          scrollY={scrollY}
          titleAppearsAt={40}
          colorScheme={scheme}
          title={
            <Text style={[styles.inlineTitle, { color: label }]}>Header</Text>
          }
          left={
            <LiquidIconButton
              accessibilityLabel="Back"
              onPress={navigation.goBack}
              colorScheme={scheme}
              {...glass}
            >
              <Text style={[styles.chevron, { color: label }]}>‹</Text>
            </LiquidIconButton>
          }
          right={
            <>
              <LiquidIconButton
                accessibilityLabel="Add"
                colorScheme={scheme}
                {...glass}
              >
                <PlusIcon color={label} />
              </LiquidIconButton>
              <LiquidIconButton
                accessibilityLabel="Compose"
                tintColor="#0A84FF"
                colorScheme={scheme}
                {...glass}
              >
                <ComposeIcon color="#FFFFFF" />
              </LiquidIconButton>
            </>
          }
        />
      ) : null}
      <LiquidBottomTabBar
        {...mockTabBarProps(tab, setTab, label)}
        insets={insets}
        colorScheme={scheme}
      />
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

function Slider({
  label,
  value,
  max,
  onChange,
  disabled,
  scheme,
  color,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  scheme: Scheme;
  color: ColorValue;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      <LiquidSlider
        value={value}
        minimumValue={0}
        maximumValue={max}
        step={1}
        onValueChange={onChange}
        disabled={disabled}
        colorScheme={scheme}
        accessibilityLabel={label}
      />
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
  heading: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 6,
  },
  row: {
    gap: 6,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  list: {
    marginTop: 24,
    marginHorizontal: 16,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 16,
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
});
