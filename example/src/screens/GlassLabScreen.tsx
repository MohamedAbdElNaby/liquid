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
  LiquidIconButton,
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
import { TAB_BARS_LAB_HEIGHT, useTabBarsLab } from './TabBarsLab';
import { CheckIcon, ComposeIcon, PlusIcon } from '../HeaderIcons';

const BACKGROUND = 'https://picsum.photos/id/1069/1200/2400';
const TINTS = [undefined, '#0A84FF', '#FF375F', '#30D158'];
const PREVIEW_HEIGHT = 160;
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

  // Blur % and white %: shared by the card, the buttons and the header buttons.
  const [style, setStyle] = useState(0);
  const [blurPercent, setBlurPercent] = useState(50);
  const [white, setWhite] = useState(0);
  // White and black washes, in either theme; together they make a grey.
  const [black, setBlack] = useState(0);
  const blurAmount = style === 2 ? blurPercent / 100 : undefined;
  // One appearance for the whole lab: the card, the buttons, the header
  // buttons, the panels and the tab bars.
  const [scheme, setScheme] = useState(0);
  const mode = useColorScheme() ?? 'light';
  const appearance: 'light' | 'dark' =
    SCHEMES[scheme] === 'system' ? mode : (SCHEMES[scheme] as 'light' | 'dark');
  const dark = appearance === 'dark';
  const glass = {
    glassStyle: (style === 1 ? 'clear' : 'regular') as LiquidGlassStyle,
    blur: blurAmount,
    white: white / 100,
    black: black / 100,
    colorScheme: appearance,
  };
  const tabBars = useTabBarsLab({ dark, labelStyle: styles.label });

  useLiquidNavigationHeader(navigation, {
    title: 'Glass Lab',
    glass,
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

  const [tint, setTint] = useState(0);
  const [interactive, setInteractive] = useState(true);
  const [radius, setRadius] = useState(28);
  const [blur, setBlur] = useState(8);
  const [refractionHeight, setRefractionHeight] = useState(12);
  const [refractionAmount, setRefractionAmount] = useState(24);
  const [chromatic, setChromatic] = useState(false);
  const [depth, setDepth] = useState(false);
  const [merged, setMerged] = useState(true);
  const [muted, setMuted] = useState(false);
  const [lens, setLens] = useState(0);

  return (
    <View style={styles.background}>
      <Image source={{ uri: BACKGROUND }} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          // Room for the pinned preview above the controls.
          {
            paddingTop: headerHeight + 8 + PREVIEW_HEIGHT + 16,
            paddingBottom: insets.bottom + TAB_BARS_LAB_HEIGHT + 16,
          },
        ]}
      >
        <MorphToolbar />
        <Text style={styles.title}>Glass Lab</Text>
        <Text style={styles.subtitle}>
          {Platform.OS} {String(Platform.Version)} ·{' '}
          {isLiquidGlassSupported ? 'native glass' : 'fallback material'}
        </Text>

        <LiquidGlassView
          colorScheme={appearance}
          cornerRadius={28}
          style={styles.panel}
        >
          <Label>Appearance (everything)</Label>
          <LiquidSegmentedControl
            colorScheme={appearance}
            segments={['System', 'Light', 'Dark']}
            selectedIndex={scheme}
            onChange={setScheme}
          />
          <Label>Style</Label>
          <LiquidSegmentedControl
            colorScheme={appearance}
            segments={['Regular', 'Clear', 'Blur %']}
            selectedIndex={style}
            onChange={setStyle}
          />
          <Label>Blur {Math.round(blurPercent)}%</Label>
          <LiquidSlider
            value={blurPercent}
            minimumValue={0}
            maximumValue={100}
            step={1}
            onValueChange={value => {
              // Moving it is choosing it.
              setBlurPercent(value);
              setStyle(2);
            }}
          />
          <Label>White {Math.round(white)}%</Label>
          <LiquidSlider
            value={white}
            minimumValue={0}
            maximumValue={100}
            step={1}
            onValueChange={setWhite}
          />
          <Label>Black {Math.round(black)}%</Label>
          <LiquidSlider
            value={black}
            minimumValue={0}
            maximumValue={100}
            step={1}
            onValueChange={setBlack}
          />
          <Label>Tint</Label>
          <LiquidSegmentedControl
            colorScheme={appearance}
            segments={['None', 'Blue', 'Pink', 'Green']}
            selectedIndex={tint}
            onChange={setTint}
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

          <Text style={styles.section}>Buttons (same glass)</Text>
          <View style={styles.buttonRow}>
            <LiquidButton title="Glass" {...glass} />
            <LiquidButton title="Prominent" variant="prominent" {...glass} />
            <LiquidIconButton accessibilityLabel="Add" {...glass}>
              <PlusIcon color={themeColors.label} />
            </LiquidIconButton>
          </View>
          <View style={styles.buttonRow}>
            <LiquidButton title="Small" size="small" {...glass} />
            <LiquidButton
              title="Large"
              size="large"
              variant="prominent"
              tintColor="#30D158"
              {...glass}
            />
            <LiquidButton title="Disabled" disabled {...glass} />
          </View>
          <View style={styles.buttonRow}>
            <LiquidButton
              morph
              title={muted ? 'Unmute' : 'Mute'}
              onPress={() => setMuted(value => !value)}
              {...glass}
            />
          </View>

          <Text style={styles.section}>Android only</Text>
          <Label>Lens</Label>
          <LiquidSegmentedControl
            colorScheme={appearance}
            segments={['iOS', 'Classic']}
            selectedIndex={lens}
            onChange={setLens}
          />
          <Label>Blur {blur.toFixed(1)} dp (Regular)</Label>
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

        {/* A plain card, not glass: glass clips its children, which cut the
            tab bars' drop off at their edges, and the bars should see the
            page itself, as they do at the bottom of a real screen. */}
        <View style={[styles.panel, styles.plainPanel]}>
          <Text style={styles.section}>Tab bars</Text>
          {tabBars.controls}
        </View>

        <LiquidGlassView
          colorScheme={appearance}
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

      {/* Pinned at the bottom, outside the ScrollView, like real tab bars. */}
      <View
        pointerEvents="box-none"
        style={[styles.pinnedBars, { bottom: insets.bottom }]}
      >
        {tabBars.bars}
      </View>

      {/* Pinned under the header: every control below changes it in view. */}
      <View
        pointerEvents="box-none"
        style={[styles.pinned, { top: headerHeight + 8 }]}
      >
        <LiquidGlassView
          {...glass}
          tintColor={TINTS[tint]}
          colorScheme={appearance}
          interactive={interactive}
          cornerRadius={radius}
          // Clear and Blur % keep the library's own blur, so Blur % at 0%
          // looks exactly like Clear; this slider tunes Regular.
          blurRadius={style === 0 ? blur : undefined}
          refractionHeight={refractionHeight}
          refractionAmount={refractionAmount}
          chromaticAberration={chromatic}
          androidLens={lens === 0 ? 'ios' : 'classic'}
          depthEffect={depth}
          style={styles.preview}
        >
          <Text style={styles.previewText}>LiquidGlassView</Text>
        </LiquidGlassView>
      </View>
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
  plainPanel: {
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  pinnedBars: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  pinned: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  preview: {
    height: PREVIEW_HEIGHT,
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
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
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
