import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import {
  LiquidBottomTabBar,
  LiquidSegmentedControl,
  LiquidSlider,
  LiquidToggle,
  LiquidTopTabBar,
  type LiquidGlassStyle,
} from '@mohamed_abd_elnaby/react-native-liquid';
import { ContactsIcon, DiscoverIcon, HomeIcon, LabIcon } from '../TabIcons';

const BOTTOM_TABS = [
  { key: 'home', title: 'Home', Icon: HomeIcon },
  { key: 'discover', title: 'Discover', Icon: DiscoverIcon, badge: 3 },
  { key: 'contacts', title: 'Contacts', Icon: ContactsIcon },
  { key: 'lab', title: 'Lab', Icon: LabIcon },
];
const TOP_TABS = ['Years', 'Months', 'Days', 'All'];
const TINTS = [
  undefined,
  'rgba(10, 132, 255, 0.35)',
  'rgba(255, 55, 95, 0.35)',
  'rgba(48, 209, 88, 0.35)',
];

/** Height of the pinned bars (top tabs above the bottom bar). */
export const TAB_BARS_LAB_HEIGHT = 170;

/** The routes and descriptors a tab bar reads, outside a navigator. */
function mockNavigation(
  keys: string[],
  index: number,
  setIndex: (index: number) => void,
  options: (key: string) => object,
) {
  const routes = keys.map(key => ({ key, name: key }));
  return {
    state: {
      key: 'lab-tabs',
      index,
      routeNames: keys,
      routes,
      type: 'tab',
      stale: false,
      history: [],
      preloadedRouteKeys: [],
    },
    descriptors: Object.fromEntries(
      keys.map(key => [key, { options: options(key) }]),
    ),
    navigation: {
      emit: () => ({ defaultPrevented: false }),
      navigate: (name: string) => setIndex(Math.max(0, keys.indexOf(name))),
    },
  };
}

/**
 * The v1 top tabs and bottom tab bar with glass and drop controls. Returns
 * the bars and the controls separately: the bars go outside the screen's
 * ScrollView (a scroll view cuts the drop off at the bar's edges, and real
 * tab bars never sit in one), the controls go in a panel.
 */
export function useTabBarsLab({
  dark,
  labelStyle,
}: {
  dark: boolean;
  labelStyle: object;
}) {
  const colorScheme = dark ? 'dark' : 'light';
  const [style, setStyle] = useState(1);
  const [blur, setBlur] = useState(50);
  const [frost, setFrost] = useState(0);
  const [tint, setTint] = useState(0);
  const [lens, setLens] = useState(true);
  const [lensScale, setLensScale] = useState(100);
  const [lensMagnification, setLensMagnification] = useState(100);
  const [lensRefraction, setLensRefraction] = useState(100);
  const [lensFrost, setLensFrost] = useState(100);
  const [lensWash, setLensWash] = useState(0);
  const [tab, setTab] = useState(0);
  const [topTab, setTopTab] = useState(0);
  const position = useRef(new Animated.Value(0)).current;

  // The top bar follows a pager's position; animate it like a page swipe.
  useEffect(() => {
    Animated.spring(position, {
      toValue: topTab,
      stiffness: 260,
      damping: 28,
      useNativeDriver: false,
    }).start();
  }, [position, topTab]);

  const glass = {
    glassStyle: (style === 0 ? 'regular' : 'clear') as LiquidGlassStyle,
    // Clear keeps the bars' own frost; Blur % starts from fully clear glass
    // at 0% and frosts up to 100%.
    blur: style === 2 ? blur / 100 : undefined,
    frost: frost / 100,
    glassTintColor: TINTS[tint],
    lens,
    lensScale: lensScale / 100,
    lensMagnification: lensMagnification / 100,
    lensRefraction: lensRefraction / 100,
    lensFrost: lensFrost / 100,
    lensWash: lensWash / 100,
    colorScheme,
  } as const;

  const bottom = mockNavigation(
    BOTTOM_TABS.map(t => t.key),
    tab,
    setTab,
    key => {
      const t = BOTTOM_TABS.find(item => item.key === key)!;
      return {
        title: t.title,
        tabBarBadge: t.badge,
        tabBarIcon: (props: {
          focused: boolean;
          color: string;
          size: number;
        }) => <t.Icon {...props} />,
      };
    },
  );
  const top = mockNavigation(TOP_TABS, topTab, setTopTab, key => ({
    title: key,
  }));

  const bars = (
    <View pointerEvents="box-none" style={styles.bars}>
      <View pointerEvents="box-none" style={styles.topBox}>
        <LiquidTopTabBar
          {...(top as unknown as MaterialTopTabBarProps)}
          position={position}
          floating={false}
          {...glass}
        />
      </View>
      <View pointerEvents="box-none" style={styles.bottomBox}>
        <LiquidBottomTabBar
          {...(bottom as unknown as BottomTabBarProps)}
          insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
          bottomOffset={8}
          horizontalMargin={0}
          {...glass}
        />
      </View>
    </View>
  );

  const percent = (
    label: string,
    value: number,
    onChange: (value: number) => void,
    max = 100,
  ) => (
    <Row label={`${label} ${Math.round(value)}%`} labelStyle={labelStyle}>
      <LiquidSlider
        value={value}
        maximumValue={max}
        step={1}
        onValueChange={onChange}
        colorScheme={colorScheme}
        accessibilityLabel={label}
      />
    </Row>
  );

  const controls = (
    <View style={styles.wrap}>
      <Text style={labelStyle}>The bars are pinned at the bottom.</Text>
      <Row label="Style" labelStyle={labelStyle}>
        <LiquidSegmentedControl
          colorScheme={colorScheme}
          segments={['Regular', 'Clear', 'Blur %']}
          selectedIndex={style}
          onChange={setStyle}
        />
      </Row>
      {percent('Blur', blur, value => {
        // Moving it is choosing it.
        setBlur(value);
        setStyle(2);
      })}
      {percent(dark ? 'Black' : 'White', frost, setFrost)}
      <Row label="Tint" labelStyle={labelStyle}>
        <LiquidSegmentedControl
          colorScheme={colorScheme}
          segments={['None', 'Blue', 'Pink', 'Green']}
          selectedIndex={tint}
          onChange={setTint}
        />
      </Row>

      <View style={styles.toggle}>
        <Text style={labelStyle}>Liquid drop on press</Text>
        <LiquidToggle value={lens} onValueChange={setLens} />
      </View>
      {percent('Drop size', lensScale, setLensScale, 200)}
      {percent('Drop magnify', lensMagnification, setLensMagnification, 300)}
      {percent('Drop bend (Android)', lensRefraction, setLensRefraction, 300)}
      {percent(dark ? 'Drop black' : 'Drop white', lensWash, setLensWash)}
      {percent('Drop milkiness (Android)', lensFrost, setLensFrost, 200)}
    </View>
  );

  return { bars, controls };
}

function Row({
  label,
  labelStyle,
  children,
}: {
  label: string;
  labelStyle: object;
  children: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={labelStyle}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  row: {
    gap: 6,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bars: {
    height: TAB_BARS_LAB_HEIGHT,
  },
  // Room for the drop to swell above and below the bars.
  topBox: {
    height: 70,
    justifyContent: 'center',
  },
  bottomBox: {
    height: 100,
  },
});
