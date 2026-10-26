import { useState, type ReactNode } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
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
} from '@mohamed_abd_elnaby/react-native-liquid';

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
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [query, setQuery] = useState('');
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(false);
  const [focus, setFocus] = useState(true);
  const [volume, setVolume] = useState(0.6);
  const [segment, setSegment] = useState(0);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState('Active');
  const mode = useColorScheme()??'light';
  return (
    <View style={styles.background}>
      <Image source={{ uri: BACKGROUND }} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: tabBarHeight + 16 },
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
                children: PAUSE_OPTIONS.map((option) => ({
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
              onPress={() => setCount((value) => value + 1)}
            />
            <LiquidButton
              title="Prominent"
              variant="prominent"
              onPress={() => setCount((value) => value + 1)}
            />
            <LiquidIconButton
              accessibilityLabel="Add"
              colorScheme={mode}
              onPress={() => setCount((value) => value + 1)}
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
