// app/_layout.tsx
import { Stack } from 'expo-router';
import { ThemeProvider } from '@/Hooks/ThemeContext';
import {Session} from '@supabase/supabase-js'
export default function RootLayout() {

  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="Auth/page" options={{ headerShown: false }} />
        <Stack.Screen name="(protected)/Dashboard/page" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}