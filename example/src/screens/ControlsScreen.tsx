import { useState, type ReactNode } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  LiquidButton,
  LiquidGlassContainer,
  LiquidGlassView,
  LiquidExpandableSearch,
  LiquidIconButton,
  LiquidMenu,
  LiquidSegmentedControl,
  LiquidSlider,
  LiquidToggle,
  useLiquidColors,
  useLiquidHeaderHeight,
  useLiquidNavigationHeader,
} from '@mohamed_abd_elnaby/react-native-liquid';
import type { RootStackParamList } from '../../App';
import { QrIcon, SearchIcon } from '../HeaderIcons';

const BACKGROUND = 'https://picsum.photos/id/1015/1200/2000';

const PAUSE_OPTIONS = ['30 minutes', '1 hour', 'Today', 'This week', 'Custom'];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <LiquidGlassView cornerRadius={28} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </LiquidGlassView>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function ControlsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useLiquidHeaderHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useLiquidColors();

  const [editing, setEditing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [settingsQuery, setSettingsQuery] = useState('');

  const stopSearching = () => {
    setSearching(false);
    setSettingsQuery('');
  };

  // Telegram's Settings header: QR on the left, search and Edit on the right.
  // Edit melts search and Edit into one blue ✓ and QR becomes X. Search
  // stretches the circle into a field, Edit becomes X and QR shrinks away.
  // Neither leaves the screen.
  useLiquidNavigationHeader(navigation, {
    backButton: false,
    left: searching
      ? undefined
      : editing
      ? {
          key: 'cancel',
          accessibilityLabel: 'Cancel',
          icon: (
            <Text style={[styles.headerGlyph, { color: colors.label }]}>✕</Text>
          ),
          onPress: () => setEditing(false),
        }
      : {
          key: 'qr',
          accessibilityLabel: 'QR code',
          icon: <QrIcon color={colors.label} />,
        },
    right: searching
      ? [
          {
            key: 'search-field',
            stretch: true,
            accessibilityLabel: 'Search',
            content: (
              <View style={styles.searchField}>
                <SearchIcon color={colors.secondaryLabel} size={18} />
                <TextInput
                  autoFocus
                  value={settingsQuery}
                  onChangeText={setSettingsQuery}
                  placeholder="Search"
                  placeholderTextColor={colors.secondaryLabel}
                  returnKeyType="search"
                  style={[styles.searchInput, { color: colors.label }]}
                />
              </View>
            ),
          },
          {
            key: 'close-search',
            accessibilityLabel: 'Close search',
            icon: (
              <Text style={[styles.headerGlyph, { color: colors.label }]}>
                ✕
              </Text>
            ),
            onPress: stopSearching,
          },
        ]
      : editing
      ? [
          {
            key: 'done',
            accessibilityLabel: 'Done',
            tintColor: '#0A84FF',
            icon: <Text style={[styles.headerGlyph, styles.doneGlyph]}>✓</Text>,
            onPress: () => setEditing(false),
          },
        ]
      : [
          {
            key: 'search',
            accessibilityLabel: 'Search',
            icon: <SearchIcon color={colors.label} />,
            onPress: () => setSearching(true),
          },
          { key: 'edit', title: 'Edit', onPress: () => setEditing(true) },
        ],
  });
  const [query, setQuery] = useState('');
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(false);
  const [focus, setFocus] = useState(true);
  const [volume, setVolume] = useState(0.6);
  const [segment, setSegment] = useState(0);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState('Active');
  const mode = useColorScheme() ?? 'light';
  return (
    <View style={styles.background}>
      <Image source={{ uri: BACKGROUND }} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + 8, paddingBottom: tabBarHeight + 16 },
        ]}
      >
        <LiquidExpandableSearch
          colorScheme={mode}
          value={query}
          onChangeText={setQuery}
          placeholder="Search settings"
        >
          <Text style={styles.screenTitle}>Controls</Text>
          <View style={styles.spacer} />
          <LiquidMenu
            colorScheme={mode}
            title={`Mohamed AbdElNaby · ${status}`}
            accessibilityLabel="Profile"
            items={[
              {
                title: "What's your status?",
                systemImage: 'face.smiling',
                onPress: () => setStatus('Busy'),
              },
              {
                title: 'Set yourself as away',
                systemImage: 'person',
                onPress: () => setStatus('Away'),
              },
              {
                title: 'Pause notifications',
                systemImage: 'bell.slash',
                children: PAUSE_OPTIONS.map(option => ({
                  title: option,
                  onPress: () => setStatus(`Paused for ${option}`),
                })),
              },
              { title: 'Preferences', systemImage: 'gearshape' },
            ]}
            style={styles.menuButton}
          >
            <Text style={styles.avatar}>M</Text>
          </LiquidMenu>
        </LiquidExpandableSearch>
        <LiquidButton
          title="Edit profile (push)"
          size="small"
          colorScheme={mode}
          onPress={() => navigation.navigate('EditProfile')}
          style={styles.pushButton}
        />
        {query.length > 0 ? (
          <Text style={styles.queryText}>Searching for “{query}”</Text>
        ) : null}

        <Section title="Segmented control">
          <LiquidSegmentedControl
            colorScheme={mode}
            segments={['Day', 'Week', 'Month', 'Year']}
            selectedIndex={segment}
            onChange={setSegment}
          />
        </Section>

        <Section title="Toggles">
          <Row label="Wi-Fi">
            <LiquidToggle value={wifi} onValueChange={setWifi} />
          </Row>
          <Row label="Bluetooth">
            <LiquidToggle
              value={bluetooth}
              onValueChange={setBluetooth}
              onTintColor="#0A84FF"
            />
          </Row>
          <Row label="Focus (custom colors)">
            <LiquidToggle
              value={focus}
              onValueChange={setFocus}
              onTintColor="#FF3B30"
              offTintColor="rgba(255, 59, 48, 0.25)"
              thumbTintColor="#FFF4F2"
              lensTintColor="rgba(255, 59, 48, 0.12)"
            />
          </Row>
          <Row label="Disabled">
            <LiquidToggle value disabled />
          </Row>
        </Section>

        <Section title={`Slider ${Math.round(volume * 100)}%`}>
          <LiquidSlider value={volume} onValueChange={setVolume} />
          <LiquidSlider
            value={volume}
            step={0.25}
            tintColor="#FF9F0A"
            onValueChange={setVolume}
          />
        </Section>

        <Section title={`Buttons (${count})`}>
          <LiquidGlassContainer spacing={12} style={styles.buttons}>
            <LiquidButton
              title="Glass"
              colorScheme={mode}
              onPress={() => setCount(value => value + 1)}
            />
            <LiquidButton
              title="Prominent"
              variant="prominent"
              onPress={() => setCount(value => value + 1)}
            />
            <LiquidIconButton
              accessibilityLabel="Add"
              colorScheme={mode}
              onPress={() => setCount(value => value + 1)}
            >
              <Text style={styles.plus}>+</Text>
            </LiquidIconButton>
          </LiquidGlassContainer>
          <View style={styles.buttons}>
            <LiquidButton title="Small" size="small" colorScheme={mode} />
            <LiquidButton
              title="Large"
              size="large"
              variant="prominent"
              tintColor="#30D158"
            />
            <LiquidButton title="Disabled" disabled colorScheme={mode} />
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    marginLeft: 6,
    paddingVertical: 0,
  },
  headerGlyph: {
    fontSize: 18,
    fontWeight: '600',
  },
  doneGlyph: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  pushButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  background: {
    flex: 1,
    backgroundColor: '#203040',
  },
  content: {
    paddingHorizontal: 16,
  },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  spacer: {
    flex: 1,
  },
  menuButton: {
    marginRight: 10,
  },
  avatar: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  queryText: {
    color: '#FFFFFF',
    marginTop: 12,
  },
  section: {
    marginTop: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: '#FFFFFF',
    fontSize: 17,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  plus: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 26,
  },
});
