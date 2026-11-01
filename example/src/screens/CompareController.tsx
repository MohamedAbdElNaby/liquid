import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GlassButtonV2,
  GlassHeaderV2,
  GlassTabBarV2,
  GlassTopTabsV2,
  GLASS_HEADER_V2_HEIGHT,
  LiquidSegmentedControl,
  type GlassTabBarV2Item,
} from '@mohamed_abd_elnaby/react-native-liquid';
import { SearchIcon } from '../HeaderIcons';
import { GlassControls, useGlassLook } from './GlassControls';
import { ContactsIcon, DiscoverIcon, HomeIcon, LabIcon } from '../TabIcons';

type Props = {
  scheme: 'light' | 'dark';
  reduceTransparency: 'system' | 'on';
  label: string;
  onBack: () => void;
};

const ALL_TABS = [
  { key: 'home', title: 'Home', Icon: HomeIcon },
  { key: 'discover', title: 'Discover', Icon: DiscoverIcon },
  { key: 'contacts', title: 'Contacts', Icon: ContactsIcon },
  { key: 'lab', title: 'Lab', Icon: LabIcon },
  { key: 'more', title: 'More', Icon: DiscoverIcon },
];
const TOP_TABS = ['Years', 'Months', 'Days', 'All'];
const TINTS: { name: string; color?: string }[] = [
  { name: 'None' },
  { name: 'Blue', color: 'rgba(10, 132, 255, 0.35)' },
  { name: 'Pink', color: 'rgba(255, 55, 95, 0.35)' },
  { name: 'Green', color: 'rgba(48, 209, 88, 0.35)' },
];
const ACTIVE = ['#0A84FF', '#FF9F0A', '#30D158', 'mono'];

/**
 * Every option of the v2 top tabs and bottom tab bar, live: the glass
 * (regular ↔ clear, refraction, shine, tint), tab count,
 * labels, badge, glass style and tint, colours, size, position and extras.
 */
export function CompareController({
  scheme,
  reduceTransparency,
  label,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const dark = scheme === 'dark';
  const [tab, setTab] = useState(0);
  const [topTab, setTopTab] = useState(0);
  const [count, setCount] = useState(4);
  const [topCount, setTopCount] = useState(3);
  const [labels, setLabels] = useState(true);
  const [badge, setBadge] = useState(true);
  const [look, setLook] = useGlassLook();
  const [tint, setTint] = useState(0);
  const [active, setActive] = useState(0);
  const [search, setSearch] = useState(true);
  const [accessory, setAccessory] = useState(false);

  const activeColor =
    ACTIVE[active] === 'mono' ? label : (ACTIVE[active] as string);
  const items: GlassTabBarV2Item[] = ALL_TABS.slice(0, count).map(
    ({ key, title, Icon }, i) => ({
      key,
      title,
      badge: badge && i === 1 ? 3 : undefined,
      icon: (focused, color) => (
        <Icon color={color as string} size={24} focused={focused} />
      ),
    }),
  );
  const selected = Math.min(tab, count - 1);
  const topSelected = Math.min(topTab, topCount - 1);
  const top = insets.top + GLASS_HEADER_V2_HEIGHT + 8;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: top + 48 + 16,
          paddingBottom: insets.bottom + 54 + (accessory ? 62 : 0) + 48,
        }}
      >
        <Text style={[styles.largeTitle, { color: label }]}>
          Bars controller
        </Text>
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
          <Heading color={label}>Bottom tabs</Heading>
          <Row label="Tabs" color={label}>
            <LiquidSegmentedControl
              segments={['2', '3', '4', '5']}
              selectedIndex={count - 2}
              onChange={i => setCount(i + 2)}
              colorScheme={scheme}
            />
          </Row>
          <Toggle
            label="Labels"
            value={labels}
            onChange={setLabels}
            color={label}
          />
          <Toggle
            label="Badge"
            value={badge}
            onChange={setBadge}
            color={label}
          />
          <Toggle
            label="Search circle"
            value={search}
            onChange={setSearch}
            color={label}
          />
          <Toggle
            label="Accessory (mini player)"
            value={accessory}
            onChange={setAccessory}
            color={label}
          />

          <Heading color={label}>Glass (both bars)</Heading>
          <GlassControls
            look={look}
            onChange={setLook}
            scheme={scheme}
            color={label}
          />
          <Row label="Tint" color={label}>
            <LiquidSegmentedControl
              segments={TINTS.map(t => t.name)}
              selectedIndex={tint}
              onChange={setTint}
              colorScheme={scheme}
            />
          </Row>
          <Row label="Selected colour" color={label}>
            <LiquidSegmentedControl
              segments={['Blue', 'Orange', 'Green', 'Mono']}
              selectedIndex={active}
              onChange={setActive}
              colorScheme={scheme}
            />
          </Row>

          <Heading color={label}>Top tabs</Heading>
          <Row label="Tabs" color={label}>
            <LiquidSegmentedControl
              segments={['2', '3', '4']}
              selectedIndex={topCount - 2}
              onChange={i => setTopCount(i + 2)}
              colorScheme={scheme}
            />
          </Row>
        </View>
      </ScrollView>

      <GlassHeaderV2
        colorScheme={scheme}
        reduceTransparency={reduceTransparency}
        title={<Text style={[styles.inlineTitle, { color: label }]}>Bars</Text>}
        left={
          <GlassButtonV2
            icon={<Text style={[styles.chevron, { color: label }]}>‹</Text>}
            accessibilityLabel="Back"
            onPress={onBack}
            colorScheme={scheme}
            reduceTransparency={reduceTransparency}
          />
        }
      />
      <View style={[styles.topTabs, { top }]}>
        <GlassTopTabsV2
          items={TOP_TABS.slice(0, topCount).map(title => ({
            key: title,
            title,
          }))}
          selectedIndex={topSelected}
          onSelect={setTopTab}
          clarity={look.clarity}
          refraction={look.refraction}
          shine={look.shine}
          tintColor={TINTS[tint]?.color}
          activeTintColor={ACTIVE[active] === 'mono' ? undefined : activeColor}
          colorScheme={scheme}
          reduceTransparency={reduceTransparency}
        />
      </View>
      <GlassTabBarV2
        items={items}
        selectedIndex={selected}
        onSelect={setTab}
        showLabels={labels}
        clarity={look.clarity}
        refraction={look.refraction}
        shine={look.shine}
        tintColor={TINTS[tint]?.color}
        activeTintColor={activeColor}
        colorScheme={scheme}
        reduceTransparency={reduceTransparency}
        accessory={
          accessory ? (
            <Text style={[styles.accessoryText, { color: label }]}>
              Not Playing
            </Text>
          ) : undefined
        }
        trailing={
          search
            ? {
                icon: <SearchIcon color={label} />,
                onPress: () => {},
                accessibilityLabel: 'Search',
              }
            : undefined
        }
      />
    </View>
  );
}

function Heading({ color, children }: { color: string; children: ReactNode }) {
  return <Text style={[styles.heading, { color }]}>{children}</Text>;
}

function Row({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      {children}
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  color: string;
}) {
  return (
    <View style={styles.toggle}>
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
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
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 19,
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
