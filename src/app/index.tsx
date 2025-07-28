import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/Hooks/AuthContext';
import { Redirect } from 'expo-router';
import { useTheme } from '@/Hooks/ThemeContext';

const StartPage = () => {
  const { session, loading } = useAuth();
  const { theme } = useTheme();
  
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!session || !session.user) {
    return <Redirect href="/Auth/page" />;
  }

  return <Redirect href="/(protected)/Dashboard/page" />;
};

export default StartPage;