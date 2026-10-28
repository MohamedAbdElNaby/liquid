import { useState, type ReactNode } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  LiquidButton,
  LiquidGlassContainer,
  LiquidGlassView,
  LiquidSegmentedControl,
  LiquidSlider,
  LiquidToggle,
  isLiquidGlassSupported,
  type LiquidColorSchemeSetting,
  type LiquidGlassStyle,
  useLiquidHeaderHeight,
  useLiquidColors,
  useLiquidNavigationHeader,
} from '@mohamed_abd_elnaby/react-native-liquid';
import type { RootStackParamList } from '../../App';
import { MorphToolbar } from './MorphToolbar';
import { CheckIcon, ComposeIcon, PlusIcon } from '../HeaderIcons';

const BACKGROUND = 'https://picsum.photos/id/1069/1200/2400';
const TINTS = [undefined, '#0A84FF', '#FF375F', '#30D158'];
const SCHEMES: LiquidColorSchemeSetting[] = ['system', 'light', 'dark'];

function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function GlassLabScreen() {
  const insets = useSafeAreaInsets();
  // Pushed on the stack under the floating glass header.
  const headerHeight = useLiquidHeaderHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors: themeColors } = useLiquidColors();
  // Which circle was pressed. The other merges into it; the new button takes
  // the pressed one's place and keeps its color (clear or blue).
  const [pressed, setPressed] = useState<'add' | 'compose' | null>(null);
  const BLUE = '#0A84FF';

  useLiquidNavigationHeader(navigation, {
    title: 'Glass Lab',
    right:
      pressed === 'add'
        ? [
            {
              key: 'add-done',
              accessibilityLabel: 'Done',
              icon: <CheckIcon color={themeColors.label} />,
              onPress: () => setPressed(null),
            },
            null,
          ]
        : pressed === 'compose'
        ? [
            null,
            {
              key: 'compose-done',
              accessibilityLabel: 'Done',
              tintColor: BLUE,
              icon: <CheckIcon color="#FFFFFF" />,
              onPress: () => setPressed(null),
            },
          ]
        : [
            {
              key: 'add',
              accessibilityLabel: 'Add',
              icon: <PlusIcon color={themeColors.label} />,
              onPress: () => setPressed('add'),
            },
            {
              key: 'compose',
              accessibilityLabel: 'Compose',
              tintColor: BLUE,
              icon: <ComposeIcon color="#FFFFFF" />,
              onPress: () => setPressed('compose'),
            },
          ],
  });

  const [style, setStyle] = useState(0);
  const [tint, setTint] = useState(0);
  const [scheme, setScheme] = useState(0);
  const [interactive, setInteractive] = useState(true);
  const [radius, setRadius] = useState(28);
  const [blur, setBlur] = useState(8);
  const [refractionHeight, setRefractionHeight] = useState(12);
  const [refractionAmount, setRefractionAmount] = useState(24);
  const [chromatic, setChromatic] = useState(false);
  const [depth, setDepth] = useState(false);
  const [merged, setMerged] = useState(true);
  const mode = useColorScheme() ?? 'light';
  const glassStyle: LiquidGlassStyle = style === 0 ? 'regular' : 'clear';

  return (
    <View style={styles.background}>
      <Image source={{ uri: BACKGROUND }} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + 8, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <MorphToolbar />
        <Text style={styles.title}>Glass Lab</Text>
        <Text style={styles.subtitle}>
          {Platform.OS} {String(Platform.Version)} ·{' '}
          {isLiquidGlassSupported ? 'native glass' : 'fallback material'}
        </Text>

        <LiquidGlassView
          glassStyle={glassStyle}
          tintColor={TINTS[tint]}
          colorScheme={SCHEMES[scheme]}
          interactive={interactive}
          cornerRadius={radius}
          blurRadius={blur}
          refractionHeight={refractionHeight}
          refractionAmount={refractionAmount}
          chromaticAberration={chromatic}
          depthEffect={depth}
          style={styles.preview}
        >
          <Text style={styles.previewText}>LiquidGlassView</Text>
        </LiquidGlassView>

        <LiquidGlassView
          colorScheme={mode}
          cornerRadius={28}
          style={styles.panel}
        >
          <Label>Style</Label>
          <LiquidSegmentedControl
            colorScheme={mode}
            segments={['Regular', 'Clear']}
            selectedIndex={style}
            onChange={setStyle}
          />
          <Label>Tint</Label>
          <LiquidSegmentedControl
            colorScheme={mode}
            segments={['None', 'Blue', 'Pink', 'Green']}
            selectedIndex={tint}
            onChange={setTint}
          />
          <Label>Color scheme</Label>
          <LiquidSegmentedControl
            colorScheme={mode}
            segments={['System', 'Light', 'Dark']}
            selectedIndex={scheme}
            onChange={setScheme}
          />
          <View style={styles.row}>
            <Label>Interactive</Label>
            <LiquidToggle value={interactive} onValueChange={setInteractive} />
          </View>
          <Label>Corner radius {Math.round(radius)}</Label>
          <LiquidSlider
            value={radius}
            minimumValue={0}
            maximumValue={80}
            onValueChange={setRadius}
          />

          <Text style={styles.section}>Android only</Text>
          <Label>Blur {blur.toFixed(1)} dp</Label>
          <LiquidSlider
            value={blur}
            maximumValue={20}
            onValueChange={setBlur}
          />
          <Label>Refraction height {Math.round(refractionHeight)} dp</Label>
          <LiquidSlider
            value={refractionHeight}
            maximumValue={40}
            onValueChange={setRefractionHeight}
          />
          <Label>Refraction amount {Math.round(refractionAmount)} dp</Label>
          <LiquidSlider
            value={refractionAmount}
            maximumValue={80}
            onValueChange={setRefractionAmount}
          />
          <View style={styles.row}>
            <Label>Chromatic aberration</Label>
            <LiquidToggle value={chromatic} onValueChange={setChromatic} />
          </View>
          <View style={styles.row}>
            <Label>Depth effect</Label>
            <LiquidToggle value={depth} onValueChange={setDepth} />
          </View>
        </LiquidGlassView>

        <LiquidGlassView
          colorScheme={mode}
          cornerRadius={28}
          style={styles.panel}
        >
          <View style={styles.row}>
            <Label>LiquidGlassContainer (iOS merge)</Label>
            <LiquidToggle value={merged} onValueChange={setMerged} />
          </View>
          <LiquidGlassContainer
            spacing={merged ? 24 : 0}
            style={styles.containerDemo}
          >
            {[0, 1, 2].map(i => (
              <LiquidGlassView
                key={i}
                interactive
                cornerRadius={30}
                style={[styles.bubble, merged ? styles.bubbleMerged : null]}
              />
            ))}
          </LiquidGlassContainer>
        </LiquidGlassView>

        <LiquidButton
          title="Open screen with bar header"
          variant="prominent"
          onPress={() => navigation.navigate('BarHeader')}
          style={styles.button}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#102030',
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 15,
    marginTop: -12,
  },
  preview: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  panel: {
    padding: 16,
    gap: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  section: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  containerDemo: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  bubble: {
    width: 60,
    height: 60,
    marginHorizontal: 12,
  },
  bubbleMerged: {
    marginHorizontal: 2,
  },
  button: {
    alignSelf: 'center',
  },
});
