import { Stack } from 'expo-router';
import { ThemeProvider } from '@/Hooks/ThemeContext';
import { AuthProvider } from '@/Hooks/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider> 
      <ThemeProvider>
        <Stack>
          <Stack.Screen name="Auth/page" options={{ headerShown: false }} />
          <Stack.Screen name="(protected)" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}