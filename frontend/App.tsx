import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from 'styled-components/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_600SemiBold_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import AppNavigator from './src/navigation/AppNavigator';
import { useAppTheme } from './src/hooks/useTheme';
import { bootstrapAuth } from './src/auth/bootstrap';
import { LoadingScreen } from './src/components/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const theme = useAppTheme();
  const [authReady, setAuthReady] = useState(false);

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_600SemiBold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    bootstrapAuth().finally(() => setAuthReady(true));
  }, []);

  const ready = fontsLoaded && authReady;

  const onLayoutRootView = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider theme={theme}>
          <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
            <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
            {ready ? <AppNavigator /> : <LoadingScreen />}
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
