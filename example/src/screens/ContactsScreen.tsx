import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  LIQUID_HEADER_HEIGHT,
  LiquidSearchHeader,
  useLiquidColors,
  useLiquidNavigationHeader,
} from '@mohamed_abd_elnaby/react-native-liquid';
import { PlusIcon } from '../HeaderIcons';

const NAMES = [
  'Amelia Hart',
  'Bruno Silva',
  'Chen Wei',
  'Dana Okafor',
  'Elias Berg',
  'Farah Nasser',
  'Gabriel Moreau',
  'Hana Sato',
  'Ivan Petrov',
  'Julia Rossi',
  'Karim Haddad',
  'Lena Fischer',
  'Mateo Garcia',
  'Nora Lindqvist',
  'Omar Aziz',
  'Priya Raman',
];
const AVATAR_COLORS = ['#FF9F0A', '#5E5CE6', '#30D158', '#FF375F', '#64D2FF'];

// Contacts screen: a header row (Sort, title, +) with a
// full-width search field under it. Searching raises the field into the row
// and hides the tab bar.
export function ContactsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { colors } = useLiquidColors();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Sort, the title and + live in the shared floating header, so switching
  // tabs morphs them from Home's Edit, title and circles. They go away while
  // the search field rises into the header.
  useLiquidNavigationHeader(
    navigation,
    searching
      ? {}
      : {
          title: 'Contacts',
          left: { title: 'Sort' },
          right: [
            {
              key: 'add',
              accessibilityLabel: 'Add contact',
              icon: <PlusIcon color={colors.label} />,
            },
          ],
        },
  );

  const contacts = NAMES.filter(name =>
    name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LiquidSearchHeader
        value={query}
        onChangeText={setQuery}
        onExpandedChange={next => {
          setSearching(next);
          navigation.setOptions({
            tabBarStyle: next ? { display: 'none' } : undefined,
          });
        }}
        // The empty header row is the floating header's place, so the field
        // rises exactly into it.
        headerHeight={LIQUID_HEADER_HEIGHT}
        style={styles.header}
      />
      <FlatList
        data={contacts}
        keyExtractor={name => name}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
                },
              ]}
            >
              <Text style={styles.initials}>
                {item
                  .split(' ')
                  .map(part => part[0])
                  .join('')}
              </Text>
            </View>
            <View style={[styles.rowText, { borderColor: colors.track }]}>
              <Text style={[styles.name, { color: colors.label }]}>{item}</Text>
              <Text style={[styles.status, { color: colors.secondaryLabel }]}>
                last seen {index * 7 + 3} minutes ago
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    marginHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initials: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  rowText: {
    flex: 1,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    marginTop: 2,
  },
});
