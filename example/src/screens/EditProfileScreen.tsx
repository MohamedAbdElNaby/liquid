import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LiquidGlassView,
  useLiquidColors,
  useLiquidHeaderHeight,
  useLiquidNavigationHeader,
} from '@mohamed_abd_elnaby/react-native-liquid';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

// Telegram's Edit Profile: pushing it from Controls morphs the QR circle into
// X, and the search circle and Edit capsule melt into one blue ✓.
export function EditProfileScreen({ navigation }: Props) {
  const headerHeight = useLiquidHeaderHeight();
  const insets = useSafeAreaInsets();
  const { colors } = useLiquidColors();

  useLiquidNavigationHeader(navigation, {
    backButton: false,
    left: {
      key: 'close',
      accessibilityLabel: 'Cancel',
      icon: <Text style={[styles.glyph, { color: colors.label }]}>✕</Text>,
      onPress: navigation.goBack,
    },
    right: [
      {
        key: 'save',
        accessibilityLabel: 'Save',
        tintColor: '#0A84FF',
        icon: <Text style={[styles.glyph, styles.check]}>✓</Text>,
        onPress: navigation.goBack,
      },
    ],
  });

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + 8, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.photo}>
        <Text style={styles.photoGlyph}>📷</Text>
      </View>
      <Text style={[styles.setPhoto, { color: colors.tint }]}>Set Photo</Text>
      <LiquidGlassView cornerRadius={26} style={styles.group}>
        <TextInput
          defaultValue="Mohamed"
          style={[styles.input, { color: colors.label }]}
        />
        <View style={[styles.separator, { backgroundColor: colors.track }]} />
        <TextInput
          defaultValue="AbdElNaby"
          style={[styles.input, { color: colors.label }]}
        />
      </LiquidGlassView>
      <Text style={[styles.note, { color: colors.secondaryLabel }]}>
        Enter your name and add an optional profile photo.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    alignItems: 'stretch',
  },
  glyph: {
    fontSize: 18,
    fontWeight: '600',
  },
  check: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  photo: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(10, 132, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoGlyph: {
    fontSize: 32,
  },
  setPhoto: {
    alignSelf: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 20,
  },
  group: {
    paddingHorizontal: 16,
  },
  input: {
    fontSize: 17,
    paddingVertical: 14,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  note: {
    fontSize: 13,
    marginTop: 8,
    marginHorizontal: 16,
  },
});
