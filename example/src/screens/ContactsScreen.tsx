import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import {
  LiquidButton,
  LiquidIconButton,
  LiquidSearchHeader,
  useLiquidColors,
} from '@mohamed_abd_elnaby/react-native-liquid';

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

// Telegram-style Contacts screen: a header row (Sort, title, +) with a
// full-width search field under it. Searching raises the field into the row
// and hides the tab bar.
export function ContactsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { colors } = useLiquidColors();
  const [query, setQuery] = useState('');

  const contacts = NAMES.filter((name) =>
    name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LiquidSearchHeader
        value={query}
        onChangeText={setQuery}
        onExpandedChange={(searching) =>
          navigation.setOptions({
            tabBarStyle: searching ? { display: 'none' } : undefined,
          })
        }
        style={styles.header}
      >
        <LiquidButton title="Sort" size="small" />
        <Text style={[styles.title, { color: colors.label }]}>Contacts</Text>
        <LiquidIconButton accessibilityLabel="Add contact" size={34}>
          <Text style={[styles.plus, { color: colors.label }]}>+</Text>
        </LiquidIconButton>
      </LiquidSearchHeader>
      <FlatList
        data={contacts}
        keyExtractor={(name) => name}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor:
                    AVATAR_COLORS[index % AVATAR_COLORS.length],
                },
              ]}
            >
              <Text style={styles.initials}>
                {item
                  .split(' ')
                  .map((part) => part[0])
                  .join('')}
              </Text>
            </View>
            <View style={[styles.rowText, { borderColor: colors.track }]}>
              <Text style={[styles.name, { color: colors.label }]}>
                {item}
              </Text>
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
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  plus: {
    fontSize: 24,
    fontWeight: '300',
    marginTop: -2,
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
