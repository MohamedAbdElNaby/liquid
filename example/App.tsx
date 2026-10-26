import { useColorScheme } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createLiquidHeader } from '@mohamed_abd_elnaby/react-native-liquid';
import { Tabs } from './src/Tabs';
import { DetailsScreen } from './src/screens/DetailsScreen';
import { BarHeaderScreen } from './src/screens/BarHeaderScreen';

export type RootStackParamList = {
  Tabs: undefined;
  Details: { title: string; image: string };
  BarHeader: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const floatingHeader = createLiquidHeader();
const barHeader = createLiquidHeader({ variant: 'bar' });

export default function App() {
  const scheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack.Navigator
          screenOptions={{ header: floatingHeader, headerTransparent: true }}
        >
          <Stack.Screen
            name="Tabs"
            component={Tabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Details"
            component={DetailsScreen}
            options={({ route }) => ({ title: route.params.title })}
          />
          <Stack.Screen
            name="BarHeader"
            component={BarHeaderScreen}
            options={{ title: 'Bar header', header: barHeader }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
