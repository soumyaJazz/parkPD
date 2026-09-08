/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ToastHost from './src/components/Toast';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      {/* Outside the navigator, because the navigator asks it which screens to
          mount - the session is what decides that, not a navigation call. */}
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
      {/* Mounted once at the root so showToast() works from any screen and
          survives the screen transitions that trigger it. Outside the provider
          too, so the sign-out notice outlives the screens it replaces. */}
      <ToastHost />
    </SafeAreaProvider>
  );
}

export default App;
