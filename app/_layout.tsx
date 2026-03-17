import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';
import 'react-native-reanimated';

import { ThemeProvider as AppThemeProvider, useTheme } from '@/context/ThemeContext';
import { tamaguiConfig } from '../tamagui.config';

// Apply SF Pro Rounded (ui-rounded) as the global font for all text
const globalFont = Platform.select({ ios: 'ui-rounded', android: undefined, default: undefined });
if (globalFont) {
  const textDefaultProps = Text.defaultProps ?? {};
  textDefaultProps.style = [{ fontFamily: globalFont }, ...(Array.isArray(textDefaultProps.style) ? textDefaultProps.style : textDefaultProps.style ? [textDefaultProps.style] : [])];
  Text.defaultProps = textDefaultProps;

  const inputDefaultProps = TextInput.defaultProps ?? {};
  inputDefaultProps.style = [{ fontFamily: globalFont }, ...(Array.isArray(inputDefaultProps.style) ? inputDefaultProps.style : inputDefaultProps.style ? [inputDefaultProps.style] : [])];
  TextInput.defaultProps = inputDefaultProps;
}

export const unstable_settings = {
  initialRouteName: 'index',
};

function RootLayoutContent() {
  const { theme } = useTheme();

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={theme}>
      <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="profile-setup" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} translucent={false} />
      </ThemeProvider>
    </TamaguiProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <SafeAreaProvider>
        <RootLayoutContent />
      </SafeAreaProvider>
    </AppThemeProvider>
  );
}
