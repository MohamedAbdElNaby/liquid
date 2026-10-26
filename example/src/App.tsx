import { useColorScheme } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { createLiquidHeader } from '@mohamed_abd_elnaby/react-native-liquid';
import { Tabs } from './Tabs';
import { DetailsScreen } from './screens/DetailsScreen';

export type RootStackParamList = {
  Tabs: undefined;
  Details: { title: string; image: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const header = createLiquidHeader();

export default function App() {
  const scheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" />
        <Stack.Navigator
          screenOptions={{
            header,
            headerTransparent: true,
          }}
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
