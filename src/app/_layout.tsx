// app/_layout.tsx
import { Stack } from 'expo-router';
import { ThemeProvider } from '@/Hooks/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="Auth/page" options={{ headerShown: false }} />
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}