import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StatusBar, Dimensions } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { supabase } from '@/supabaseClient';
import { ThemeProvider, useTheme } from '@/Hooks/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

function RootLayoutContent() {
  const [session, setSession] = useState<any>(null);
  const [appReady, setAppReady] = useState(false);
  const { theme } = useTheme();

  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    'SpaceMono-Regular': require('../../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    async function prepareApp() {
      try {
        if (fontsLoaded || fontError) {
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setAppReady(true);
      }
    }

    prepareApp();
  }, [fontsLoaded, fontError]);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (!appReady || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.text} />
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      </View>
    );
  }


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} onLayout={onLayoutRootView}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      {!session || session==null? (
        <Redirect href="/Auth/page" />
      ) : (
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: theme.colors.background,
              borderTopColor: theme.colors.border,
              height: height * 0.08,
              paddingBottom: height * 0.01,
            },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.secondary,
            tabBarLabelStyle: {
              fontSize: width * 0.028,
              paddingBottom: 0,
            },
            tabBarIconStyle: {
              marginTop: height * 0.005,
            },
          }}
        >
          <Tabs.Screen
            name="(protected)/Dashboard/page"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(protected)/Goals/page"
            options={{
              title: 'Metas',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="wallet-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="(protected)/Profile/page"
            options={{
              title: 'Perfil',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="Auth/page"
            options={{
              href: null,
            }}
          />
        </Tabs>
      )}
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}