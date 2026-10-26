import { useState, type ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  LiquidButton,
  LiquidGlassContainer,
  LiquidGlassView,
  LiquidIconButton,
  LiquidSearchBar,
  LiquidSegmentedControl,
  LiquidSlider,
  LiquidToggle,
} from '@mohamedabdelnaby/react-native-liquid';

const BACKGROUND = 'https://picsum.photos/id/1015/1200/2000';

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
  const [volume, setVolume] = useState(0.6);
  const [segment, setSegment] = useState(0);
  const [count, setCount] = useState(0);

  return (
    <View style={styles.background}>
      <Image source={{ uri: BACKGROUND }} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: tabBarHeight + 16 },
        ]}
      >
        <LiquidSearchBar
          colorScheme="dark"
          value={query}
          onChangeText={setQuery}
          placeholder="Search settings"
        />

        <Section title="Segmented control">
          <LiquidSegmentedControl
            colorScheme="dark"
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
              colorScheme="dark"
              onPress={() => setCount((value) => value + 1)}
            />
            <LiquidButton
              title="Prominent"
              variant="prominent"
              onPress={() => setCount((value) => value + 1)}
            />
            <LiquidIconButton
              accessibilityLabel="Add"
              colorScheme="dark"
              onPress={() => setCount((value) => value + 1)}
            >
              <Text style={styles.plus}>+</Text>
            </LiquidIconButton>
          </LiquidGlassContainer>
          <View style={styles.buttons}>
            <LiquidButton title="Small" size="small" colorScheme="dark" />
            <LiquidButton
              title="Large"
              size="large"
              variant="prominent"
              tintColor="#30D158"
            />
            <LiquidButton title="Disabled" disabled colorScheme="dark" />
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
