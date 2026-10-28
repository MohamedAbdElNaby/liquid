import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createLiquidBottomTabBar,
  createLiquidHeader,
} from '@mohamed_abd_elnaby/react-native-liquid';
import { HomeScreen } from './screens/HomeScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { ControlsScreen } from './screens/ControlsScreen';
import { ContactsScreen } from './screens/ContactsScreen';
import {
  ContactsIcon,
  ControlsIcon,
  DiscoverIcon,
  HomeIcon,
} from './TabIcons';

export type TabParamList = {
  Contacts: undefined;
  Home: undefined;
  Discover: undefined;
  Controls: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const tabBar = createLiquidBottomTabBar({
  search: { placeholder: 'Search photos' },
});
const header = createLiquidHeader({ variant: 'bar' });

type IconArgs = { color: string; size: number; focused: boolean };

const contactsIcon = (props: IconArgs) => <ContactsIcon {...props} />;
const homeIcon = (props: IconArgs) => <HomeIcon {...props} />;
const discoverIcon = (props: IconArgs) => <DiscoverIcon {...props} />;
const controlsIcon = (props: IconArgs) => <ControlsIcon {...props} />;

export function Tabs() {
  return (
    <Tab.Navigator tabBar={tabBar} screenOptions={{ header }}>
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          headerShown: false,
          tabBarIcon: contactsIcon,
        }}
      />
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarIcon: homeIcon,
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarBadge: 3,
          tabBarIcon: discoverIcon,
        }}
      />
      <Tab.Screen
        name="Controls"
        component={ControlsScreen}
        options={{
          headerShown: false,
          tabBarIcon: controlsIcon,
        }}
      />
    </Tab.Navigator>
  );
}

