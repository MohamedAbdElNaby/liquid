import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  useLiquidColors,
  useLiquidHeaderHeight,
  useLiquidNavigationHeader,
} from '@mohamed_abd_elnaby/react-native-liquid';
import { CheckIcon, ComposeIcon, PlusIcon } from '../HeaderIcons';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Merge'>;

// The same + and compose circles as Home, merging the other way: pressing +
// slides it into the compose circle, and the new button appears in compose's
// place. A null keeps the + place empty.
export function MergeScreen({ navigation }: Props) {
  const headerHeight = useLiquidHeaderHeight();
  const { colors } = useLiquidColors();
  const [merged, setMerged] = useState(false);

  useLiquidNavigationHeader(navigation, {
    title: 'Merge',
    right: merged
      ? [
          null,
          {
            key: 'done',
            accessibilityLabel: 'Done',
            icon: <CheckIcon color={colors.label} />,
            onPress: () => setMerged(false),
          },
        ]
      : [
          {
            key: 'add',
            accessibilityLabel: 'Add',
            icon: <PlusIcon color={colors.label} />,
            onPress: () => setMerged(true),
          },
          {
            key: 'compose',
            accessibilityLabel: 'Compose',
            icon: <ComposeIcon color={colors.label} />,
          },
        ],
  });

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + 16 },
      ]}
    >
      <Text style={[styles.text, { color: colors.secondaryLabel }]}>
        Press + to merge it into the compose button. The new button takes the
        compose button's place; press it to bring + back.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
});
